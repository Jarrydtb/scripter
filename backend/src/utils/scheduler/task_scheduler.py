import json
import traceback
import typing
import logging

import pytz
from datetime import datetime

from sqlmodel import Session
from src.db_models import DockerScheduled
from src.factory.database import engine
from croniter import croniter
from .task import Task

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)


def log_event(level: int, message: str | None, resource_id: str | int | None, error: str | None = None):
    log_object = {"message": message}
    if error is not None:
        log_object["error"] = error
    if resource_id is not None:
        log_object["resource_id"] = resource_id
    logger.log(level, json.dumps(log_object))


class InvalidCronString(Exception):
    """Raised if the cron string is invalid"""


class Scheduler:

    def run(self):
        runnable = self.get_runnable_tasks()

        for task in runnable:
            try:
                # Determine the next run's datetime
                next_run = self.next_run(task)
                # Determine if the task should run
                if not self.should_run(next_run):
                    continue
                # Invoke task
                Task(schedule_id=task.id).run()
            except InvalidCronString:
                log_event(logging.ERROR, "Invalid crontab string", resource_id=task.id)
                continue
            except Exception:
                log_event(logging.ERROR, traceback.format_exc(), resource_id=task.id)
                continue

    @staticmethod
    def get_runnable_tasks() -> typing.Sequence[DockerScheduled]:
        with Session(engine) as session:
            return DockerScheduled.get_runnable(session)

    @staticmethod
    def should_run(next_run: datetime) -> bool:
        # Get the current datetime for comparison
        now = datetime.now(tz=pytz.utc)
        return next_run is not None and next_run <= now

    @staticmethod
    def next_run(scheduled: DockerScheduled) -> datetime:
        cron = scheduled.cron
        # Ensure cron is valid
        if not croniter.is_valid(cron):
            raise InvalidCronString()
        # Calculate base timestamp
        base_timestamp = next((v for v in (scheduled.last_run, scheduled.created_at) if v is not None), 0)
        # Calculate datetime object from timestamp
        base = datetime.fromtimestamp(base_timestamp, tz=pytz.UTC)
        # Using croniter, determine the next expected datetime.
        return croniter(cron, base).next(datetime)
