import base64
import json
import logging
from typing import Any, Callable, Dict, List, Optional

import simplejson

from mage_ai.data_preparation.models.block.dynamic.utils import (
    build_combinations_for_dynamic_child,
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.orchestration.db import db_connection
from mage_ai.presenters.utils import render_output_tags
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.array import find, is_iterable
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex
from mage_ai.system.memory.manager import MemoryManager

db_connection.start_session()
'{spark_session_init}'

if 'context' not in globals():
    context = dict()


def send_status_update(
    message: str,
    progress: Optional[float] = None,
    uuid: Optional[str] = ' Status',
):
    import datetime

    print(
        render_output_tags(
            simplejson.dumps(
                [
                    dict(
                        outputs=[
                            dict(
                                progress=progress,
                                text_data=message,
                                type=DataType.PROGRESS_STATUS,
                            ),
                        ],
                        priority=0,
                        timestamp=int(datetime.datetime.utcnow().timestamp() * 1000),
                        type=DataType.GROUP,
                        variable_uuid=uuid,
                    ),
                ],
                default=encode_complex,
                ignore_nan=True,
            )
        )
    )


def run_task(
    block: Any,
    execute_kwargs: Dict[str, Any],
    callback: Optional[Callable[..., None]] = None,
    custom_code: Optional[str] = None,
    dynamic_block_index: Optional[int] = None,
    global_vars: Optional[Dict[str, Any]] = None,
    logger: Optional[logging.Logger] = None,
):
    output_dict = block.execute_with_callback(**execute_kwargs)

    if callback:
        callback(block)

    if bool('{run_tests}'):
        block.run_tests(
            custom_code=custom_code,
            dynamic_block_index=dynamic_block_index,
            from_notebook=True,
            logger=logger,
            global_vars=global_vars,
            update_tests=False,
        )

    outputs = block.get_outputs(dynamic_block_index=dynamic_block_index)
    if outputs is not None and len(outputs) >= 1:
        _json_string = simplejson.dumps(
            outputs,
            default=encode_complex,
            ignore_nan=True,
        )
        return print(render_output_tags(_json_string))

    output = []
    if output_dict and output_dict.get('output'):
        output = output_dict.get('output')

    return output


def run_tasks(
    block: Any,
    settings: List[Dict[str, Any]],
    options: Dict[str, Any],
) -> List[Any]:
    blocks_count = len(settings)
    blocks_completed = []

    def __callback(block, blocks_completed=blocks_completed, blocks_count=blocks_count):
        blocks_completed.append(block)
        send_status_update(
            f'{len(blocks_completed)} of {blocks_count} dynamic child blocks completed.',
            progress=len(blocks_completed) / blocks_count,
        )

    send_status_update(f'Running {blocks_count} dynamic child blocks...')

    for dynamic_block_index, config in enumerate(settings):
        run_task(
            block,
            merge_dict(options, config),
            callback=__callback,
            custom_code=options.get('custom_code'),
            dynamic_block_index=dynamic_block_index,
            global_vars=options.get('global_vars'),
            logger=options.get('logger'),
        )


def execute_custom_code():
    block_uuid = '{block_uuid}'
    run_incomplete_upstream = bool('{run_incomplete_upstream}')
    run_upstream = bool('{run_upstream}')

    pipeline_config_json = base64.b64decode('{pipeline_config_json_encoded}').decode()
    pipeline_config = json.loads(pipeline_config_json)

    repo_config_json = base64.b64decode('{repo_config_json_encoded}').decode()
    repo_config = json.loads(repo_config_json)

    pipeline = Pipeline(
        uuid='{pipeline_uuid}',
        repo_path='{repo_path}',
        repo_config=repo_config,
        config=pipeline_config,
    )

    block = pipeline.get_block(
        block_uuid, extension_uuid='{extension_uuid}', widget=bool('{widget}')
    )

    upstream_blocks = '{upstream_blocks}'
    if upstream_blocks and len(upstream_blocks) >= 1:
        blocks = pipeline.get_blocks('{upstream_blocks}')
        block.upstream_blocks = blocks

    code = '{escaped_code}'  # noqa E128

    global_vars = merge_dict('{global_vars}' or dict(), pipeline.variables or dict())

    if '{variables}':
        global_vars = merge_dict(global_vars, '{variables}')

    if pipeline.run_pipeline_in_one_process:
        # Use shared context for blocks
        global_vars['context'] = context

    try:
        global_vars['spark'] = '{spark}'
    except Exception:
        pass

    if run_incomplete_upstream or run_upstream:
        block.run_upstream_blocks(
            from_notebook=True,
            global_vars=global_vars,
            incomplete_only=run_incomplete_upstream,
        )

    logger = logging.getLogger('{block_uuid}' + '_test')
    logger.setLevel('INFO')
    if 'logger' not in global_vars:
        global_vars['logger'] = logger

    block_output = dict(output=[])
    options = dict(
        custom_code=code,
        execution_uuid='{execution_uuid}',
        from_notebook=True,
        global_vars=global_vars,
        logger=logger,
        output_messages_to_logs=bool('{output_messages_to_logs}'),
        run_settings=json.loads('{run_settings_json}'),
        update_status='{update_status}',
    )

    is_dynamic_child = is_dynamic_block_child(block)

    if is_dynamic_child:
        with MemoryManager(
            scope_uuid='dynamic_blocks', process_uuid='build_combinations_for_dynamic_child'
        ):
            settings = build_combinations_for_dynamic_child(
                block,
                **options,
            )[: int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')]
        with MemoryManager(scope_uuid='dynamic_blocks', process_uuid='execute_with_callback'):
            block_output['output'] = run_tasks(block, settings, options)
            block.aggregate_summary_info()
    else:
        block_output = block.execute_with_callback(**options)

        if bool('{run_tests}'):
            block.run_tests(
                custom_code=code,
                from_notebook=True,
                logger=logger,
                global_vars=global_vars,
                update_tests=False,
            )

    if block.configuration and block.configuration.get('disable_output_preview', False):
        return 'Output preview is disabled for this block. To enable it, go to block settings.'

    output = block_output['output'] or []

    if bool('{widget}') or is_dynamic_block(block) or is_dynamic_child:
        return output

    if (
        is_iterable(output)
        and len(output) >= 2
        and any([infer_variable_type(i)[0] is not None for i in output])
    ):
        return output[: int('{DATAFRAME_SAMPLE_COUNT_PREVIEW}')]

    item = find(lambda val: val is not None, output)
    return item
