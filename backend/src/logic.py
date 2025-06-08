import io
import json
import logging
import os
import shutil
import traceback
import typing
import zipfile
from typing import List, Optional

import dramatiq
from croniter import croniter
import docker.errors
from fastapi import UploadFile
from sqlalchemy import ScalarResult, Select, ColumnElement, Sequence, func
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from starlette.responses import Response, StreamingResponse, FileResponse

from src.enums import ImageStatus, JobStatus, AvailableScriptLanguages
from src.factory import get_session, config
from sqlmodel import select, Session, or_, col
from src.db_models import DockerImage, DockerImageFiles, DockerScripts, DockerScheduled, DockerJobs
from src.factory.database import engine
from src.helpful import securely_create_dir, save_file
from src.schemas import ScriptUpdate, ScheduleUpdate, UpdateImageForm
from src.utils.docker_manager import DockerManager, DockerfileNotFound

"""
----- Images
 [X] Create Image
 [X] Get Images
 [X] Get Image details
 [X] Update image files (ONLY ALLOWED IF IMAGE STATUS IS DORMANT)
 [X] Update Image details (name, description) Combined with above
 [X] Build Image
 [X] Get Image build logs
 [] Delete Image
 [X] Get Image src files.
 [X] Download Image src files

----- Scripts
 [X] Create Scripts
 [X] Get Scripts
 [X] Update Script details (name, description, assigned image, language)
 [X] Update Script source code
 [X] Get Script source code
 [X] Run Script
 
----- Jobs
 [X] Start Job (Same as run script)
 [X] Get job details (script, image, status, start time, end time, created by)
 [X] Get job logs 
 [X] Delete job
 [X] Cancel job
 
----- Scheduled Jobs
 [X] Create a scheduled task
 [X] Get scheduled tasks
 [X] Update Scheduled task (cron, parameters)
 [X] Delete scheduled task ()
 [X] Update script state (enabled, disabled)
"""

# TODO: Add script version history data

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)


class InvalidImageStatus(Exception):
    """Raised when an invalid image status is encountered or an image status prevents the current process from running
    i.e., when status is NOT dormant but the build method was invoked"""


def log_event(level: int, message: str | None, resource_id: str | int | None, error: str | None = None):
    log_object = {"message": message}
    if error is not None:
        log_object["error"] = error
    if resource_id is not None:
        log_object["resource_id"] = resource_id
    logger.log(level, json.dumps(log_object))

# --------------------
# Image Methods
# --------------------

def create_image(name: str, description: str, dockerfile: UploadFile, supporting: List[UploadFile]):
    """
    Using the provided form values including the name, description and relevant files, create the database record
    for the new image and create the corresponding filesystem image directory in which the dockerfile and supporting files
    """
    # Perform basic dockerfile validation.
    if dockerfile.size == 0 or dockerfile is None or len(dockerfile.filename.split(".")) != 1:
        return Response(status_code=422, content="Invalid dockerfile file provided")

    with Session(engine) as session:
        if not DockerImage.is_unique_name(name=name, session=session):
            return Response(status_code=409, content="Image name already exists")

    dir_path = securely_create_dir(config.IMAGE_DIR)
    image_id = os.path.basename(dir_path)

    # Create image src directory
    image_src_dir = os.path.join(dir_path, "src")

    # Only succeeds if directory doesn't already exist
    os.makedirs(image_src_dir, exist_ok=False)

    final_paths = []

    # Save periodic.Dockerfile
    dockerfile_path = os.path.join(image_src_dir, dockerfile.filename)
    save_file(dockerfile_path, dockerfile)
    final_paths.append(dockerfile_path)

    # Save Supporting Files.
    for s_file in supporting:
        s_file_path = os.path.join(image_src_dir, s_file.filename)
        save_file(s_file_path, s_file)
        final_paths.append(s_file_path)

    with Session(engine) as session:
        try:
            di_record = DockerImage(id=image_id, image_id=None, name=name, description=description, tag="")
            session.add(di_record)
            session.commit()

            for l in final_paths:
                session.add(DockerImageFiles(image_id=image_id, filepath=os.path.basename(l)))

            session.commit()
            return {"image_id": image_id}
        except Exception as e:
            logger.error("Failed to create Docker image", exc_info=e)
            session.rollback()
            if os.path.exists(dir_path):
                shutil.rmtree(dir_path)
            return Response(status_code=500, content="Failed to create image")


