import json
import logging

from mage_ai.data_preparation.models.block.dynamic.utils import (
    build_combinations_for_dynamic_child,
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.orchestration.db import db_connection
from mage_ai.shared.array import find, is_iterable
from mage_ai.shared.hash import merge_dict

db_connection.start_session()
'{spark_session_init}'

if 'context' not in globals():
    context = dict()


def execute_custom_code():
    block_uuid = '{block_uuid}'
    run_incomplete_upstream = bool('{run_incomplete_upstream}')
    run_upstream = bool('{run_upstream}')
    pipeline = Pipeline(
        uuid='{pipeline_uuid}',
        repo_path='{repo_path}',
        repo_config='{repo_config}',
        config='{pipeline_config}',
    )

    block = pipeline.get_block(
        block_uuid, extension_uuid='{extension_uuid}', widget=bool('{widget}')
    )

    upstream_blocks = '{upstream_blocks}'
    if upstream_blocks and len(upstream_blocks) >= 1:
        blocks = pipeline.get_blocks('{upstream_blocks}')
        block.upstream_blocks = blocks

    code = """
'{escaped_code}'
    """

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
        outputs = []
        settings = build_combinations_for_dynamic_child(block, **options)
        for dynamic_block_index, config in enumerate(settings):
            output_dict = block.execute_with_callback(**merge_dict(options, config))
            if output_dict and output_dict.get('output'):
                outputs.append(output_dict.get('output'))

            if bool('{run_tests}'):
                block.run_tests(
                    custom_code=code,
                    dynamic_block_index=dynamic_block_index,
                    from_notebook=True,
                    logger=logger,
                    global_vars=global_vars,
                    update_tests=False,
                )

        block_output['output'] = outputs
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
