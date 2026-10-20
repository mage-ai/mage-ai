from datetime import datetime
from typing import Callable, Dict, List, Union

from mage_ai.shared.hash import extract, merge_dict

PIPELINE_KEYS = [
    'created_at',
    'description',
    'name',
    'tags',
    'type',
    'uuid',
]
BLOCK_KEYS = [
    'downstream_blocks',
    'language',
    'name',
    'type',
    'upstream_blocks',
    'uuid',
]


def build_block_dict(block: Union[Dict]) -> Dict:
    file_path = None

    if isinstance(block, dict):
        block_language = block.get('language')
        block_name = block.get('name')
        block_type = block.get('type')
        block_uuid = block.get('uuid')
        configuration = block.get('configuration')
        if configuration:
            file_source = configuration.get('file_source')
            if file_source:
                file_path = file_source.get('path')
            if file_path is None:
                file_path = configuration.get('file_path')
    else:
        block_language = block.language
        block_name = block.name
        block_type = block.type
        block_uuid = block.uuid
        file_path = block.file_path

    return dict(
        file_path=file_path,
        language=block_language,
        name=block_name,
        type=block_type,
        uuid=block_uuid,
    )


def build_pipeline_dict(
    pipeline: Union[Dict],
    added_at: str = None,
    include_details: bool = False,
    repo_path: str = None,
) -> Dict:
    pipeline_output_dict = dict(
        created_at=None,
        description=None,
        name=None,
        tags=None,
        type=None,
        uuid=None,
    )

    if repo_path:
        pipeline_output_dict['repo_path'] = repo_path

    if isinstance(pipeline, dict):
        pipeline_output_dict.update(extract(pipeline, PIPELINE_KEYS))
        if include_details:
            pipeline_output_dict['blocks'] = [
                merge_dict(
                    extract(
                        block,
                        BLOCK_KEYS,
                    ),
                    dict(
                        downstream_blocks=[
                            b.get('uuid') if isinstance(b, dict) else b
                            for b in (block.get('downstream_blocks') or [])
                        ],
                        upstream_blocks=[
                            b.get('uuid') if isinstance(b, dict) else b
                            for b in (block.get('upstream_blocks') or [])
                        ],
                    ),
                )
                for block in (pipeline.get('blocks') or [])
            ]
    else:
        for key in PIPELINE_KEYS:
            pipeline_output_dict[key] = getattr(pipeline, key)

        if include_details:
            pipeline_output_dict['blocks'] = [
                merge_dict(
                    {
                        k: getattr(
                            block,
                            k,
                        )
                        for k in BLOCK_KEYS
                    },
                    dict(
                        downstream_blocks=[b.uuid for b in (block.downstream_blocks or [])],
                        upstream_blocks=[b.uuid for b in (block.upstream_blocks or [])],
                    ),
                )
                for block in pipeline.blocks_by_uuid.values()
            ]

    return dict(
        added_at=added_at,
        pipeline=pipeline_output_dict,
        updated_at=datetime.utcnow().timestamp(),
    )


def group_models_by_keys(
    model_dicts: List[Dict],
    keys: List[str],
    get_uuid_key: Callable,
) -> Dict:
    mapping = {key: {} for key in keys}

    for model_dict in model_dicts:
        if not model_dict:
            continue

        for key in keys:
            value = str(model_dict.get(key))
            if value not in mapping[key]:
                mapping[key][value] = []
            mapping[key][value].append(get_uuid_key(model_dict))

    return mapping