def get_images(page: int = 0, limit: int = 100, _id: Optional[str] = None, name: Optional[str] = None,
               status: Optional[int] = None) -> dict:
    """
    Returns a list of Docker images based on the provided parameters

    :param page:
    :param limit:
    :param _id:
    :param name:
    :param status:
    :return:
    """
    statement = select(DockerImage)
    filters = []
    if _id is not None:
        filters.append(DockerImage.id == _id)
    if name is not None:
        filters.append(DockerImage.name == name)
    if status is not None:
        filters.append(DockerImage.status == status)

    if len(filters) > 0:
        statement = statement.where(*filters)

    with Session(engine) as session:
        total_query = select(func.count(DockerImage.id))
        total = session.exec(total_query if len(filters) == 0 else total_query.where(*filters)).one()
        res = session.exec(statement.offset(page * limit).limit(limit)).all()
        return {
            "images": [{
                "id": i.id,
                "name": i.name,
                "description": i.description,
                "status": i.status_enum
            } for i in res],
            "page": page,
            "limit": limit,
            "total": total if total else 0,
        }

def get_image_dockerfile(image_id: str) -> Response | StreamingResponse:
    with Session(engine) as session:
        image = DockerImage.get_by_id(image_id, session=session)
        if image is None:
            return Response(status_code=404, content="Image not found")
        image_dir = os.path.join(config.IMAGE_DIR, image_id)
        image_path = os.path.join(image_dir, "src", "Dockerfile")

        if not os.path.exists(image_dir) or not os.path.exists(image_path):
            logger.info("Couldn't find image: %s", image_id)
            return Response(status_code=404, content="Image not found")

        def generate_code():
            with open(image_path) as f:
                yield f.read().encode("utf-8")

        return StreamingResponse(content=generate_code(), media_type="text")

def get_image_supporting(image_id: str) -> Response:
    with Session(engine) as session:
        image = DockerImage.get_by_id(image_id, session=session)
        if image is None:
            return Response(status_code=404, content="Image not found")
        image_files = DockerImageFiles.get_by_image_id(image_id, session=session)

        image_dir = os.path.join(config.IMAGE_DIR, image_id)
        image_path = os.path.join(image_dir, "src")
        if not os.path.exists(image_dir) or not os.path.exists(image_path):
            logger.info("Couldn't find image: %s", image_id)
            return Response(status_code=404, content="Image not found")
        support = []
        for image_file in image_files:
            if image_file.filepath == "Dockerfile":
                continue
            file_path = os.path.join(image_path, image_file.filepath)
            if not os.path.exists(file_path):
                logger.error("Couldn't find image file: %s for image: %s", (image_file.filepath, image_id))
                return Response(status_code=404, content="Image file not found")
            support.append({
                "file_id": image_file.id,
                "name": image_file.filepath,
                "size": os.path.getsize(file_path)
            })
        return Response(content=json.dumps({"files": support}), media_type="application/json")

