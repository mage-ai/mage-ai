import os
from pathlib import Path

from mage_ai.data_preparation.models.constants import PIPELINES_FOLDER
from mage_ai.settings.repo import get_repo_path


def number_string(version: int, number_of_numbers: int = 20) -> str:
    version_string = str(version)
    for _i in range(number_of_numbers - len(version_string)):
        version_string = f'0{version_string}'

    return version_string


def get_uuid(path_object, base_dirname):
    return os.path.dirname(str(path_object.relative_to(base_dirname)))


def get_all_pipeline_uuids():
    base_dirname = os.path.join(get_repo_path(), PIPELINES_FOLDER)

    arr = []
    for path in Path(base_dirname).rglob('*'):
        if path.name.endswith('metadata.yaml') or path.name.endswith('metadata.yml'):
            arr.append(get_uuid(path, base_dirname))

    return sorted(arr)
