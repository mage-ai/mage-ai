import os
from typing import Dict, List

from mage_ai.data_preparation.models.custom_templates.constants import (
    CUSTOM_TEMPLATES_DIRECTORY,
    CUSTOM_TEMPLATES_DIRECTORY_ENVIRONMENT_VARIABLE,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import group_by


def custom_templates_directory() -> str:
    return os.getenv(
        CUSTOM_TEMPLATES_DIRECTORY_ENVIRONMENT_VARIABLE,
    ) or CUSTOM_TEMPLATES_DIRECTORY


def get_templates(object_type_directory: str) -> List[Dict]:
    full_path = os.path.join(
        get_repo_path(),
        custom_templates_directory(),
        object_type_directory,
    )

    if os.path.exists(full_path):
        file_dict = File.get_all_files(full_path)
        if file_dict:
            return file_dict.get('children', [])


def flatten_files(
    children: List[Dict],
    parent_names: List[str] = None,
) -> List[Dict]:
    if not children:
        return []
    arr = []

    for child1 in children:
        children2 = child1.get('children')
        if children2:
            names = parent_names.copy() if parent_names else []
            if child1.get('name'):
                names.append(child1.get('name'))
            arr += flatten_files(children2, names)
        else:
            child_updated = child1.copy()
            child_updated['parent_names'] = parent_names
            arr.append(child_updated)

    return arr


def group_and_hydrate_files(
    file_dicts: List[Dict],
    custom_template_class,
) -> List:
    def _func(x):
        arr = ['']

        if x:
            parent_names = x.get('parent_names', []) or []
            if parent_names and len(parent_names) >= 1:
                arr = [str(parent_name) for parent_name in parent_names]

        return os.path.join(*arr)

    groups = group_by(_func, file_dicts)

    custom_templates = []

    for template_uuid, _ in groups.items():
        custom_template = custom_template_class.load(get_repo_path(), template_uuid=template_uuid)
        if custom_template:
            custom_templates.append(custom_template)

    return custom_templates
