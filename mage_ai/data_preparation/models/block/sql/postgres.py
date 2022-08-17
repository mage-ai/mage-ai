from mage_ai.data_preparation.models.constants import BlockLanguage
from mage_ai.data_preparation.variable_manager import get_variable


def create_upstream_block_tables(loader, block):
    schema_name = block.configuration.get('data_provider_schema')

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if BlockLanguage.SQL != upstream_block.language:
            df = get_variable(
                upstream_block.pipeline.uuid,
                upstream_block.uuid,
                'df',
            )

            loader.export(
                df,
                schema_name,
                upstream_block.table_name,
                if_exists='replace',
                index=False,
                verbose=False,
            )


def interpolate_input_data(block, query):
    for idx, upstream_block in enumerate(block.upstream_blocks):
        matcher = '{} df_{} {}'.format('{{', idx + 1, '}}')

        if BlockLanguage.SQL == upstream_block.type:
            schema_name = upstream_block.configuration.get('data_provider_schema')
        else:
            schema_name = block.configuration.get('data_provider_schema')

        query = query.replace(f'{matcher}', f'{schema_name}.{upstream_block.table_name}')

    return query
