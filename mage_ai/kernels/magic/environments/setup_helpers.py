async def execute(**kwargs):
    from mage_ai.data_preparation.models.pipeline import Pipeline
    from mage_ai.orchestration.db import db_connection
    from mage_ai.utils.code import build_reload_modules_code

    db_connection.start_session()

    message = kwargs.get('message') or ''

    exec(build_reload_modules_code(message))

    pipeline_uuid = kwargs.get('pipeline_uuid')
    pipeline = Pipeline.get(pipeline_uuid, all_projects=True)
    if not pipeline:
        raise ValueError(f'Pipeline with UUID {pipeline_uuid} not found')

    block_uuid = kwargs.get('block_uuid')
    block_type = kwargs.get('block_type')

    if not block_uuid or not block_type:
        raise ValueError('block_uuid and block_type are required')

    block = pipeline.get_block(block_uuid, block_type)

    variables = kwargs.get('variables') or {}

    await block.execute(
        custom_code=message,
        execution_partition=variables.get('execution_partition'),
        from_notebook=False,
        global_vars=variables,
        override_outputs=False,
        store_variables=True,
        update_status=False,
        verify_output=False,
    )
