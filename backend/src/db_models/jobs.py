import typing
from datetime import datetime

import docker.errors
import pytz
from docker import DockerClient
from sqlmodel import SQLModel, Field, Session, select
from sqlmodel.sql.expression import Select, col, desc
from typing import Self, Optional
from src.enums import JobStatus


class DockerJobs(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: int | None = Field(default_factory=lambda: int(datetime.now(tz=pytz.utc).timestamp()), nullable=False)
    finished_at: int | None = Field(default=None)
    script_id: str | None = Field(default=None, nullable=False)
    logs: str | None = Field(default=None)
    status: int | None = Field(default=None, nullable=False)
    container_id: str | None = Field(default=None, nullable=True)
    message_id: str | None = Field(default=None, nullable=True)

    @classmethod
    def get_by_id(cls, _id: int, session: Session) -> Optional[Self]:
        return session.exec(typing.cast("Select", select(cls).where(cls.id == _id))).first()

    @classmethod
    def get_by_container_id(cls, container_id: str, session: Session) -> typing.Sequence[Self]:
        return session.exec(typing.cast("Select", select(cls).where(cls.container_id == container_id))).all()

    @classmethod
    def get_by_script_id(cls, script_id: str, page: int, limit: int, status: Optional[int], session: Session) -> typing.Sequence[Self]:
        where = [cls.script_id == script_id]
        if status:
            where.append(cls.status == status)
        return session.exec(typing.cast("Select", select(cls).where(*where).order_by(col(cls.id).desc())).limit(limit).offset(limit * page)).all()

    def set_killed(self):
        self.status = JobStatus.KILLED.value

    @classmethod
    def get_running_jobs(cls, script_id: str | None, session: Session) -> typing.Sequence[Self]:
        # Ensure query includes only running jobs
        query = [cls.status == JobStatus.RUNNING.value]
        # IF script is specified, include in query
        if script_id:
            query.append(cls.script_id == script_id)
        # Execute query and return results
        return session.exec(typing.cast("Select", select(cls).where(*query))).all()

    def kill_script(self, session: Session, docker_client: DockerClient) -> None:
        if session is None:
            raise Exception("session is required")
        if docker_client is None:
            raise Exception("docker_client is required")

        try:
            container = docker_client.containers.get(self.container_id)
            container.kill()
        except docker.errors.NotFound:
            pass
        except docker.errors.APIError as e:
            raise RuntimeError(f"Failed to kill container {self.container_id}: {str(e)}")

        # Update status
        self.status = JobStatus.KILLED.value
        session.add(self)
        session.flush()

    @classmethod
    def kill_and_update_status(cls, job_id: int, session: Session, docker_client: DockerClient, raise_exc: bool = False) -> Optional[Self]:

        # Handle NoneType values for job ID session docker client.
        if job_id is None:
            raise Exception("job_id is required")
        if session is None:
            raise Exception("session is required")
        if docker_client is None:
            raise Exception("docker_client is required")

        result = session.exec(typing.cast("Select", select(cls).where(cls.id == job_id))).first()
        if result is None and raise_exc:
            raise Exception(f"job_id {job_id} not found")
        elif result.container_id is None:
            raise ValueError(f"Job {job_id} has no associated container ID")
        elif result is None and not raise_exc:
            return None

        try:
            container = docker_client.containers.get(result.container_id)
            container.kill()
        except docker.errors.NotFound:
            pass
        except docker.errors.APIError as e:
            raise RuntimeError(f"Failed to kill container {result.container_id}: {str(e)}")

        # Update status
        result.status = JobStatus.KILLED.value
        session.add(result)

        return result

