import dramatiq
from periodiq import cron
from src.utils.scheduler import Scheduler


@dramatiq.actor(periodic=cron("* * * * *"))
def scheduled_tasks_job():
    Scheduler().run()
