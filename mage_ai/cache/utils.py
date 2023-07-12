from datetime import datetime
from typing import Dict, Union


def build_pipeline_dict(pipeline: Union[Dict], added_at: str = None) -> Dict:
    pipeline_description = None
    pipeline_name = None
    pipeline_type = None
    pipeline_updated_at = None
    pipeline_uuid = None

    if type(pipeline) is dict:
        pipeline_description = pipeline.get('description')
        pipeline_name = pipeline.get('name')
        pipeline_type = pipeline.get('type')
        pipeline_updated_at = pipeline.get('updated_at')
        pipeline_uuid = pipeline.get('uuid')
    else:
        pipeline_description = pipeline.description
        pipeline_name = pipeline.name
        pipeline_type = pipeline.type
        pipeline_updated_at = pipeline.updated_at
        pipeline_uuid = pipeline.uuid

    return dict(
        added_at=added_at,
        pipeline=dict(
            description=pipeline_description,
            name=pipeline_name,
            type=pipeline_type,
            updated_at=pipeline_updated_at,
            uuid=pipeline_uuid,
        ),
        updated_at=datetime.utcnow().timestamp(),
    )
