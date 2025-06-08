import typing
from datetime import datetime
from typing import Self, Optional, Sequence, cast
import pytz
from sqlalchemy import func
from sqlalchemy.exc import NoResultFound
from sqlmodel import SQLModel, Field, Session, select, col
from sqlmodel.sql._expression_select_cls import Select

from src.enums import ImageStatus


class DockerImage(SQLModel, table=True):
    id: str = Field(primary_key=True, nullable=False) # Image ID in DB
    image_id: str | None = Field(default=None) # The Image ID according to Docker client (Only applies to build images)1
    name: str = Field(default=None, nullable=False) # User-friendly name (shown in UI)
    description: str = Field(default=None, nullable=True) # Description of image, used by users
    tag: str | None = Field(default=None) # Image ID tag
    status: int = Field(default=0, nullable=False) # Flag for if the image is built in the docker engine.
    created_at: int = Field(default_factory=lambda: int(datetime.now(pytz.utc).timestamp()), nullable=False)

    @property
    def status_enum(self):
        return ImageStatus(self.status)

    @status_enum.setter
    def status_enum(self, value):
        self.status = value.value

    @classmethod
    def get_by_id(cls, _id: str, session: Session) -> Optional[Self]:
        """Get DockerImage instance given the image ID in the database."""
        return session.exec(cast(Select, select(cls).where(cls.id == _id))).first()

    @classmethod
    def exists(cls, _id: str, session: Session) -> bool:
        return cls.get_by_id(_id, session=session) is not None

    @classmethod
    def get_by_image_id(cls, image_id: str, session: Session) -> Sequence[Self]:
        """Get DockerImage instance given the image ID provided by the docker environment."""
        return session.exec(cast("Select", select(cls).where(cls.image_id == image_id))).all()

    @classmethod
    def is_unique_name(cls, name: str, session: Session) -> bool:
        try:
            normalised_name = name.strip().lower()
            session.exec(typing.cast(Select, select(cls).where(func.lower(func.trim(cls.name)) == normalised_name))).one()
            return False
        except NoResultFound:
            return True