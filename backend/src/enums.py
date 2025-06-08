import enum
from typing import Optional
from src.schemas import LanguageSchema


class BaseEnum(enum.Enum):

    @classmethod
    def get_value(cls, name: str):
        try:
            return cls[name.upper()].value
        except KeyError:
            return None

    @classmethod
    def get_name(cls, value: int) -> Optional[str]:
        obj = next((i for i in cls.__members__.values() if i.value == value), None)
        return obj.name if obj else None


class ImageStatus(BaseEnum):
    DORMANT = 0
    BUILDING = 1
    BUILD_SUCCESS = 2
    BUILD_FAILED = 3


class JobStatus(BaseEnum):
    PENDING = 0
    RUNNING = 1
    SUCCESS = 2
    FAILED = 3
    KILLED = 4

    @classmethod
    def get_deletable(cls):
        return [cls.SUCCESS, cls.FAILED, cls.KILLED]

class ScriptHistoryAction(BaseEnum):
    CREATED = 0
    MODIFIED = 1
    DELETED = 2



class AvailableScriptLanguages(BaseEnum):
    PYTHON = LanguageSchema(name="Python", extension="py", command="python -u")
    JAVASCRIPT = LanguageSchema(name="JavaScript", extension="js", command="node")

    @classmethod
    def get_values(cls):
        return [i.value for i in cls.__members__.values()]

    @classmethod
    def is_valid_language(cls, language: str) -> bool:
        return next((i for i in cls.__members__.values() if i.value.name.lower() == language.lower()), None) is not None

    @classmethod
    def get_by_name(cls, name: str) -> Optional[LanguageSchema]:
        item = next((i for i in cls.__members__.values() if i.value.name.lower() == name.lower()), None)
        if item is None:
            return None
        return item.value
