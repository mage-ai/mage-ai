import os
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.custom_templates.constants import (
    CUSTOM_TEMPLATES_DIRECTORY,
    CUSTOM_TEMPLATES_DIRECTORY_ENVIRONMENT_VARIABLE,
    DIRECTORY_FOR_BLOCK_TEMPLATES,
    DIRECTORY_FOR_PIPELINE_TEMPLATES,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import group_by
from typing import Dict, List


def custom_templates_directory(without_repo_path: bool = False) -> str:
    custom_template_dir = os.getenv(
        CUSTOM_TEMPLATES_DIRECTORY_ENVIRONMENT_VARIABLE,
    ) or CUSTOM_TEMPLATES_DIRECTORY
    if without_repo_path:
        return custom_template_dir

    repo_path = get_repo_path()
    return os.path.join(repo_path, custom_template_dir)


def get_templates():
    full_path_for_blocks = os.path.join(
        custom_templates_directory(),
        DIRECTORY_FOR_BLOCK_TEMPLATES,
    )
    full_path_for_pipelines = os.path.join(
        custom_templates_directory(),
        DIRECTORY_FOR_PIPELINE_TEMPLATES,
    )

    file_objects_for_blocks = []
    if os.path.exists(full_path_for_blocks):
        file_dict = File.get_all_files(full_path_for_blocks)
        if file_dict:
            file_objects_for_blocks = file_dict.get('children', [])

    file_objects_for_pipelines = []
    if os.path.exists(full_path_for_pipelines):
        file_dict = File.get_all_files(full_path_for_pipelines)
        if file_dict:
            file_objects_for_pipelines = file_dict.get('children', [])

    return {
        DIRECTORY_FOR_BLOCK_TEMPLATES: file_objects_for_blocks,
        DIRECTORY_FOR_PIPELINE_TEMPLATES: file_objects_for_pipelines,
    }


def flatten_files(
    children: List[Dict],
    parent_names: List[str] = None,
) -> List[Dict]:
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
    base_path: str,
    custom_template_class,
) -> List:
    groups = group_by(lambda x: os.path.join(*x.get('parent_names', [])), file_dicts)

    arr = []

    for file_path, group in groups.items():
        custom_template = custom_template_class.load(
            config_path=os.path.join(base_path, file_path),
        )
        custom_template.filenames_in_directory = [g.get('name') for g in group]
        custom_template.file_path = file_path
        custom_template.uuid = file_path.split(os.sep)[-1]

        arr.append(custom_template)

    return arr


# file_dicts = get_templates()[DIRECTORY_FOR_BLOCK_TEMPLATES]
# arr = flatten_files(file_dicts)
# base_path = os.path.join(custom_templates_directory(), DIRECTORY_FOR_BLOCK_TEMPLATES)
# template = [ct for ct in group_and_hydrate_files(arr, base_path, CustomBlockTemplate)][1]
# template.render_template('python', dict(test=1))


# template.tags = [1, 2]
# template.save()