def update_image(image_id: str, update_form: UpdateImageForm) -> Response:
    """
    Update the image details.
    :param image_id:
    :param update_form: UpdateImageForm that contains all possible parameters
    :return: Response
    """
    with Session(engine) as session:

        image: DockerImage = session.exec(
            typing.cast("Select", select(DockerImage).where(DockerImage.id == image_id))).one()

        if image is None:
            return Response(status_code=404, content="Image with ID, {}, not found.".format(image_id))

        # If image status is BUILD_SUCCESS allow only changing of name and description
        if image.status == ImageStatus.BUILD_SUCCESS.value:
            update = False
            if update_form.name is not None:
                update = True
                if not DockerImage.is_unique_name(update_form.name, session=session):
                    return Response(status_code=409, content="Image with given name already exists")
                image.name = update_form.name
            if update_form.description is not None:
                update = True
                image.description = update_form.description
            if update:
                session.add(image)
                session.commit()
            logger.info("Updated image: %s. Name/Description field was updated.", image.id)
            return Response(status_code=204)
        # Allow for update/changing of any value including files.
        elif image.status in [ImageStatus.BUILD_FAILED.value, ImageStatus.DORMANT.value]:
            # Update DB Files first
            update = False
            if update_form.name is not None:
                update = True
                if not DockerImage.is_unique_name(update_form.name, session=session):
                    return Response(status_code=409, content="Image with given name already exists")
                image.name = update_form.name
            if update_form.description is not None:
                update = True
                image.description = update_form.description
            if update:
                session.add(image)

            # Construct image src path
            image_src_dir = os.path.join(config.IMAGE_DIR, image.id, "src")


            # Update Dockerfile if required
            if update_form.dockerfile is not None:
                if not os.path.exists(image_src_dir):
                    return Response(status_code=404, content="Image with ID, {}, not found.".format(image_id))
                image_path = os.path.join(image_src_dir, "Dockerfile")
                save_file(image_path, update_form.dockerfile)

            if update_form.removed is not None:
                # Remove files that are to be deleted.
                to_be_removed: Sequence[DockerImageFiles] = session.exec(typing.cast("Select", select(DockerImageFiles).where(
                    DockerImageFiles.image_id == image_id, col(DockerImageFiles.id).in_(update_form.removed)))).all()
                for f in to_be_removed:
                    file_path = os.path.normpath(os.path.join(image_src_dir, f.filepath))
                    if os.path.commonpath([image_src_dir, file_path]) != image_src_dir:
                        logger.error(f"Error whilst attempting to delete file. Invalid filepath found: '{file_path}'")
                        continue
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    session.delete(f)

            if update_form.added is not None:
                # Add files that are new
                for s_file in update_form.added:
                    s_file_path = os.path.join(image_src_dir, s_file.filename)
                    save_file(s_file_path, s_file)
                    session.add(DockerImageFiles(image_id=image.id, filepath=os.path.basename(s_file_path)))

            # Submit changes to db
            session.commit()
            return Response(status_code=204)
        else:
            return Response(status_code=500, content="Image could not be updated.")

def destroy_image(image_id: str):
    """
    Destroy the image means to delete the image from the docker environment, disable all schedules for scripts
    using image if they exist and change its status to dormant in the database. Allows for more in depth editing.

    :param image_id: ID of image to destroy
    """
    with Session(engine) as session:
        # Get image from db
        image = DockerImage.get_by_id(image_id, session)
        if image is None:
            return Response(status_code=404, content="Image not found")
        try:
            # Disable Scheduled Scripts using image.
            DockerScheduled.disable_for_image(image_id, session)
        except Exception as e:
            logger.error("Failed to disabled scheduled tasks for scripts using image with id: '{}'. Error: '{}'".format(image_id, str(e)))
            return Response(status_code=500, content="Something went wrong.")
        image.status = ImageStatus.DORMANT.value
        session.add(image)
        try:
            docker_manager = DockerManager()
            docker_manager.delete_image_from_env(image.image_id)
            session.commit()
            return Response(status_code=204)
        except Exception as e:
            logger.error("Failed to delete image with id: '{}'. Error: '{}'".format(image_id, str(e)))
            session.rollback()
            return Response(status_code=500, content="Something went wrong.")

def build_image_before(image_id: str) -> Response | None:
    """
    Before attempting to build the image (within request context) ensure image exists and its status is Dormant.
    :param image_id:
    :return:
    """
    with Session(engine) as session:
        try:
            image: DockerImage = session.exec(
                typing.cast(Select, select(DockerImage).where(DockerImage.id == image_id))
            ).one()
        except NoResultFound as e:
            raise e
        if image.status != ImageStatus.DORMANT.value:
            raise InvalidImageStatus("Cannot build image. Image has to be DORMANT to be built.")
        return None


@dramatiq.actor
def build_image(image_id: str) -> None:
    try:
        docker_manager = DockerManager()
        docker_manager.build_image(image_id)
        logger.info(f"Successfully built image: {image_id}")
        return None
    except docker.errors.APIError as e:
        logger.error("Image build failed for ID '{}' with error: '{}'".format(image_id, str(e)))
        with Session(engine) as session:
            image = DockerImage.get_by_image_id(image_id, session)
            image.status = ImageStatus.BUILD_FAILED.value
            session.add(image)
            session.commit()
        return None
    except DockerfileNotFound as de:
        logger.error("Dockerfile not found for image with ID '{}'".format(image_id))
        logger.error(str(de))
        with Session(engine) as session:
            # image = DockerImage.get_by_image_id(image_id, session)
            image = DockerImage.get_by_id(image_id, session)
            image.status = ImageStatus.BUILD_FAILED.value
            session.add(image)
            session.commit()
        return None

