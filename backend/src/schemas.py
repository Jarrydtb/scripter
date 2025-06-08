# schemas.py
import typing

import fastapi
from fastapi import UploadFile
from pydantic import BaseModel
from typing import Optional

class ScriptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    image_id: Optional[str] = None

    class Config:
        from_attributes = True

class ScheduleCreate(BaseModel):
    script_id: str
    cron: str
    state: bool

    class Config:
        from_attributes = True

class ScheduleUpdate(BaseModel):
    cron: Optional[str] = None
    enabled: Optional[bool] = None

    class Config:
        from_attributes = True


class PostImageForm(BaseModel):
    name: str
    description: str

    class Config:
        from_attributes = True

class UpdateImageForm(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    dockerfile: Optional[UploadFile] = None
    removed: Optional[list[int]] = None
    added: Optional[typing.List[UploadFile]] = None

    class Config:
        from_attributes = True

class LanguageSchema(BaseModel):
    name: str
    extension: str
    command: str