from typing import Annotated
from fastapi import Depends
from sqlmodel import create_engine, Session, SQLModel
from src.factory.conf import config
from src.db_models import *
import os

def get_database_url() -> str:
    return config.DATABASE_CONN_URL


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


engine = create_engine(get_database_url(), echo=config.all.get("SQLALCHEMY_ECHO", True))


SessionDep = Annotated[Session, Depends(get_session)]
