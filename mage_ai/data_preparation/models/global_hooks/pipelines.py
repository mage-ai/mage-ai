from typing import Dict, List, Tuple

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    HookOperation,
    HookStage,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.shared.hash import merge_dict


def attach_global_hook_execution(
    pipeline_run,
    pipeline: Pipeline,
    block_uuids_and_create_options: List[Tuple[str, Dict]],
) -> List[Tuple[str, Dict]]:
    project = Project()
    if not project.is_feature_enabled(FeatureUUID.GLOBAL_HOOKS):
        return block_uuids_and_create_options

    global_hooks = GlobalHooks.load_from_file()
    hook_variables = dict(
        operation_resource=pipeline_run.to_dict(),
        payload=dict(
            block_runs=block_uuids_and_create_options,
            pipeline_schedule=pipeline_run.pipeline_schedule.to_dict(),
        ),
        resource=pipeline.to_dict(
            include_content=True,
            include_extensions=True,
            exclude_data_integration=True,
        ),
        resource_id=pipeline.uuid,
    )

    hooks = global_hooks.get_hooks(
        [HookOperation.EXECUTE],
        EntityName.Pipeline,
        HookStage.BEFORE,
        **hook_variables,
    )

    if hooks:
        hooks = [h for h in hooks if h.pipeline_settings and h.pipeline_settings.get(
            'uuid',
        ) and h.pipeline_settings.get('uuid') != pipeline.uuid]

    if not hooks:
        return block_uuids_and_create_options

    arr = []

    root_block_runs = []
    for block_uuid, create_options in block_uuids_and_create_options:
        block = pipeline.get_block(block_uuid)
        if block and \
                len(block.upstream_block_uuids or []) == 0 and \
                not create_options.get('upstream_blocks'):

            root_block_runs.append((block_uuid, create_options))
        else:
            arr.append((block_uuid, create_options))

    if root_block_runs:
        hook_block_run_block_uuids = []
        for hook in hooks:
            block_run_block_uuid = hook.uuid

            hook_block_run_block_uuids.append(block_run_block_uuid)
            arr.append((
                block_run_block_uuid,
                dict(
                    metrics=dict(
                        downstream_blocks=[tup[0] for tup in root_block_runs],
                        hook=hook.to_dict(include_all=True),
                        hook_variables=hook_variables,
                    ),
                ),
            ))

        for block_uuid, create_options in root_block_runs:
            arr.append((
                block_uuid,
                merge_dict(
                    create_options,
                    dict(
                        metrics=dict(
                            upstream_blocks=hook_block_run_block_uuids,
                        ),
                    ),
                ),
            ))

    return arr
