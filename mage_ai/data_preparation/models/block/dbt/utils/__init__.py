from mage_ai.data_preparation.models.block.sql import execute_sql_code as execute_sql_code_orig
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.io.base import DataSource, ExportWritePolicy
from mage_ai.io.config import ConfigFileLoader
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

    project_full_path = f'{get_repo_path()}/dbt/{project_name}'

    full_path = f'{get_repo_path()}/dbt/{file_path}'
    sources_full_path = re.sub(filename, f'mage_sources.yml', full_path)

    source_name = f'mage_{project_name}'

    return dict(
        file_extension=file_extension,
        file_path=file_path,
        filename=filename,
        full_path=full_path,
        model_name=model_name,
        profiles_full_path=f'{project_full_path}/profiles.yml',
        project_full_path=project_full_path,
        project_name=project_name,
        source_name=source_name,
        sources_full_path=sources_full_path,
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


def get_source(block) -> Dict:
    source_name = attributes_dict['source_name']
    settings = load_sources(block)
    return find(lambda x: x['name'] == source_name, settings.get('sources', []))


def load_sources(block) -> Dict:
    attributes_dict = parse_attributes(block)
    sources_full_path = attributes_dict['sources_full_path']
    if os.path.exists(sources_full_path):
        with open(sources_full_path, 'r') as f:
            return yaml.safe_load(f) or dict(sources=[], version=2)


def source_table_name_for_block(block) -> str:
    return f'{block.pipeline.uuid}_{block.uuid}'


def update_model_settings(block, upstream_blocks, upstream_blocks_previous):
    attributes_dict = parse_attributes(block)

    filename = attributes_dict['filename']
    full_path = attributes_dict['full_path']
    project_name = attributes_dict['project_name']
    sources_full_path = attributes_dict['sources_full_path']
    source_name = attributes_dict['source_name']

    if len(upstream_blocks_previous) > len(upstream_blocks):
        # TODO (tommy dangerous): should we remove sources?
        # How do we know no other model is using a source?

        # uuids = [b.uuid for b in upstream_blocks]
        # for upstream_block in upstream_blocks_previous:
        #     if upstream_block.uuid in uuids:
        #         continue

        #     # If upstream block that’s being removed has a downstream block that is a DBT block
        #     if any([block.type == b.type for b in upstream_block.downstream_blocks]):
        #         continue

        #     if os.path.exists(sources_full_path):
        #         with open(sources_full_path, 'r') as f:
        #             settings = yaml.safe_load(f) or {}
        #             source = find(lambda x: x['name'] == source_name, settings.get('sources', []))
        #             table_name = f'{upstream_block.pipeline.uuid}_{upstream_block.uuid}'
        #             if source:
        #                 source['tables'] = list(
        #                     filter(
        #                         lambda x: x['name'] != table_name,
        #                         source.get('tables', []),
        #                     ),
        #                 )

        #         with open(sources_full_path, 'w') as f:
        #             yaml.safe_dump(settings, f)
        pass
    elif upstream_blocks:
        for upstream_block in upstream_blocks:
            if block.type == upstream_block.type:
                continue

            table_name = source_table_name_for_block(block)

            new_table = dict(name=table_name)
            new_source = dict(
                name=source_name,
                tables=[
                    new_table,
                ],
            )

            settings = load_sources(block)
            if settings:
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

            with open(sources_full_path, 'w') as f:
                yaml.safe_dump(settings, f)


def get_profile(block, profile_target: str = None) -> Dict:
    attr = parse_attributes(block)
    project_name = attr['project_name']
    project_full_path = attr['project_full_path']
    profiles_full_path = attr['profiles_full_path']

    with open(profiles_full_path, 'r') as f:
        profile = yaml.safe_load(f)[project_name]
        outputs = profile['outputs']
        target = profile['target']

        return outputs.get(profile_target or target)


def execute_sql_code(
    block,
    query: str,
    profile_target: str,
    **kwargs,
):
    profile = get_profile(block, profile_target)
    attr = parse_attributes(block)
    profiles_full_path = attr['profiles_full_path']

    database = profile.get('dbname')
    host = profile.get('host')
    password = profile.get('password')
    port = profile.get('port')
    profile_type = profile.get('type')
    schema = profile.get('schema')
    user = profile.get('user')

    if DataSource.POSTGRES == profile_type:
        config_file_loader = ConfigFileLoader(config=dict(
            POSTGRES_DBNAME=database,
            POSTGRES_HOST=host,
            POSTGRES_PASSWORD=password,
            POSTGRES_PORT=port,
            POSTGRES_USER=user,
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=database,
            data_provider_schema=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    else:
        msg = f'No configuration matching profile type {profile_type}. ' \
            f'Change your target in {profiles_full_path} ' \
            'or add dbt_profile_target to your global variables.'
        raise Exception(msg)

    return execute_sql_code_orig(
        block,
        query,
        config_file_loader=config_file_loader,
        configuration=configuration,
        **kwargs,
    )
