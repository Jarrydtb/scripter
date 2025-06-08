import os
import typing
import uuid
from typing import Optional

from fastapi import UploadFile


def to_int_or_none(value: str | float) -> typing.Optional[int]:
    try:
        if value is None:
            return None
        return int(value)
    except ValueError:
        return None

def has_numbers(string: str) -> bool:
    return any(char.isdigit() for char in string)

def has_illegal_characters(string: str, illegal_chars: Optional[list[str]] = None) -> bool:
    if illegal_chars is None:
        illegal_chars = list("[@!#$%^&*()<>?/|}{~:]_.")
    return any(char in illegal_chars for char in string)

def save_file(save_path: str, file: UploadFile):
    with open(save_path, "wb") as f:
        f.write(file.file.read())

def securely_create_dir(root_directory: str):
    if not os.path.exists(root_directory):
        raise Exception(f"Root directory {root_directory} does not exist")
    if not os.path.isdir(root_directory):
        raise Exception(f"Root directory {root_directory} is not a directory")
    max_tries = 10
    while True:
        if max_tries == 0:
            raise Exception("Max tries reached. Suggested fs cleanup.")
        unique_id = uuid.uuid4().hex
        dir_path = os.path.join(root_directory, unique_id)
        try:
            # Only succeeds if directory doesn't already exist
            os.makedirs(dir_path, exist_ok=False)
            return dir_path
        except FileExistsError:
            # Collision occurred (extremely rare), try again
            max_tries -= 1
            pass