import os
from typing import Dict, List, Optional

from mage_ai.data_preparation.models.custom_templates.constants import (
    CORE_CUSTOM_TEMPLATES_PATH,
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


def get_core_custom_templates_path() -> str:
    return CORE_CUSTOM_TEMPLATES_PATH


def _tag_base_path(children: List[Dict], base_path: str) -> None:
    for child in children:
        grandchildren = child.get('children')
        if grandchildren:
            _tag_base_path(grandchildren, base_path)
        else:
            child['_base_path'] = base_path


def get_templates(object_type_directory: str) -> List[Dict]:
    results = []

    core_path = os.path.join(
        get_core_custom_templates_path(),
        custom_templates_directory(),
        object_type_directory,
    )
    if os.path.exists(core_path):
        file_dict = File.get_all_files(core_path)
        if file_dict:
            children = file_dict.get('children', [])
            _tag_base_path(children, get_core_custom_templates_path())
            results += children

    user_path = os.path.join(
        get_repo_path(),
        custom_templates_directory(),
        object_type_directory,
    )
    if os.path.exists(user_path):
        file_dict = File.get_all_files(user_path)
        if file_dict:
            children = file_dict.get('children', [])
            _tag_base_path(children, get_repo_path())
            results += children

    return results or None


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

    # Build a map from template_uuid -> base_path using the first file in each group.
    base_path_by_uuid: Dict[str, Optional[str]] = {}
    for file_dict in file_dicts:
        uuid_key = _func(file_dict)
        if uuid_key not in base_path_by_uuid:
            base_path_by_uuid[uuid_key] = file_dict.get('_base_path')

    repo_path = get_repo_path()
    custom_templates = []

    for template_uuid, _ in groups.items():
        template_base_path = base_path_by_uuid.get(template_uuid)
        custom_template = custom_template_class.load(
            repo_path,
            template_uuid=template_uuid,
            template_base_path=template_base_path,
        )
        if custom_template:
            custom_templates.append(custom_template)

    return custom_templates
