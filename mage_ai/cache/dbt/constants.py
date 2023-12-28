from enum import Enum

from mage_ai.data_preparation.models.constants import (
    BLOCK_TYPE_DIRECTORY_NAME,
    PIPELINES_FOLDER,
    BlockType,
)
from mage_ai.shared.hash import merge_dict

IGNORE_DIRECTORY_NAMES = merge_dict(
    {v: k for k, v in BLOCK_TYPE_DIRECTORY_NAME.items() if k is not BlockType.DBT},
    {
        PIPELINES_FOLDER: PIPELINES_FOLDER,
    },
)

PROFILES_FILENAME = 'profiles.yml'
PROJECT_FILENAME = 'dbt_project.yml'
PROJECT_FILENAMES = [PROJECT_FILENAME, 'dbt_project.yaml']


class FileType(str, Enum):
    MODEL = 'model'
    PROFILES = 'profiles'
    PROJECT = 'project'


def infer_file_type(file_path: str) -> FileType:
    if file_path.endswith('.sql'):
        return FileType.MODEL
    elif file_path.endswith(PROFILES_FILENAME):
        return FileType.PROFILES
    elif any([file_path.endswith(filename) for filename in PROJECT_FILENAMES]):
        return FileType.PROJECT