def get_image_build_logs(image_id: str, last_position: int = 0):
    try:
        # Check it exists in DB
        with Session(engine) as session:
            image = DockerImage.get_by_id(image_id, session)
            if image is None:
                return Response(status_code=404, content="Failed to get build logs. Logs not found.")

            logs_path = os.path.join(config.IMAGE_DIR, image_id, "build.log")

            if not os.path.exists(logs_path):
                return Response(status_code=404, content="Failed to get build logs. Logs not found.")

            with open(logs_path, 'r') as log_file:
                log_file.seek(last_position)
                new_lines = log_file.readlines()
                new_position = log_file.tell()
            return Response(status_code=200, content=json.dumps({"image": image_id, "lines": new_lines, "new_position": new_position, "status": image.status_enum.name.lower()}), media_type="application/json")
    except FileNotFoundError as de:
        return Response(status_code=404, content=str(de))

def delete_image(image_id: str):
    try:
        docker_manager = DockerManager()
        docker_manager.delete_image(image_id)
        log_event(logging.INFO, "Successfully deleted image with ID '{}'".format(image_id), resource_id=image_id)
        return Response(status_code=200)
    except TypeError as e:  # Raised when provided ID is an invalid type. Generally 'NoneType'
        return Response(status_code=422, content=str(e))
    except DockerfileNotFound as e:
        log_event(logging.ERROR, "Failed to delete image with ID '{}'".format(image_id), error=str(e), resource_id=image_id)
        return Response(status_code=404, content=str(e))
    except Exception:
        log_event(logging.ERROR, "Failed to delete image with ID '{}'".format(image_id), error=traceback.format_exc(), resource_id=image_id)
        return Response(status_code=500, content="Cannot delete image")

def get_image_files(image_id: str) -> Response:
    with Session(engine) as session:
        image = DockerImage.get_by_id(image_id, session)
        if image is None:
            return Response(status_code=404)
        files = DockerImageFiles.get_by_image_id(image_id, session)

        def get_size(path):
            return os.path.getsize(path) if os.path.isfile(path) else 0
        return Response(status_code=200, content=json.dumps({"files": [{**file.model_dump(exclude={"filepath"}), "name": os.path.basename(file.filepath) if file.filepath is not None else None, "size": get_size(file.filepath)} for file in files]}), media_type="application/json")

def create_zip_stream(file_paths: typing.List[str]) -> io.BytesIO:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for path in file_paths:
            zip_file.write(path, arcname=os.path.basename(path))
    buffer.seek(0)
    return buffer

