import logging
import os
import re
import shutil
import traceback
import typing
from datetime import datetime
import platform
from typing import Sequence, Optional

import docker
import docker.errors
import pytz
from docker.types import Mount
from sqlalchemy import Select
from sqlmodel import select, Session

from src.db_models import DockerImage, DockerImageFiles, DockerJobs, DockerScripts
from src.db_models import DockerScheduled
from src.enums import ImageStatus, JobStatus, AvailableScriptLanguages
from src.factory import config
from src.factory.database import engine

class DockerfileNotFound(Exception):
    """Raised when the image is not found in the database or the Dockerfile
    or its parent directory is not found on the filesystem"""

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


class DockerManager:

    def __init__(self):
        self.client = docker.from_env()

    def get_containers(self):
        return self.client.containers.list()

    def get_images(self):
        return self.client.images.list()

    def image_exists(self, image_id: str) -> bool:
        image_ids = [i.id for i in self.client.images.list()]
        return any(["sha256:" + image_id in i for i in image_ids])

    def create_image(self, dockerfile_path):
        self.client.images.build(
            path=dockerfile_path,
            forcerm=True,
            rm=True # Default is already True, but just in case
        )

    @staticmethod
    def write_log(log: str, log_file_path: str):
        with open(log_file_path, "w") as f:
            f.write(log + "\n")

    def run_container(self, job_id: int, script_id: str, image_id: str, schedule_id: Optional[int] = None):
        logger.info("Attempting to run script with ID '{}' with image ID: '{}'".format(script_id, image_id))
        with Session(engine) as session:
            try:
                job_object = DockerJobs.get_by_id(job_id, session=session)

                if job_object is None:
                    logger.error("Could not find job with ID '{}'".format(job_id))
                    return

                # Get the script's directory path
                script_dir: str = str(os.path.normpath(os.path.join(config.SCRIPT_DIR, script_id)))

                log_file_path = os.path.join(script_dir, "logs",
                                             "{}__{}.log".format(datetime.now(pytz.utc).strftime("%Y-%m-%dT%H-%M-%S"),
                                                                 job_object.id))

                logger.info("Log file path: {}".format(log_file_path))
                logger.info("Log file path basename: {}".format(os.path.basename(log_file_path)))

                job_object.logs = os.path.basename(log_file_path)
                session.add(job_object)
                session.commit()

                # Verify script exists (again) -> Get script OBJECT
                script = DockerScripts.get_by_id(script_id, session)
                if script is None:
                    self.write_log("Could not find script with ID '{}'".format(script_id), log_file_path)
                    logger.error("Could not find script with ID '{}'".format(script_id))
                    job_object.status = JobStatus.FAILED.value
                    session.add(job_object)
                    session.commit()
                    return

                # Ensure image exists in docker system
                if not self.image_exists(image_id):
                    self.write_log("Failed to run script '{}': Image {} not found".format(script_id, image_id), log_file_path)
                    logger.error("Failed to run script '{}': Image {} not found".format(script_id, image_id))
                    job_object.status = JobStatus.FAILED.value
                    session.add(job_object)
                    session.commit()
                    return

                script_language = AvailableScriptLanguages.get_by_name(script.language)
                if script_language is None:
                    self.write_log("Failed to run script '{}': Command for language {} not found".format(script_id, script.language), log_file_path)
                    logger.error("Failed to run script '{}': Command for language {} not found".format(script_id, script.language))
                    job_object.status = JobStatus.FAILED.value
                    session.add(job_object)
                    session.commit()
                    return

                host_script_dir: str = str(os.path.normpath(os.path.join(config.HOST_DATA_DIR, config.script_dir_name, script_id)))
                script_file = os.path.join(host_script_dir, "src", "script")

                # Generate host_script_dir using os env
                host_os = os.environ.get("HOST_OS")
                host_os = host_os if host_os is not None else "linux"

                if host_os.lower() == "windows":
                    data_dir_part = config.HOST_DATA_DIR.replace("\\", "/").replace("C:", "/c")
                    script_file_part = os.path.join(".", config.script_dir_name, script_id, "src", "script")
                    script_file = os.path.normpath(os.path.join(data_dir_part, script_file_part))
                    logger.warning("script_file: " + script_file)
                else:
                    data_dir_part = config.HOST_DATA_DIR
                    script_file_part = os.path.join(".", config.script_dir_name, script_id, "src", "script")
                    script_file = os.path.normpath(os.path.join(data_dir_part, script_file_part))

                logger.warning("Mounting file: '" + script_file + "' to: "  + "/script.{}".format(script_language.extension))
                container = self.client.containers.run(
                    image=image_id,
                    command=[*script_language.command.split(" "), "/script.{}".format(script_language.extension)],
                    mounts=[Mount(target="/script.{}".format(script_language.extension), source=script_file, type="bind")],
                    detach=True,
                    stdout=True,
                    stderr=True,
                    # tty=True, # DEBUG ONLY
                    # stdin_open=True, # DEBUG ONLY
                )
                job_object.container_id = container.id
                session.add(job_object)
                session.commit()

                try:
                    with open(log_file_path, "a") as f:
                        for line in container.logs(stream=True, follow=True):
                            decoded_line = line.decode('utf-8').strip()
                            print(decoded_line)
                            f.write(decoded_line + "\n")
                            f.flush()  # Ensures data is written immediately
                    job_object.status = JobStatus.SUCCESS.value
                    job_object.finished_at = int(datetime.now(tz=pytz.UTC).timestamp())
                    job_object.container_id = None
                    session.add(job_object)
                    session.commit()
                except Exception as e:
                    logger.error("Failed to fetch script logs '{}': {}".format(script_id, e))
                    return
                if schedule_id is not None:
                    DockerScheduled.set_finished(schedule_id, session)
                    session.commit()
            except Exception as e:
                logger.error("Failed to run script '{}': {}".format(script_id, e))
                job_object = DockerJobs.get_by_id(job_id, session=session)
                job_object.status = JobStatus.FAILED.value
                session.add(job_object)
                session.commit()
            finally:
                if "container" in locals() and container is not None:
                    container.remove(force=True)
                if schedule_id is not None:
                    DockerScheduled.set_finished(schedule_id, session)
                    session.commit()

    def kill_container(self, container_id: str = None) -> None:
        """

        :param container_id:
        :return:
        """
        try:
            # Kill container in docker env
            self.client.containers.get(container_id).kill()
        except docker.errors.NotFound:
            logger.warning("Could not find container with ID '{}' in Docker env. Attempting to update status in DB".format(container_id))
            pass
        except docker.errors.APIError:
            logger.error("Error whilst attempting to get and kill docker container: {}".format(traceback.format_exc()))
            pass
        except Exception:
            logger.error("Failed to get and kill docker container: {}".format(traceback.format_exc()))
            return None
        try:
            # Update jobs using container to killed state
            with Session(engine) as session:
                jobs = DockerJobs.get_by_container_id(container_id, session)
                for job in jobs:
                    job.set_killed()
                    session.add(job)
                session.commit()
                return None
        except Exception:
            logger.error("Error with database whilst attempting to update job status: {}".format(traceback.format_exc()))
            return None

    def build_image(self, _id: str = None):
        if _id is None:
            raise Exception("Invalid Image ID: 'NoneType'")

        # Get Image information from DB
        with Session(engine) as session:
            stmt: Select = select(DockerImage).where(DockerImage.id == _id)
            image: typing.Optional[DockerImage] = session.exec(stmt).first()
            if image is None:
                raise DockerfileNotFound("Could not find Docker image with ID '{}' in DB. Are you sure it exists.".format(_id))

            # Update status
            image.status = ImageStatus.BUILDING.value
            session.add(image)
            session.commit()
            session.refresh(image)

            # Get the corresponding file information
            image_files = DockerImageFiles.get_by_image_id(_id, session=session)

            # Fetch the Dockerfile path from db
            dockerfile_path = [record.filepath for record in image_files if "Dockerfile" == os.path.basename(record.filepath)]
            dockerfile_path = dockerfile_path[0] if len(dockerfile_path) == 1 else None
            # Ensure dockerfile exists.
            if dockerfile_path is None:
                raise DockerfileNotFound("Could not find Dockerfile for image with ID '{}' in DB. Are you sure it exists.".format(_id))

            dockerfile_path = os.path.join(config.IMAGE_DIR, _id, "src", "Dockerfile")
            if not os.path.exists(dockerfile_path):
                raise DockerfileNotFound("Could not find Dockerfile for image with ID '{}' on filesystem".format(_id))
            logger.info("Starting build of image with ID '{}' in DB".format(_id))
            # Build the docker image, using the low level api. https://docker-py.readthedocs.io/en/stable/api.html#module-docker.api.image
            log_generator = self.client.api.build(
                path=os.path.dirname(dockerfile_path),
                dockerfile=dockerfile_path,
                tag=f"{_id}{'-' + image.tag if image.tag else ''}",
                rm=True,
                forcerm=True,
                decode=True,
                pull=True
            )
            # Create a path to a logfile inside the image's directory on the fs.
            log_file = os.path.join(config.IMAGE_DIR, _id, "build.log")
            # Instantiate an image_id value (Should be the final ID given the image by the docker engine)
            image_id = None
            for log in log_generator:
                line = log.get("stream") or log.get("status") or log.get("errorDetail", {}).get("message")
                if line:
                    # Find Docker Image ID from logs (regex taken directly from docker-py library's client.images.build method)
                    match = re.search(r'(^Successfully built |sha256:)([0-9a-f]+)$', line)
                    if match:
                        image_id = match.group(2)
                    self.save_log_to_file(log_file, line)

            image.image_id = image_id

            try:
                self.client.images.get(image_id)
                image.status = ImageStatus.BUILD_SUCCESS.value
            except docker.errors.ImageNotFound:
                image.status = ImageStatus.BUILD_FAILED.value

            session.add(image)
            session.commit()
            session.refresh(image)

    def delete_image(self, _id: str = None):
        """
        Delete a docker image from the database, the file system and the docker environment.
        :param _id:
        :return:
        """


        if _id is None:
            raise TypeError("Invalid Image ID: 'NoneType'")

        # Get Image information from DB
        with Session(engine) as session:
            try:
                # Get image from the database
                image: Optional[DockerImage] = DockerImage.get_by_id(_id, session)

                if image is None:
                    raise DockerfileNotFound(
                        "Could not find Docker image with ID '{}' in DB.".format(_id))

                # Get Image's Docker client ID
                image_id = image.image_id

                try:
                    # Disable Scheduled Scripts using image.
                    DockerScheduled.disable_for_image(_id, session)
                except Exception as e:
                    logger.error("Failed to disabled scheduled tasks for scripts using image with id: '{}'".format(_id))
                    raise e

                jobs = DockerJobs.get_running_jobs(script_id=None, session=session)

                for job in jobs:
                    job.kill_script(session=session, docker_client=self.client)

                # Get all running containers that depend on the Image.
                containers = self.client.containers.list(filters={
                    "ancestor": image_id
                })

                # Kill all running containers and update their statuses in the db if they exist.
                for container in containers:
                    container_id = container.id
                    # Kill container
                    container.kill()
                    # Update job status in DB
                    jobs = DockerJobs.get_by_container_id(container_id, session=session)
                    for job in jobs:
                        job.set_killed()
                        session.add(job)
                    session.flush()

                # Get all scripts that use image id
                scripts = DockerScripts.get_by_image_id(_id, session=session)
                for script in scripts:
                    script.image_id = None
                    session.add(script)
                session.flush()

                # Delete image files from the DB
                image_files = DockerImageFiles.get_by_image_id(_id, session)
                for file in image_files:
                    session.delete(file)
                session.flush()

                # Delete image from the database
                session.delete(image)
                session.flush()

                # Delete Image from Docker env
                if image_id is not None:
                    self.delete_image_from_env(image_id)

                # Delete image from fs
                image_dir = os.path.join(config.IMAGE_DIR, _id)
                if os.path.exists(image_dir):
                    shutil.rmtree(image_dir)
                else:
                    logger.warning("Could not find image directory with ID: '{}'".format(_id))

                session.commit()
            except Exception as e:
                session.rollback()
                raise e

    def delete_image_from_env(self, _id: str = None):
        """
        :param _id: ID of image in Docker Environment to delete.
        """
        try:
            self.client.images.remove(_id)
        except docker.errors.ImageNotFound:
            logger.warning(
                "When attempting to delete, system could not find image with ID: '{}' in docker env. ".format(_id))

    @staticmethod
    def save_log_to_file(log_file: str, line: str):
        with open(log_file, "a") as f:
            f.write(line + "\n")

