from datetime import datetime
import pytz
from sqlmodel import SQLModel, Field, Session
from src.enums import ScriptHistoryAction

class DockerScriptHistory(SQLModel, table=True):
    """
    DB Model for Docker Script's edit history, not to be confused with DockerJobs,
    the DB Schema for the job history of a given script
    """
    id: int | None = Field(default=None, primary_key=True)
    script_id: str | None = Field(default=None, nullable=False)
    user_id: str | None = Field(default=None, nullable=True)
    action: int | None = Field(default=ScriptHistoryAction.CREATED.value, nullable=False)
    datetime: int | None = Field(default_factory=lambda: int(datetime.now(tz=pytz.utc).timestamp()), nullable=False)

    @classmethod
    def edited(cls, script_id: str, user_id: str = None, session: Session = None) -> None:
        history_item = cls(
            script_id=script_id,
            user_id=user_id,
            action=ScriptHistoryAction.MODIFIED.value
        )
        session.add(history_item)
        session.flush()
        return None