from jinja2 import Template
from mage_ai.data_preparation.models.constants import BlockLanguage
import re


def interpolate_input(block, query, replace_func=None):
    def __replace_func(db, schema, tn):
        if replace_func:
            return replace_func(db, schema, tn)

        return f'{schema}.{tn}'

    for idx, upstream_block in enumerate(block.upstream_blocks):
        matcher1 = '{} df_{} {}'.format('{{', idx + 1, '}}')

        if BlockLanguage.SQL == upstream_block.type:
            configuration = upstream_block.configuration
        else:
            configuration = block.configuration

        database = configuration.get('data_provider_database', '')
        schema = configuration.get('data_provider_schema', '')

        query = re.sub(
            '{}[ ]*df_{}[ ]*{}'.format('\{\{', idx + 1, '\}\}'),
            __replace_func(database, schema, upstream_block.table_name),
            query,
        )

        query = query.replace(
            f'{matcher1}',
            __replace_func(database, schema, upstream_block.table_name),
        )

    return query


def interpolate_vars(query, global_vars=dict()):
    return Template(query).render(**global_vars)
