import os.path
import typing

from sqlalchemy.exc import NoResultFound
from sqlmodel import SQLModel, Field, Session, select
from sqlmodel.sql.expression import Select, col


class DockerImageFiles(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    image_id: str = Field(nullable=False, foreign_key="dockerimage.id")
    filepath: str  = Field(nullable=False)

    @property
    def get_name(self) -> str:
        return os.path.basename(os.path.realpath(self.filepath))

    @classmethod
    def get_by_image_id(cls, _id: str, session: Session) -> typing.Sequence[typing.Self]:
        return session.exec(typing.cast(Select, select(cls).where(cls.image_id == _id))).all()

    @classmethod
    def get_by_id(cls, _id: str, session: Session) -> typing.Optional[typing.Self]:
        try:
            return session.exec(typing.cast(Select, select(cls).where(cls.id == _id))).one()
        except NoResultFound:
            return None

    @classmethod
    def get_all_by_id(cls, file_ids: typing.List[int], session: Session) -> typing.Sequence[typing.Optional[typing.Self]]:
        try:
            return session.exec(typing.cast(Select, select(cls).where(col(cls.id).in_(file_ids)))).all()
        except NoResultFound:
            return []

    @classmethod
    def exists(cls, _id: str, session: Session) -> bool:
        try:
            session.exec(typing.cast(Select, select(cls).where(cls.id == _id))).one()
            return True
        except NoResultFound:
            return False