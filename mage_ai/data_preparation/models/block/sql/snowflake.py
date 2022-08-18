from mage_ai.data_preparation.models.constants import BlockLanguage
from mage_ai.data_preparation.variable_manager import get_variable


def create_upstream_block_tables(loader, block):
    data_provider = block.configuration.get('data_provider')
    database = block.configuration.get('data_provider_database')
    schema = block.configuration.get('data_provider_schema')

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if BlockLanguage.SQL != upstream_block.language or \
           data_provider != upstream_block.configuration.get('data_provider'):

            df = get_variable(
                upstream_block.pipeline.uuid,
                upstream_block.uuid,
                'df',
            )

            loader.export(
                df,
                upstream_block.table_name.upper(),
                database.upper(),
                schema.upper(),
                if_exists='replace',
                verbose=False
            )


def interpolate_input_data(block, query):
    for idx, upstream_block in enumerate(block.upstream_blocks):
        matcher = '{} df_{} {}'.format('{{', idx + 1, '}}')

        if BlockLanguage.SQL == upstream_block.type:
            configuration = upstream_block.configuration
        else:
            configuration = block.configuration

        database = configuration.get('data_provider_database', '').upper()
        schema = configuration.get('data_provider_schema', '').upper()

        query = query.replace(
            f'{matcher}',
            f'"{database}"."{schema}"."{upstream_block.table_name.upper()}"',
        )

    return query