def download_image_file(image_id: str, file_id: typing.List[int]) -> Response:
    MAX_SIZE_BYTES = 10 * 1024 * 1024 # 10 MB
    # Ensure file ids exist
    with Session(engine) as session:
        files = DockerImageFiles.get_all_by_id(file_id, session)
        for f in files:
            if f.image_id != image_id:
                return Response(status_code=404, content="File not found for provided image.")
            if not os.path.exists(f.filepath):
                return Response(status_code=404, content="File not found for provided image.")

        if len(files) != len(file_id):
            return Response(status_code=404, content="File not found")

        if len(files) == 1:
            file = files[0]
            if os.path.exists(file.filepath):
                if os.path.getsize(file.filepath) <= MAX_SIZE_BYTES:
                    return FileResponse(file.filepath, filename=os.path.basename(file.filepath), media_type="application/octet-stream")

        zip_stream = create_zip_stream([f.filepath for f in files])
        return StreamingResponse(zip_stream, status_code=200, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename=image_files_{image_id}.zip"})

# --------------------
# Script Methods
# --------------------

def get_scripts(
        page: int = 0,
        limit: int = 100,
        _id: Optional[str] = None,
        name: Optional[str] = None,
        image: Optional[str] = None,
        is_deleted: Optional[bool] = False) -> dict:
    """
    :param is_deleted:
    :param page:
    :param limit:
    :param _id:
    :param name:
    :param image: Filter param for either image ID or image Name

    :return:
    """
    where_statements: typing.List[ColumnElement[bool]] = [col(DockerScripts.deleted).is_not(not is_deleted)]
    query = select(DockerScripts, DockerImage.name, DockerImage.status).join(DockerImage, typing.cast(ColumnElement,
                                                                                  DockerImage.id == DockerScripts.image_id))

    if _id is not None:
        with Session(engine) as session:
            result: Optional[tuple[DockerScripts, str, int]] = session.exec(query.where(
                typing.cast(ColumnElement[bool], or_(DockerScripts.id == _id)))).first()
            if result is None:
                return {"script": None}
            script, image_name, image_status = result
            return {"script": {**script.model_dump(mode="json"), "image_name": image_name, "image_status": image_status}}

    if image is not None:
        where_statements.append(
            or_(typing.cast(ColumnElement, DockerImage.id == DockerScripts.image_id), col(DockerImage.name).ilike(f"%{image}%"))
        )

    if name is not None:
        where_statements.append(col(DockerScripts.name).ilike(f"%{name}%"))

    with Session(engine) as session:

        total_query = select(func.count(col(DockerScripts.id)))

        for where_statement in where_statements:
            query = query.where(where_statement)
            total_query = total_query.where(where_statement)

        results = session.exec(query.limit(limit).offset(limit * page)).all()

        total = session.exec(total_query).one()

        return {
            "page": page,
            "limit": limit,
            "total": total,
            "scripts": [{**s.model_dump(exclude=["deleted"]), "image_name": i} for s, i in results]
        }



def create_script(name: str, image_id: str, description: str, language: str, script_code: UploadFile):
    # Ensure language provided is valid
    if language is None:
        return Response(status_code=422, content="Invalid language provided.")

    language = language.lower()

    if not AvailableScriptLanguages.is_valid_language(language):
        return Response(status_code=422, content="Invalid language provided: {}".format(language))

    if script_code is None or script_code.size == 0:
        return Response(status_code=422, content="Invalid script file provided")

    with Session(engine) as session:
        if not DockerScripts.is_unique_name(name, session):
            return Response(status_code=409, content="Script already exists with this name!")

    try:
        dir_path = securely_create_dir(config.SCRIPT_DIR)
        script_id = os.path.basename(dir_path)

        # Create script src directory
        script_src_dir = os.path.join(dir_path, "src")

        # Only succeeds if directory doesn't already exist
        os.makedirs(script_src_dir, exist_ok=False)

        # Create log directory
        os.makedirs(os.path.join(dir_path, "logs"), exist_ok=False)

        # Rename filename to app
        script_path = os.path.join(script_src_dir, "script")

        try:
            # Save file to src directory
            save_file(script_path, script_code)

            # Add script details to the database
            with Session(engine) as session:
                script = DockerScripts(id=script_id, name=name, description=description, image_id=image_id, language=language)
                session.add(script)
                session.commit()
                session.refresh(script)

                # TODO: Add Script Version history here.
                return Response(status_code=200, content=json.dumps(script.model_dump(mode="json")))
        except Exception as de:
            log_event(logging.ERROR, "Failed to create script with ID '{}'".format(script_id), resource_id=script_id, error=str(de))
            if os.path.exists(dir_path):
                shutil.rmtree(dir_path)
            return Response(status_code=500, content=str("Could not create script"))
    except Exception as de:
        log_event(logging.ERROR, "Failed to create script", resource_id=name, error=str(de))
        return Response(status_code=500, content=str("Could not create script"))

def delete_script(script_id: str):
    """
    Soft delete a script by ID.
    :param script_id: str
    :return:
    """
    try:
        with Session(engine) as session:
            if not DockerScripts.exists(script_id, session=session):
                return Response(status_code=404, content="Script not found")
            else:
                DockerScripts.mark_as_deleted(_id=script_id, session=session)
                session.commit()
                return Response(status_code=204)
    except Exception as e:
        log_event(logging.ERROR, "Failed to delete script", resource_id=script_id, error=str(e))
        return Response(status_code=500, content="Failed to delete script")

def before_run_script(script_id: str, session: Session) -> DockerJobs:
    """
    Create job record in the database to provide the job id to user.
    :param script_id: Script ID to be executed.
    :param session: Database session instance.
    :return: Job ID int.
    """
    # Create JOB Object
    job_object = DockerJobs(script_id=script_id, status=JobStatus.RUNNING.value)
    session.add(job_object)
    session.commit()
    session.refresh(job_object)
    return job_object

def run_script(script_id: str) -> Response:
    """Run a script by its ID"""
    try:
        log_event(logging.INFO, "Running script", resource_id=script_id)
        with Session(engine) as session:
            script_object = DockerScripts.get_by_id(script_id, session=session)
            if script_object is None:
                return Response(status_code=404, content="Script not found")
            image_object = DockerImage.get_by_id(script_object.image_id, session=session)
            if image_object is None or image_object.status != ImageStatus.BUILD_SUCCESS.value:
                return Response(status_code=404, content="Image not found or not built yet.", media_type="text/plain")
            job = before_run_script(script_id=script_id, session=session)
            run_script_process.send(job_id=job.id, script_id=script_object.id, image_id=image_object.image_id)
            return Response(status_code=200, content=json.dumps({"job_id": job.id}))
    except SQLAlchemyError:
        log_event(logging.ERROR, "Failed to run script", resource_id=script_id, error=traceback.format_exc())
        return Response(status_code=500, content="Failed to run script")


# ----- script info methods -----

def update_script_info(script_id: str, item_update: ScriptUpdate):
    with Session(engine) as session:
        script_object = DockerScripts.get_by_id(script_id, session=session)
        if script_object is None:
            return Response(status_code=404, content="Script not found")

        # Find any scheduled jobs
        schedules = DockerScheduled.get_by_script_id(script_id, session=session)

        # Ensure there are no corresponding schedules.
        if len(schedules) != 0:
            return Response(status_code=409, content="Cannot update script whilst it has scheduled jobs. Please remove them first.")

        if item_update.name is not None:
            item_update.name = item_update.name.strip()
            duplicates = DockerScripts.get_by_name(name=item_update.name, session=session)
            for duplicate in duplicates:
                if duplicate.id != script_id:
                    return Response(status_code=409, content="Script cannot have a name that already exists.")

        # If data has image_id, ensure it exists.
        if item_update.image_id is not None and not DockerImage.exists(item_update.image_id, session=session):
            return Response(status_code=404, content="Image not found with ID '{}'".format(item_update.image_id))

        if item_update.language is not None and not AvailableScriptLanguages.is_valid_language(item_update.language):
            return Response(status_code=422, content="Invalid language '{}'".format(item_update.language))

        update_data = item_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(script_object, key, value)
        session.add(script_object)
        session.commit()
        session.refresh(script_object)

        #  TODO: Add script version history record update here for modified.
        return Response(status_code=200, content=json.dumps(script_object.model_dump(mode="json")), media_type="application/json")

# ----- script code methods -----

def get_script_code(script_id) -> Response | StreamingResponse:
    with Session(engine) as session:
        script_object = DockerScripts.get_by_id(script_id, session=session)
        if script_object is None:
            return Response(status_code=404, content="Script not found")
        script_path = os.path.join(config.SCRIPT_DIR, script_object.id, "src/script")

        if not os.path.exists(script_path):
            return Response(status_code=404, content="Script not found")

        def generate_code():
            with open(script_path) as f:
                yield f.read().encode("utf-8")

        return StreamingResponse(content=generate_code(), media_type="text")

def update_script_code(script_id: str, script_code: UploadFile):
    with Session(engine) as session:
        if not DockerScripts.exists(script_id, session=session):
            return Response(status_code=404, content="Script not found")
        if script_code is None or script_code.size == 0:
            return Response(status_code=422, content="Invalid script file provided")
        overwrite_path = os.path.join(config.SCRIPT_DIR, script_id, "src/script")
        if not os.path.exists(overwrite_path):
            return Response(status_code=404, content="Script file not found")
        try:
            save_file(overwrite_path, script_code)
        except Exception:
            log_event(logging.ERROR, "Failed to update script code", resource_id=script_id, error=traceback.format_exc())
            return Response(status_code=500, content="Failed to update script code")
        return Response(status_code=204)


# --------------------
# Schedule Methods
# --------------------

def get_schedule(
        page: int = 0,
        limit: int = 100,
        _id: Optional[str] = None,
        script_id: Optional[str] = None) -> Response | dict:
    where_statements = []
    query = select(DockerScheduled)

    if _id is not None:
        with Session(engine) as session:
            result: Optional[DockerScheduled] = session.exec(
                typing.cast(Select, query.where(DockerScheduled.id == _id))).first()
            return Response(status_code=200,
                            content={"schedule": {**result.model_dump()}} if result is not None else {"schedule": None})

    if script_id is not None:
        where_statements.append(DockerScheduled.script_id == script_id)

    with Session(engine) as session:
        total_query = select(func.count(col(DockerScheduled.id)))

        for where_statement in where_statements:
            query = query.where(where_statement)
            total_query = total_query.where(where_statement)

        results = session.exec(query.limit(limit).offset(limit * (page))).all()

        return {
            "page": page,
            "limit": limit,
            "total": session.exec(total_query).one() if total_query is not None else len(results),
            "schedules": [i.model_dump() for i in results]
        }


def create_schedule(
        script_id: Optional[str] = None,
        cron_string: Optional[str] = None,
        state: Optional[bool] = False) -> Response | dict:


    if not croniter.is_valid(cron_string):
        return Response(status_code=422, content="Cron string is invalid.")

    with Session(engine) as session:

        script_object = DockerScripts.get_by_id(script_id, session=session)

        if script_object is None:
            return Response(status_code=404, content="Script does not exist.")

        # Verify script's assigned image exists, if it doesn't, enforce state as False
        if not DockerImage.exists(script_object.image_id, session=session):
            state = False

        # Ensure schedule with same cron an script id does not already exist
        if DockerScheduled.exists(script_id=script_id, cron_string=cron_string, session=session):
            return Response(status_code=409, content="Script already has the requested schedule.")

        schedule = DockerScheduled(script_id=script_id, enabled=state, cron=cron_string)
        session.add(schedule)
        session.commit()
        session.refresh(schedule)

    return Response(status_code=200, content=json.dumps({"schedule": schedule.model_dump()}), media_type="application/json")


def update_schedule(
        schedule_id: int = None,
        schedule_update: ScheduleUpdate = None
        ) -> Response:

    with Session(engine) as session:
        if not DockerScheduled.get_by_id(schedule_id, session):
            log_event(logging.INFO, "Schedule to update not found in database.", schedule_id)
            return Response(status_code=204)

        schedule: Optional[DockerScheduled] = DockerScheduled.get_by_id(schedule_id, session)

        if schedule is None:
            return Response(status_code=404, content="Schedule does not exist.")

        # Validate cron
        if schedule_update.cron is not None and not croniter.is_valid(schedule_update.cron):
            return Response(status_code=422, content="Cron string is invalid.")

        update_dict = schedule_update.model_dump(exclude_unset=True)


        script = DockerScripts.get_by_id(schedule.script_id, session=session)

        if script is None:
            return Response(status_code=404, content="Script does not exist.")

        image = DockerImage.get_by_id(script.image_id, session=session)

        if schedule_update.enabled and (image is None or image.status != ImageStatus.BUILD_SUCCESS):
            return Response(status_code=409, content="Unable to enable schedule with missing/unbuilt image.")

        for key, value in update_dict.items():
            if hasattr(schedule, key):
                setattr(schedule, key, value)

        session.add(schedule)
        session.commit()
        session.refresh(schedule)

        return Response(status_code=204)

def delete_schedule(schedule_id: int = None) -> Response:
    """
    Delete a schedule configuration.

    :param schedule_id: ID of schedule configuration.
    :return:
    """
    try:
        with Session(engine) as session:
            schedule = DockerScheduled.get_by_id(schedule_id, session)
            if schedule is None:
                logger.info("Attempting to delete schedule '{}'. Schedule not found in database.".format(schedule_id))
                return Response(status_code=200)
            session.delete(schedule)
            session.commit()
            logger.info("Successfully deleted schedule with ID:  '{}'.".format(schedule_id))
            return Response(status_code=200, content="Successfully deleted schedule")
    except TypeError as e:
        return Response(status_code=404, content=str(e))
    except Exception:
        logger.error(json.dumps({"message": "Failed to delete schedule with ID:  '{}'.".format(schedule_id),
                                 "error": str(traceback.format_exc())}))
        return Response(status_code=500, content="Cannot delete schedule.")


# --------------------
# Job Methods
# --------------------

def get_script_jobs(script_id: str, page: int = 0, limit: int = 100, status: Optional[int] = None) -> Response:
    """Fetch all jobs related to a given script. Enforce pagination rules.
    :param script_id: ID of the script to query for.
    :param page: Page number.
    :param limit: Limit the number of jobs.
    :param status: Filter jobs by this status.
    :return: Response
    """
    with Session(engine) as session:
        jobs = DockerJobs.get_by_script_id(script_id, page, limit, status, session)
        total_query = select(func.count(col(DockerJobs.id))).where(DockerJobs.script_id == script_id)
        total = session.exec(typing.cast("Select", total_query)).one()
    return Response(status_code=200, content=json.dumps({
        "history": [job.model_dump(exclude={"logs"}) for job in jobs],
        "page": page,
        "limit": limit,
        "total": total
    }), media_type="application/json")

def get_job_logs(job_id: int, last_position: int = 0) -> Response:
    """
    Fetch all logs related to a given job. Use last position to avoid re-reading the whole file while streaming.
    :param job_id:
    :param last_position:
    :return:
    """
    log_event(logging.INFO, message="Fetching job logs for job: '{}' from position: '{}'".format(job_id, last_position), resource_id=job_id)
    with (Session(engine) as session):
        job_object = DockerJobs.get_by_id(job_id, session=session)
        if job_object is None:
            log_event(logging.WARNING,
                      message="Job with ID: '{}' doesn't exist".format(job_id),
                      resource_id=job_id)
            return Response(status_code=404, content="Job doesn't exist.")
        log_file = job_object.logs

        if log_file is None:
            return Response(status_code=404, content="No logs found.")
        log_file = os.path.join(config.SCRIPT_DIR, job_object.script_id, "logs", log_file)
        log_event(logging.INFO,
                  message="Fetching job logs for job: '{}' at: '{}'".format(job_id, log_file),
                  resource_id=job_id)

        if os.path.exists(log_file):
            with open(log_file, 'r') as log_file:
                log_file.seek(last_position)
                new_lines = log_file.readlines()
                new_position = log_file.tell()
            return Response(status_code=200, content=json.dumps({"job": job_object.model_dump(), "lines": new_lines, "new_position": new_position, "job_status": job_object.status}), media_type="application/json")
        return Response(status_code=404, content="Log file '{}' does not exist.".format(log_file))

def delete_job(job_id: int) -> Response:
    """
    Given a job ID, delete the job from the database, and remove the log file from the filesystem.
    :param job_id:
    :return:
    """
    with Session(engine) as session:
        job_object = DockerJobs.get_by_id(job_id, session=session)
        if job_object is None:
            return Response(status_code=404, content="Job doesn't exist.")
        if job_object.status not in [i.value for i in JobStatus.get_deletable()]:
            return Response(status_code=422, content="Cannot delete job with ID: '{}' in current state.".format(job_id))
        if job_object.logs is not None and os.path.exists(job_object.logs):
            log_event(logging.INFO, message="Deleting job logs for job: '{}' at path: '{}'".format(job_id, job_object.logs), resource_id=job_id)
            os.remove(job_object.logs)
        else:
            log_event(logging.WARNING, message="Job log file '{}' does not exist.".format(job_object.logs), resource_id=job_id)
        log_event(logging.INFO, message="Deleting job with ID: '{}'.".format(job_object.id), resource_id=job_id)
        session.delete(job_object)
        session.commit()
        return Response(status_code=204)

def cancel_job(job_id: int) -> Response:
    with Session(engine) as session:
        job_object = DockerJobs.get_by_id(job_id, session=session)
        if job_object.status != JobStatus.RUNNING.value:
            return Response(status_code=409, content="Job is not running.")
        if job_object is None:
            return Response(status_code=404, content="Job doesn't exist.")
        container_id = job_object.container_id
        if container_id is None:
            log_event(logging.WARNING, message="Job doesn't have container_id attached.", resource_id=job_id)
            job_object.status = JobStatus.KILLED.value
            session.add(job_object)
            session.commit()
            return Response(status_code=204)
        try:
            DockerManager().kill_container(container_id=container_id)
            return Response(status_code=200)
        except Exception:
            log_event(logging.ERROR, message=traceback.format_exc(), resource_id=job_id)
            return Response(status_code=500, content="Cannot cancel job with ID: '{}'.".format(job_id))

# Background tasks
@dramatiq.actor
def run_script_process(job_id: int, script_id: str, image_id: str, schedule_id: Optional[int] = None):
    """
    :param schedule_id:
    :param job_id: Job ID.
    :param script_id: Script's ID.
    :param image_id: ID of image in docker environment.
    """
    DockerManager().run_container(job_id=job_id, script_id=script_id, image_id=image_id, schedule_id=schedule_id)