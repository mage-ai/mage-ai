from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.array import find, flatten
from mage_ai.shared.utils import files_in_path
from typing import Dict, List
import os
import re
import yaml


def parse_attributes(block) -> Dict:
    file_path = block.configuration['file_path']
    project_name = file_path.split('/')[0]
    filename = file_path.split('/')[-1]
    model_name = None
    file_extension = None

    parts = filename.split('.')
    if len(parts) >= 2:
        model_name = '.'.join(parts[:-1])
        file_extension = parts[-1]

    return dict(
        file_extension=file_extension,
        file_path=file_path,
        filename=filename,
        full_path=f'{get_repo_path()}/dbt/{file_path}',
        model_name=model_name,
        project_name=project_name,
    )

def extract_refs(block) -> List[str]:
    return re.findall(
        "{}[ ]*ref\(['\"]+([\w]+)['\"]+\)[ ]*{}".format('\{\{', '\}\}'),
        block.content,
    )


def add_blocks_upstream_from_refs(block) -> None:
    attributes_dict = parse_attributes(block)
    project_name = attributes_dict['project_name']
    models_folder_path = f'{get_repo_path()}/dbt/{project_name}/models'

    files_by_name = {}
    for file_path_orig in files_in_path(models_folder_path):
        file_path = re.sub(f'{models_folder_path}/', '', file_path_orig)
        filename = file_path.split('/')[-1]
        parts = filename.split('.')
        if len(parts) >= 2:
            fn = '.'.join(parts[:-1])
            file_extension = parts[-1]
            if 'sql' == file_extension:
                files_by_name[fn] = file_path_orig

    added_blocks = []
    for idx, ref in enumerate(extract_refs(block)):
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


def update_model_settings(block, upstream_blocks, upstream_blocks_previous):
    attributes_dict = parse_attributes(block)

    filename = attributes_dict['filename']
    full_path = attributes_dict['full_path']
    project_name = attributes_dict['project_name']
    settings_filename = re.sub(filename, f'mage_sources.yml', full_path)

    source_name = f'mage_{project_name}'

    if len(upstream_blocks_previous) > len(upstream_blocks):
        uuids = [b.uuid for b in upstream_blocks]
        for upstream_block in upstream_blocks_previous:
            if upstream_block.uuid in uuids:
                continue

            # If upstream block that’s being removed has a downstream block that is a DBT block
            if any([block.type == b.type for b in upstream_block.downstream_blocks]):
                continue

            if os.path.exists(settings_filename):
                with open(settings_filename, 'r') as f:
                    settings = yaml.safe_load(f) or {}
                    source = find(lambda x: x['name'] == source_name, settings.get('sources', []))
                    table_name = f'{upstream_block.pipeline.uuid}_{upstream_block.uuid}'
                    if source:
                        source['tables'] = list(
                            filter(
                                lambda x: x['name'] != table_name,
                                source.get('tables', []),
                            ),
                        )

                with open(settings_filename, 'w') as f:
                    yaml.safe_dump(settings, f)
    elif upstream_blocks:
        for upstream_block in upstream_blocks:
            if block.type == upstream_block.type:
                continue

            table_name = f'{upstream_block.pipeline.uuid}_{upstream_block.uuid}'

            new_table = dict(name=table_name)
            new_source = dict(
                name=source_name,
                tables=[
                    new_table,
                ],
            )

            if os.path.exists(settings_filename):
                with open(settings_filename, 'r') as f:
                    settings = yaml.safe_load(f) or dict(sources=[], version=2)
                    source = find(lambda x: x['name'] == source_name, settings.get('sources', []))
                    if source:
                        if not source.get('tables'):
                            source['tables'] = []
                        if table_name not in [x['name'] for x in source['tables']]:
                            source['tables'].append(new_table)
                    else:
                        settings['sources'].append(new_source)

            else:
                settings = dict(
                    version=2,
                    sources=[
                        new_source,
                    ],
                )

            with open(settings_filename, 'w') as f:
                yaml.safe_dump(settings, f)
