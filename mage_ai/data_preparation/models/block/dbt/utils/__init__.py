from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.utils import files_in_path
from typing import List
import re


def extract_refs(block) -> List[str]:
    return re.findall(
        "{}[ ]*ref\(['\"]+([\w]+)['\"]+\)[ ]*{}".format('\{\{', '\}\}'),
        block.content,
    )


def add_blocks_upstream_from_refs(block) -> None:
    file_path = block.configuration['file_path']
    project_name = file_path.split('/')[0]
    refs = extract_refs(block)

    models_folder_path = f'{get_repo_path()}/dbt/{project_name}/models'
    file_paths = files_in_path(models_folder_path)
    files_by_name = {}
    for file_path_orig in file_paths:
        fp = re.sub(f'{models_folder_path}/', '', file_path_orig)
        filename = fp.split('/')[-1]
        parts = filename.split('.')
        if len(parts) >= 2:
            fn = '.'.join(parts[:-1])
            file_extension = parts[-1]
            if 'sql' == file_extension:
                files_by_name[fn] = file_path_orig

    added_blocks = []

    for idx, ref in enumerate(refs):
        uuid = re.sub(f'{get_repo_path()}/dbt/', '', files_by_name[ref])

        new_block = block.__class__.create(
            uuid,
            block.type,
            get_repo_path(),
            configuration=dict(
                file_path=uuid,
            ),
            language=block.language,
            pipeline=block.pipeline,
        )
        added_blocks.append(new_block)

    return added_blocks




