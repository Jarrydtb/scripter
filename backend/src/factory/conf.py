import logging
import os
import tomllib

import pydantic

from definitions import CONFIG_PATH

logger = logging.getLogger("app")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

class Config:

    def __init__(self):
        logger.info(f"Loading configuration from {CONFIG_PATH}")
        environment = os.environ.get("APP_ENV", "docker")
        self.all = tomllib.load(open(CONFIG_PATH, "rb")).get(environment, None)

        if self.all is None:
            raise RuntimeError(f"Environment '{environment}' not found.")

        self.DATA_DIR: str = self.all['DATA_DIRECTORY']
        self.HOST_DATA_DIR: str = self.all.get('HOST_DATA_DIRECTORY', None)
        if self.HOST_DATA_DIR is None:
            logger.warning("HOST_DATA_DIRECTORY is not set. Falling back to DATA_DIRECTORY's value.")
            self.HOST_DATA_DIR = self.DATA_DIR
        self.DATABASE_CONN_URL: str = self.all['DATABASE_CONN_URL']
        self.BROKER_URL: str = self.all['BROKER_URL']
        self.image_dir_name: str = "images"
        self.IMAGE_DIR: str = os.path.join(self.DATA_DIR, self.image_dir_name)
        self.script_dir_name: str = "scripts"
        self.SCRIPT_DIR: str = os.path.join(self.DATA_DIR, self.script_dir_name)
        self.validate()


    def validate(self):
        if not os.path.exists(self.IMAGE_DIR):
            logger.warning(f"Image directory does not exist: {self.IMAGE_DIR}")
            os.makedirs(self.IMAGE_DIR)
            logger.info(f"Created Image Directory: {self.IMAGE_DIR}")

        if not os.path.exists(self.SCRIPT_DIR):
            logger.warning(f"Script directory does not exist: {self.SCRIPT_DIR}")
            os.makedirs(self.SCRIPT_DIR)
            logger.info(f"Created Script Directory: {self.SCRIPT_DIR}")

config = Config()