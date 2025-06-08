import json
import logging
from datetime import datetime
from typing import Optional

import pytz
from sqlmodel import Session

from src.db_models import DockerJobs, DockerScheduled, DockerScripts, DockerImage
from src.enums import JobStatus
from src.factory.database import engine
from src.logic import run_script_process

class ScriptNotFound(Exception):
    """Raised when a script cannot be found."""

class TaskStartError(Exception):
    """Raised when a script cannot be found."""

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

def log_event(level: logging, message: str, schedule_id: str | int):
    log = {"message": message, "schedule_id": schedule_id}
    logger.log(level, json.dumps(log))

class Task:

    def __init__(self, schedule_id: int):
        self.schedule_id: int = schedule_id
        self.script_id: Optional[str] = None
        self.image_id: Optional[str] = None
        self.setup()

    def create_job(self, session: Session) -> int:
        """
        Create job record in the database to provide the job id to user.
        :param session: Database session instance.
        :return: Job ID int.
        """
        # Create JOB Object
        job_object = DockerJobs(script_id=self.script_id, status=JobStatus.RUNNING.value)
        session.add(job_object)
        session.commit()
        session.refresh(job_object)
        return job_object.id

    def validate(self):
        # Ensure script id is not None
        if self.script_id is None:
            raise TaskStartError("Script ID is required, but None was provided")
        # Ensure image id is not None
        if self.image_id is None:
            raise TaskStartError("Image ID is required, but None was provided")

    def setup(self):
        with Session(engine) as session:
            # Get Script details
            scheduled = DockerScheduled.get_by_id(self.schedule_id, session)
            script = DockerScripts.get_by_id(scheduled.script_id, session)
            self.script_id = script.id
            image = DockerImage.get_by_id(script.image_id, session)
            self.image_id = image.image_id

    def disable_scheduled_task(self, session: Session):
        log_event(logging.WARNING, "Disabling scheduled task due to task failure", self.schedule_id)
        scheduled: DockerScheduled = DockerScheduled.get_by_id(self.schedule_id, session)
        scheduled.running = False
        scheduled.enabled = False
        session.add(scheduled)
        session.flush()
        session.refresh(scheduled)


    def set_running(self, session: Session):
        scheduled: DockerScheduled = DockerScheduled.get_by_id(self.schedule_id, session)
        scheduled.running = True
        scheduled.last_run = int(datetime.now(tz=pytz.UTC).timestamp())
        session.add(scheduled)
        session.flush()
        session.refresh(scheduled)


    def run(self):
        log_event(logging.INFO, "Starting scheduled task", self.schedule_id)
        self.validate()
        with Session(engine) as session:
            try:
                job_id = self.create_job(session)
                run_script_process.send(job_id=job_id, script_id=self.script_id, image_id=self.image_id, schedule_id=self.schedule_id)
                self.set_running(session)
                session.commit()
            except Exception as e:
                raise e
