def initialize_database():
    from mage_ai.orchestration.db import db_connection

    db_connection.start_session()


def reload_modules(message: str):
    from mage_ai.utils.code import build_reload_modules_code

    exec(build_reload_modules_code(message))


def execute(**kwargs):
    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline_uuid = kwargs.get('pipeline_uuid')
    pipeline = Pipeline.get(pipeline_uuid, all_projects=True)
    if not pipeline:
        raise ValueError(f'Pipeline with UUID {pipeline_uuid} not found')

    block_uuid = kwargs.get('block_uuid')
    block_type = kwargs.get('block_type')

    if not block_uuid or not block_type:
        raise ValueError('block_uuid and block_type are required')

    block = pipeline.get_block(block_uuid, block_type)

    block._content = kwargs.get('message')
    variables = kwargs.get('variables') or {}

    block.execute_with_callback(
        execution_partition=variables.get('execution_partition'),
        global_vars=variables,
        override_outputs=False,
        store_variables=True,
        update_status=False,
        verify_output=False,
        from_notebook=True,
    )
