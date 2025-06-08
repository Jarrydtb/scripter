import typing
from datetime import datetime

import pytz
from sqlalchemy import Select
from sqlmodel import SQLModel, Field, Session, select, col
from sqlalchemy.sql._typing import _OnClauseArgument, _ColumnExpressionArgument
from src.db_models import DockerScripts, DockerImage


class DockerScheduled(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    script_id: str = Field(nullable=False, foreign_key="dockerscripts.id")
    created_at: int | None = Field(default_factory=lambda: int(datetime.now(tz=pytz.utc).timestamp()), nullable=False)
    enabled: bool | None = Field(default=False, nullable=False)
    cron: str | None = Field(default=None, nullable=True)
    last_run: int | None = Field(default=None, nullable=True)
    running: bool | None = Field(default=False, nullable=False)

    @classmethod
    def disable_for_image(cls, image_id: str, session: Session) -> None:
        schedules: typing.Sequence[typing.Self] = session.exec(typing.cast(Select,
           select(cls)
               .join(DockerScripts, onclause=typing.cast(_OnClauseArgument, DockerScripts.id == cls.script_id))
               .join(DockerImage, onclause=typing.cast(_OnClauseArgument, DockerImage.id == DockerScripts.image_id))
                .where(
                    typing.cast(_ColumnExpressionArgument, DockerScripts.image_id == image_id),
                    typing.cast(_ColumnExpressionArgument, cls.enabled == True)
                )
        )).all()
        for scheduled in schedules:
            scheduled.enabled = False
            session.add(scheduled)
        session.flush()

    @classmethod
    def get_by_id(cls, schedule_id: int, session: Session) -> typing.Optional[typing.Self]:
        return session.exec(typing.cast(Select, select(cls).where(cls.id == schedule_id))).first()

    @classmethod
    def get_by_script_id(cls, _id: str, session: Session) -> typing.Sequence[typing.Self]:
        """Get DockerImage instance given the image ID in the database."""
        return session.exec(typing.cast(Select, select(cls).where(cls.script_id == _id))).all()

    @classmethod
    def get_runnable(cls, session: Session) -> typing.Sequence[typing.Self]:
        return session.exec(typing.cast(Select, select(cls))
                            .where(col(cls.enabled).is_(True))
                            .where(col(cls.cron).is_not(None))
                            .where(col(cls.running).is_(False))
                            ).all()
    @classmethod
    def exists(cls, script_id: str, cron_string: str, session: Session) -> bool:
        """Check if a record already exists for a script with a provided cron string."""
        return session.exec(typing.cast(Select, select(cls).where(cls.script_id == script_id).where(cls.cron == cron_string))).first() is not None

    @classmethod
    def set_finished(cls, _id: int, session: Session) -> None:
        obj = cls.get_by_id(_id, session)
        if obj is not None:
            obj.running = False
            session.add(obj)
            session.flush()
            session.refresh(obj)