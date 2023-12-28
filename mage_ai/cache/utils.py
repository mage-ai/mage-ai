from datetime import datetime
from typing import Dict, List, Union

from mage_ai.shared.hash import extract, merge_dict

PIPELINE_KEYS = [
    'description',
    'name',
    'tags',
    'type',
    'updated_at',
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


def build_pipeline_dict(
    pipeline: Union[Dict],
    added_at: str = None,
    include_details: bool = False,
) -> Dict:
    pipeline_output_dict = dict(
        description=None,
        name=None,
        tags=None,
        type=None,
        updated_at=None,
        uuid=None,
    )

    if isinstance(pipeline, dict):
        pipeline_output_dict.update(extract(pipeline, PIPELINE_KEYS))
        if include_details:
            pipeline_output_dict['blocks'] = [merge_dict(extract(
                block,
                BLOCK_KEYS,
            ), dict(
                downstream_blocks=[b.get('uuid') if isinstance(b, dict) else b for b in (
                    block.get('downstream_blocks') or []
                )],
                upstream_blocks=[b.get('uuid') if isinstance(b, dict) else b for b in (
                    block.get('upstream_blocks') or []
                )],
            )) for block in (pipeline.get('blocks') or [])]
    else:
        for key in PIPELINE_KEYS:
            pipeline_output_dict[key] = getattr(pipeline, key)

        if include_details:
            pipeline_output_dict['blocks'] = [merge_dict({k: getattr(
                block,
                k,
            ) for k in BLOCK_KEYS}, dict(
                downstream_blocks=[b.uuid for b in (block.downstream_blocks or [])],
                upstream_blocks=[b.uuid for b in (block.upstream_blocks or [])],
            )) for block in pipeline.blocks_by_uuid.values()]

    return dict(
        added_at=added_at,
        pipeline=pipeline_output_dict,
        updated_at=datetime.utcnow().timestamp(),
    )


def group_models_by_keys(model_dicts: List[Dict], keys: List[str], uuid_key: str) -> Dict:
    mapping = {key: {} for key in keys}

    for model_dict in model_dicts:
        if not model_dict:
            continue

        for key in keys:
            value = str(model_dict.get(key))
            if value not in mapping[key]:
                mapping[key][value] = []
            mapping[key][value].append(model_dict.get(uuid_key))

    return mapping
