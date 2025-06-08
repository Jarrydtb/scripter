import typing
from datetime import datetime
import pytz
from sqlalchemy import Select, func
from sqlalchemy.exc import NoResultFound
from sqlmodel import SQLModel, Field, Session, select, col


class DockerScripts(SQLModel, table=True):
    id: str | None = Field(default=None, primary_key=True)
    name: str | None = Field(default=None, nullable=False)
    description: str | None = Field(default=None, nullable=True)
    created_at: int | None = Field(default_factory=lambda: int(datetime.now(tz=pytz.utc).timestamp()), nullable=False)
    image_id: str | None = Field(default=None, nullable=True, foreign_key="dockerimage.id")
    language: str | None = Field(default=None, nullable=False)
    deleted: bool | None = Field(default=False, nullable=False)

    @classmethod
    def exists(cls, _id: str | None, session: Session) -> bool:
        try:
            session.exec(typing.cast(Select, select(cls).where(cls.id == _id).where(col(cls.deleted).is_(False)))).one()
            return True
        except NoResultFound:
            return False

    @classmethod
    def get_by_id(cls, _id: str | None, session: Session) -> typing.Optional[typing.Self]:
        try:
            return session.exec(typing.cast(Select, select(cls).where(cls.id == _id).where(col(cls.deleted).is_(False)))).one()
        except NoResultFound:
            return None

    @classmethod
    def get_by_name(cls, name: str | None, session: Session) -> typing.Sequence[typing.Self]:
        normalised_name = name.strip().lower()
        return session.exec(typing.cast(Select, select(cls).where(func.lower(func.trim(cls.name)) == normalised_name).where(col(cls.deleted).is_(False)))).all()

    @classmethod
    def get_by_image_id(cls, _id: str | None, session: Session) -> typing.Sequence[typing.Self]:
        return session.exec(typing.cast(Select, select(cls).where(cls.image_id == _id))).all()

    @classmethod
    def mark_as_deleted(cls, _id: str | None, session: Session) -> None:
        try:
            _self = session.exec(typing.cast(Select, select(cls).where(cls.id == _id))).one()
            _self.deleted = True
            session.add(_self)
            return None
        except NoResultFound:
            return None

    @classmethod
    def is_unique_name(cls, name: str, session: Session) -> bool:
        try:
            normalised_name = name.strip().lower()
            session.exec(typing.cast(Select, select(cls).where(func.lower(func.trim(cls.name)) == normalised_name).where(col(cls.deleted).is_(False)))).one()
            return False
        except NoResultFound:
            return True