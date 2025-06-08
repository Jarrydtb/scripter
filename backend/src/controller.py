import json
import typing
from typing import List, Optional, Annotated

from fastapi.params import Query
from sqlalchemy.exc import NoResultFound
from starlette.responses import Response

import src.logic as logic
from fastapi import APIRouter, Form, File, UploadFile

from src.enums import AvailableScriptLanguages
from src.schemas import ScriptUpdate, ScheduleCreate, ScheduleUpdate, UpdateImageForm

router = APIRouter()
# Made change to force no cache

# ---------- Endpoints: General ----------

@router.get("/api/general/languages")
def get_available_languages():
    available = AvailableScriptLanguages.get_values()
    return Response(status_code=200, content=json.dumps({"supported_languages": [i.model_dump(include={"name", "extension"}) for i in available]}), media_type="application/json")

# ---------- Endpoints: Images ----------

@router.get("/api/image")
def get_images(
        page: int = 0,
        limit: int = 100,
        _id: Optional[str] = None,
        name: Optional[str] = None,
        status: Optional[int] = None
):
    return logic.get_images(page, limit, _id, name, status)


@router.get("/api/image/{image_id}")
def get_image(image_id: str):
    image_dict = logic.get_images(page=0, limit=1, _id=image_id)
    if len(image_dict.get('images')) == 1:
        return {"image": image_dict.get('images')[0]}
    else:
        return Response(status_code=404)

@router.get("/api/image/{image_id}/Dockerfile")
def get_image_dockerfile(image_id: str):
    return logic.get_image_dockerfile(image_id)

@router.get("/api/image/{image_id}/supporting")
def get_image_supporting(image_id: str):
    return logic.get_image_supporting(image_id)

@router.post("/api/image")
def create_image(
        name: str = Form(...),
        description: str = Form(...),
        dockerfile: UploadFile = File(...),
        supporting: List[UploadFile] = File(default=[])
):
    return logic.create_image(name, description, dockerfile, supporting)


@router.patch("/api/image/{image_id}")
def update_image(image_id: str, update_form: Annotated[UpdateImageForm, Form()]):
    return logic.update_image(image_id=image_id, update_form=update_form)

@router.delete("/api/image/{image_id}")
def delete_image(image_id: str):
    return logic.delete_image(image_id)

@router.patch("/api/image/{image_id}/destroy")
def destroy_image(image_id: str):
    return logic.destroy_image(image_id)

@router.post("/api/image/{image_id}/build")
def build_image(image_id: str):
    try:
        logic.build_image_before(image_id)
    except NoResultFound:
        return Response(status_code=404)
    except logic.InvalidImageStatus as e:
        return Response(status_code=422, content=str(e))
    logic.build_image.send(image_id)
    return Response(status_code=200, content="Build started for image ID: {}".format(image_id))

@router.get("/api/image/{image_id}/logs")
async def get_image_build_logs(image_id: str):
    return logic.get_image_build_logs(image_id)

@router.get("/api/image/{image_id}/files")
def get_image_files(image_id: str):
    return logic.get_image_files(image_id)

@router.get("/api/image/{image_id}/files/download")
def download_image_files(image_id: str, file_id: typing.Annotated[typing.Optional[typing.List[int]], Query()] = None):
    return logic.download_image_file(image_id, file_id)


# ---------- Endpoints: Scripts ----------


# Get Scripts
@router.get("/api/script")
def get_script(
        page: int = 0,
        limit: int = 100,
        _id: Optional[str] = None,
        name: Optional[str] = None,
        image: Optional[str] = None,
        is_deleted: Optional[bool] = None):
    return logic.get_scripts(page=page, limit=limit, _id=_id, name=name, image=image, is_deleted=is_deleted)

# Create Script
@router.post("/api/script")
def create_script(
        name: str = Form(...),
        image_id: str = Form(...),
        description: str = Form(...),
        language: str = Form(...),
        script: UploadFile = File(...)
):
    return logic.create_script(name=name, image_id=image_id, description=description, language=language, script_code=script)

# Delete Script
@router.delete("/api/script/{script_id}")
def delete_script(script_id: str):
    return logic.delete_script(script_id)

# Update Script Info
@router.patch("/api/script/{script_id}")
def update_script_info(script_id: str, item_update: ScriptUpdate):
    return logic.update_script_info(script_id, item_update)

# Get script code
@router.get("/api/script/{script_id}/code")
async def get_script_code(script_id: str):
    return logic.get_script_code(script_id)

# Update script information
@router.patch("/api/script/{script_id}/code")
def update_script_code(script_id: str, script: UploadFile = File(...)):
    return logic.update_script_code(script_id, script)

# Run Script
@router.post("/api/script/{script_id}")
def run_script(script_id: str):
    return logic.run_script(script_id)


# ---------- Endpoints: Schedules ----------


@router.get("/api/schedule")
def get_schedule(page: int = 0, limit: int = 100, _id: Optional[int] = None, script_id: Optional[str] = None):
    return logic.get_schedule(page, limit, _id, script_id)

@router.post("/api/schedule")
def create_schedule(create_data: ScheduleCreate):
    return logic.create_schedule(script_id=create_data.script_id, cron_string=create_data.cron, state=create_data.state)

@router.delete("/api/schedule/{schedule_id}")
def delete_schedule(schedule_id: int):
    return logic.delete_schedule(schedule_id)

@router.patch("/api/schedule/{schedule_id}")
def update_schedule(schedule_id: int, update_data: ScheduleUpdate):
    return logic.update_schedule(schedule_id, schedule_update=update_data)


# ---------- Endpoints: Jobs ----------


@router.get("/api/jobs/history/{script_id}")
def get_job_history(script_id: str, page: int = 0, limit: int = 100, status: Optional[int] = None) -> Response:
    return logic.get_script_jobs(script_id, page, limit, status)

@router.get("/api/job/{job_id}")
def get_job_logs(job_id, last_position: int = 0) -> Response:
    return logic.get_job_logs(job_id, last_position)

@router.delete("/api/job/{job_id}")
def delete_job(job_id: int):
    return logic.delete_job(job_id)

@router.patch("/api/job/{job_id}/kill")
def kill_job(job_id: int):
    return logic.cancel_job(job_id)