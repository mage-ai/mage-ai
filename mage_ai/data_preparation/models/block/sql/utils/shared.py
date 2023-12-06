import re
from os import path
from typing import Callable, Dict, List, Tuple, Union

from jinja2 import StrictUndefined, Template
from pandas import DataFrame

from mage_ai.data_preparation.models.block.sql.constants import (
    CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION,
    CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION_TABLE_NAME,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.utils import get_variable_for_template
from mage_ai.data_preparation.variable_manager import get_variable
from mage_ai.io.config import ConfigFileLoader
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict

MAGE_SEMI_COLON = '__MAGE_SEMI_COLON__'


def build_variable_pattern(variable_name: str):
    return r'{}[ ]*{}[ ]*{}'.format(r'\{\{', variable_name, r'\}\}')


def blocks_in_query(block, query: str) -> Dict:
    blocks = {}

    if not query:
        return blocks

    for idx, upstream_block in enumerate(block.upstream_blocks):
        pattern = build_variable_pattern(f'df_{idx + 1}')

        if re.findall(pattern, query):
            blocks[upstream_block.uuid] = upstream_block

    return blocks


def should_cache_data_from_upstream(
    block,
    upstream_block,
    config_keys: List[str],
    config_profile_keys: List[str],
) -> bool:
    """Check whether it's necessary to upload the data from upstream block to
    SQL database.

    1. Compare the keys in the config_keys between block's configuration and upstream_block's
        configuration.
    2. Compare the kyes in config_profile_keys between block's profile config and upstream_block's
        profile config in io_config.yaml

    Args:
        block (Block): The current block.
        upstream_block (Block): The upstream block.
        config_keys (List[str]): The keys in block configuration to compare.
        config_profile_keys (List[str]): The keys in io_config.yaml profiles to compare.
    """
    if BlockType.SENSOR == upstream_block.type:
        return False

    if BlockType.DBT == block.type:
        # TODO (tommy dang): check to see if the upstream block has the same data source
        return True

    config_path = path.join(get_repo_path(), 'io_config.yaml')

    block_config = block.configuration or {}
    upstream_block_config = upstream_block.configuration or {}

    block_data_provider = block_config.get('data_provider_profile')
    upstream_block_data_provider = upstream_block_config.get('data_provider_profile')

    # if config1.get('use_raw_sql'):
    #     return False

    if BlockLanguage.SQL == block.language and BlockLanguage.SQL != upstream_block.language:
        # If current block uses SQL but upstream block doesn't use SQL, always upload upstream block
        # to the SQL database.
        return True

    block_loader = ConfigFileLoader(config_path, block_data_provider)
    upstream_block_loader = ConfigFileLoader(config_path, upstream_block_data_provider)

    return not all([
        block_config.get(k) and
        upstream_block_config.get(k) and
        block_config.get(k) == upstream_block_config.get(k) for k in config_keys
    ]) or not all([
        block_loader.config.get(k) and
        upstream_block_loader.config.get(k) and
        block_loader.config.get(k) == upstream_block_loader.config.get(k)
        for k in config_profile_keys
    ])


def interpolate_input(
    block,
    query: str,
    replace_func: Callable = None,
    get_database: Callable = None,
    get_schema: Callable = None,
    get_table: Callable = None,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
) -> str:
    def __replace_func(db, schema, tn):
        if replace_func:
            return replace_func(db, schema, tn)

        return '.'.join(list(filter(lambda x: x, [db, schema, tn])))

    for idx, upstream_block in enumerate(block.upstream_blocks):
        matcher1 = '{} df_{} {}'.format('{{', idx + 1, '}}')
        variable_pattern = build_variable_pattern(f'df_{idx + 1}')
        if re.search(variable_pattern, query) is None:
            continue

        is_sql = BlockLanguage.SQL == upstream_block.language
        if is_sql:
            configuration = upstream_block.configuration
        else:
            configuration = block.configuration
        use_raw_sql = configuration.get('use_raw_sql')

        data_provider1 = block.configuration.get('data_provider')
        data_provider2 = upstream_block.configuration.get('data_provider')
        is_same_data_providers = data_provider1 == data_provider2

        if block.configuration.get('use_raw_sql'):
            if is_sql and data_provider1 != data_provider2:
                raise Exception(
                    f'Variable interpolation when using raw SQL for {matcher1} '
                    'is not supported because '
                    f'upstream block {upstream_block.uuid} is using a different '
                    f'data provider ({data_provider2}) than {block.uuid}’s data provider '
                    f'({data_provider1}). Please disable using raw SQL and try again.',
                )

        database, schema, table_name = table_name_parts(block.configuration, upstream_block)

        config_to_use = configuration if is_same_data_providers else block.configuration
        if not database:
            database = config_to_use.get('data_provider_database')
        if not schema:
            schema = config_to_use.get('data_provider_schema')

        if not database and get_database:
            database = get_database(dict(configuration=configuration))

        if not schema and get_schema:
            schema = get_schema(dict(configuration=configuration))

        if not table_name:
            table_name = upstream_block.table_name

        if get_table:
            table_name = get_table(dict(
                configuration=configuration,
                table=table_name,
            ))

        table_name = build_dynamic_table_name(table_name, dynamic_block_index)

        replace_with = __replace_func(database, schema, table_name)

        upstream_block_content = upstream_block.content
        if is_sql and \
                use_raw_sql and \
                is_same_data_providers and not \
                has_create_or_insert_statement(upstream_block_content):

            upstream_query = interpolate_input(upstream_block, upstream_block_content)

            match = 1
            while match is not None:
                match = None

                for pattern in [
                    r'{}[\n\r\s]+as[\n\r\s]+'.format(variable_pattern),
                    r'{}[\n\r\s]+["|\'].+["|\']'.format(variable_pattern),
                    r'{}[\n\r\s]+\S+[\n\r\s]+ON'.format(variable_pattern),
                ]:
                    if match:
                        continue

                    match = re.search(
                        pattern,
                        query,
                        re.IGNORECASE,
                    )

                if not match:
                    continue

                si, ei = match.span()
                substring = query[si:ei]

                si, ei = match.span()
                query = ''.join([
                    query[:si],
                    re.sub(
                        variable_pattern,
                        f'({upstream_query})',
                        substring,
                    ),
                    query[ei:],
                ])

            replace_with = f"""(
{upstream_query.strip()}
) AS {table_name}"""

        query = re.sub(
            variable_pattern,
            replace_with,
            query,
        )

        query = query.replace(
            f'{matcher1}',
            replace_with,
        )

    return query


def interpolate_vars(query, global_vars=None):
    if global_vars is None:
        global_vars = dict()

    return Template(
        query,
        undefined=StrictUndefined,
    ).render(
        variables=lambda x, p=None, v=global_vars: get_variable_for_template(
            x,
            parse=p,
            variables=v,
        ),
        **merge_dict(
            global_vars,
            get_template_vars(),
        ),
    )


def table_name_parts(
    configuration: Dict,
    upstream_block,
    no_schema: bool = False,
    dynamic_block_index: int = None,
) -> Tuple[str, str, str]:
    """Get the table name parts (database, schema, table_name) of the upstream block.
    The upstream block will be uploaded to the full table name. The full table name
    will also be used in the SQL query interpolation to replace {{ df_[idx] }}.

    Priority:
    1. Get the database, schema and table_name from the block configuration with the foramt
        ```yaml
        upstream_block_configuration:
            [block_uuid]:
                table_name: database.schema.table
        ```
    2. Use the upstream block's table name
    3. Use the `data_provider_schema` from the upstream block's configuration if it exists and
       the current block's `data_provider` and `data_provider_profile` are the same as the upstream
       block's `data_provider` and `data_provider_profile`.
    4. Use the `data_provider_schema` from the current block's configuration

    Args:
        configuration (Dict): Current block configuration.
        upstream_block (TYPE): The upstream block.
        no_schema (bool, optional): Whether the database uses schema. If true, the database doesn't
            use schema, e.g. MySQL.
    Returns:
        Tuple of (database, schema, table)
    """
    database = None
    schema = None
    table = None

    full_table_name = configuration.get(
        CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION,
        {},
    ).get(
        upstream_block.uuid,
        {},
    ).get(CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION_TABLE_NAME)

    if full_table_name:
        parts = full_table_name.split('.')
    else:
        parts = upstream_block.table_name.split('.')

    if len(parts) == 3:
        database, schema, table = parts
    elif len(parts) == 2:
        if no_schema:
            database, table = parts
        else:
            schema, table = parts
    elif len(parts) == 1:
        table = parts[0]

    if not schema and not no_schema:
        upstream_configuration = upstream_block.configuration
        if (
            upstream_configuration
            and configuration.get('data_provider')
            == upstream_configuration.get('data_provider')
            and configuration.get('data_provider_profile')
            == upstream_configuration.get('data_provider_profile')
            and upstream_configuration.get('data_provider_schema')
        ):
            schema = upstream_block.configuration.get('data_provider_schema')
        else:
            schema = configuration.get('data_provider_schema')

    table = build_dynamic_table_name(table, dynamic_block_index)

    return database, schema, table


def table_name_parts_from_query(
    query: str,
) -> Union[Tuple[str, str, str], None]:
    """
    This method is intended to parse the database, query, and table name from a SELECT
    query, such as "select * from demo_db.demo_schema.demo_table;". The regex may need
    to be updated if using non-SELECT queries.
    """
    match = re.search(r'[^.+]from[\s](\S+)\.(\S+)\.(\S+[^;\s]+)', query, re.IGNORECASE)
    if match is None:
        return None
    else:
        database, schema, table = match.groups()
        return database, schema, table


def build_dynamic_table_name(table_name: str, dynamic_block_index: int = None) -> str:
    if dynamic_block_index is None:
        return table_name

    return f'{table_name}__dynamic_{dynamic_block_index}'


def create_upstream_block_tables(
    loader,
    block,
    cascade_on_drop: bool = False,
    configuration: Dict = None,
    execution_partition: str = None,
    cache_upstream_dbt_models: bool = False,
    cache_keys: List[str] = None,
    no_schema: bool = False,
    query: str = None,
    schema_name: str = None,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
    database: str = None,
    variables: Dict = None,
):
    if cache_keys is None:
        cache_keys = []
    configuration = configuration if configuration else block.configuration

    input_vars, kwargs_vars, upstream_block_uuids = block.fetch_input_variables(
        None,
        execution_partition=execution_partition,
        global_vars=None,
        dynamic_block_index=dynamic_block_index,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
    )

    mapping = blocks_in_query(block, query)
    for idx, upstream_block in enumerate(block.upstream_blocks):
        if query and upstream_block.uuid not in mapping:
            continue

        if should_cache_data_from_upstream(block, upstream_block, [
            'data_provider',
        ], cache_keys):
            if BlockType.DBT == upstream_block.type and not cache_upstream_dbt_models:
                continue

            if input_vars and idx < len(input_vars):
                df = input_vars[idx]
            else:
                df = get_variable(
                    upstream_block.pipeline.uuid,
                    upstream_block.uuid,
                    'output_0',
                    partition=execution_partition,
                )

            no_data = False
            if type(df) is DataFrame:
                if len(df.index) == 0:
                    no_data = True
            elif type(df) is dict and len(df) == 0:
                no_data = True
            elif type(df) is list and len(df) == 0:
                no_data = True
            elif not df:
                no_data = True

            if no_data:
                print(f'\n\nNo data in upstream block {upstream_block.uuid}.')
                continue

            _, schema, table_name = table_name_parts(
                configuration,
                upstream_block,
                no_schema=no_schema,
                dynamic_block_index=dynamic_block_index,
            )

            if not schema and not no_schema:
                schema = schema_name

            full_table_name = '.'.join(list(filter(lambda x: x, [
                schema,
                table_name,
            ])))

            print(f'\n\nExporting data from upstream block {upstream_block.uuid} '
                  f'to {full_table_name}.')

            kwargs = dict(
                table_name=table_name,
                schema_name=schema,
                cascade_on_drop=cascade_on_drop,
                drop_table_on_replace=True,
                if_exists='replace',
                index=False,
                verbose=False,
            )
            if database:
                kwargs['database'] = database

            loader.export(df, **kwargs)


def extract_and_replace_text_between_strings(
    text: str,
    start_string: str,
    end_string: str = None,
    replace_string: str = '',
    case_sensitive: bool = True,
) -> Tuple[str, str]:
    start_match = re.search(start_string, text, re.NOFLAG if not case_sensitive else re.IGNORECASE)
    if end_string:
        end_match = re.search(end_string, text, re.NOFLAG if not case_sensitive else re.IGNORECASE)
    else:
        end_match = None

    if not start_match or (end_string and not end_match):
        return None, text

    start_idx = start_match.span()[0]
    if end_string and end_match:
        end_idx = end_match.span()[1]

    extracted_text = text[start_idx:end_idx]

    new_text = text[0:max(start_idx - 1, 0)] + replace_string + text[end_idx + 1:]

    return extracted_text, new_text


def remove_comments(text: str) -> str:
    lines = text.split('\n')
    return '\n'.join(line for line in lines if not line.startswith('--'))


def extract_create_statement_table_name(text: str) -> str:
    create_table_pattern = r'create table(?: if not exists)*'

    statement_partial, _ = extract_and_replace_text_between_strings(
        remove_comments(text),
        create_table_pattern,
        r'\(',
    )
    if not statement_partial:
        return None

    match1 = re.match(create_table_pattern, statement_partial, re.IGNORECASE)
    if match1:
        idx_start, idx_end = match1.span()
        new_statement = statement_partial[0:idx_start] + statement_partial[idx_end:]
        match2 = re.search(r'[^\s]+', new_statement.strip())
        if match2:
            return match2.group(0)

    parts = statement_partial[:len(statement_partial) - 1].strip().split(' ')
    return parts[-1]


def extract_insert_statement_table_names(text: str) -> List[str]:
    matches = re.findall(
        r'insert(?: overwrite)*(?: into)*[\s]+([\w.]+)',
        remove_comments(text),
        re.IGNORECASE,
    )
    return matches


def extract_drop_statement_table_names(text: str) -> List[str]:
    matches = re.findall(
        r'\bdrop\s+table(?:\s+if\s+exists)?\s+([\w.]+)',
        remove_comments(text),
        re.IGNORECASE,
    )
    return matches


def extract_update_statement_table_names(text: str) -> List[str]:
    matches = re.findall(
        r'\bupdate\b\s+([\w.]+)\s+(?:as\s+\w+\s+)?set\s+[\s\S]*?\bwhere\b',
        remove_comments(text),
        re.IGNORECASE,
    )
    return matches


def has_create_or_insert_statement(text: str) -> bool:
    table_name = extract_create_statement_table_name(text)
    if table_name:
        return True

    matches = extract_insert_statement_table_names(text)
    return len(matches) >= 1


def has_drop_statement(text: str) -> bool:
    matches = extract_drop_statement_table_names(text)
    return len(matches) >= 1


def has_update_statement(text: str) -> bool:
    matches = extract_update_statement_table_names(text)
    return len(matches) >= 1


def split_query_string(query_string: str) -> List[str]:
    text_parts = []

    matches = re.finditer(r"'(.*?)'|\"(.*?)\"", query_string, re.IGNORECASE)

    previous_idx = 0

    for _, match in enumerate(matches):
        matched_string = match.group()
        updated_string = re.sub(r';', MAGE_SEMI_COLON, matched_string)

        start_idx, end_idx = match.span()

        previous_chunk = query_string[previous_idx:start_idx]
        text_parts.append(previous_chunk)
        text_parts.append(updated_string)
        previous_idx = end_idx

    text_parts.append(query_string[previous_idx:])

    text_combined = ''.join(text_parts)
    queries = text_combined.split(';')

    arr = []
    for query in queries:
        query = query.strip()
        if not query:
            continue

        lines = query.split('\n')
        query = '\n'.join(list(filter(lambda x: not x.startswith('--'), lines)))
        query = query.strip()
        query = re.sub(MAGE_SEMI_COLON, ';', query)

        if query:
            arr.append(query)

    return arr
