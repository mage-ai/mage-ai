import json
from typing import Mapping, Union

from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.templates.data_integrations.utils import (
    TEMPLATE_TYPE_DATA_INTEGRATION,
    render_template,
)
from mage_ai.data_preparation.templates.utils import (
    read_template_file,
    template_env,
    template_exists,
    write_template,
)
from mage_ai.io.base import DataSource


MAP_DATASOURCE_TO_HANDLER = {
    DataSource.BIGQUERY: 'BigQuery',
    DataSource.POSTGRES: 'Postgres',
    DataSource.REDSHIFT: 'Redshift',
    DataSource.SNOWFLAKE: 'Snowflake',
}


def build_template_from_suggestion(suggestion: Mapping) -> str:
    """
    Creates a file template from a suggestion.

    Args:
        suggestion (Mapping): Suggestion payload generated from `BaseRule`.

    Returns:
        str: String version of Python code to execute to run this cleaning suggestion.
    """
    clean_title = suggestion['title'].lower().replace(' ', '_')
    cleaned_payload = json.dumps(suggestion['action_payload'], indent=4)
    cleaned_payload = cleaned_payload.replace('\n', '\n    ')
    template = read_template_file('transformers/suggestion_fmt.jinja')
    return (
        template.render(
            title=clean_title,
            message=suggestion['message'],
            payload=cleaned_payload,
        )
        + "\n"
    )


def fetch_template_source(
    block_type: Union[BlockType, str],
    config: Mapping[str, str],
    language: BlockLanguage = BlockLanguage.PYTHON,
    pipeline_type: PipelineType = PipelineType.PYTHON,
) -> str:
    template_source = ''

    if language not in [BlockLanguage.PYTHON, BlockLanguage.R, BlockLanguage.YAML]:
        return template_source

    if 'template_path' in config:
        if TEMPLATE_TYPE_DATA_INTEGRATION == config.get('template_type'):
            return render_template(
                block_type=block_type,
                config=config,
                language=language,
                pipeline_type=pipeline_type,
            )

        template_variables_to_render = dict(
            code=config.get('existing_code', ''),
        )

        template_variables = config.get('template_variables')
        if template_variables:
            template_variables_to_render.update(template_variables)

        return (
            template_env.get_template(config['template_path']).render(
                **template_variables_to_render,
            )
        )
    elif block_type == BlockType.DATA_LOADER:
        template_source = __fetch_data_loader_templates(
            config,
            language=language,
            pipeline_type=pipeline_type,
        )
    elif block_type == BlockType.TRANSFORMER:
        template_source = __fetch_transformer_templates(
            config,
            language=language,
            pipeline_type=pipeline_type,
        )
    elif block_type == BlockType.DATA_EXPORTER:
        template_source = __fetch_data_exporter_templates(
            config,
            language=language,
            pipeline_type=pipeline_type,
        )
    elif block_type == BlockType.SENSOR:
        template_source = __fetch_sensor_templates(config)
    elif block_type == BlockType.CUSTOM:
        template_source = __fetch_custom_templates(
            config,
            language=language,
        )
    elif block_type == BlockType.CALLBACK:
        template_source = __fetch_callback_templates()
    elif block_type == BlockType.CONDITIONAL:
        template_source = __fetch_conditional_templates()

    return template_source


def load_template(
    block_type: Union[BlockType, str],
    config: Mapping[str, str],
    dest_path: str,
    language: BlockLanguage = BlockLanguage.PYTHON,
    pipeline_type: PipelineType = PipelineType.PYTHON,
) -> None:
    template_source = fetch_template_source(
        block_type,
        config,
        language=language,
        pipeline_type=pipeline_type,
    )
    write_template(template_source, dest_path)


def __fetch_data_loader_templates(
    config: Mapping[str, str],
    language: BlockLanguage = BlockLanguage.PYTHON,
    pipeline_type: PipelineType = PipelineType.PYTHON,
) -> str:
    data_source = config.get('data_source')
    default_template_name = None
    file_extension = 'py'
    if pipeline_type == PipelineType.PYSPARK:
        template_folder = 'data_loaders/pyspark'
    elif pipeline_type == PipelineType.STREAMING:
        template_folder = 'data_loaders/streaming'
        if language == BlockLanguage.YAML:
            file_extension = 'yaml'
        else:
            default_template_name = 'generic_python.py'
    elif language == BlockLanguage.R:
        template_folder = 'data_loaders/r'
        file_extension = 'r'
    else:
        template_folder = 'data_loaders'

    default_template = template_folder + '/' + (default_template_name or 'default.jinja')
    if data_source is None:
        template_path = default_template
    else:
        data_source_template = template_folder + '/' + f'{data_source.lower()}.{file_extension}'
        if template_exists(data_source_template):
            template_path = data_source_template
        else:
            template_path = default_template
    return (
        template_env.get_template(template_path).render(
            code=config.get('existing_code', ''),
        )
        + '\n'
    )


def __fetch_transformer_templates(
    config: Mapping[str, str],
    language: BlockLanguage = BlockLanguage.PYTHON,
    pipeline_type: PipelineType = PipelineType.PYTHON,
) -> str:
    action_type = config.get('action_type')
    axis = config.get('axis')
    data_source = config.get('data_source')
    existing_code = config.get('existing_code', '')
    suggested_action = config.get('suggested_action')

    if suggested_action:
        return build_template_from_suggestion(suggested_action)

    if data_source is not None:
        return __fetch_transformer_data_warehouse_template(data_source)
    elif action_type is not None and axis is not None:
        return __fetch_transformer_action_template(action_type, axis, existing_code)
    else:
        if pipeline_type == PipelineType.PYSPARK:
            template_path = 'transformers/default_pyspark.jinja'
        elif pipeline_type == PipelineType.STREAMING:
            template_path = 'transformers/default_streaming.jinja'
        elif language == BlockLanguage.R:
            template_path = 'transformers/r/default.r'
        else:
            template_path = 'transformers/default.jinja'
        return (
            template_env.get_template(template_path).render(
                code=existing_code,
            )
            + '\n'
        )


def is_default_transformer_template(
    config: Mapping[str, str],
) -> bool:
    action_type = config.get('action_type')
    axis = config.get('axis')
    data_source = config.get('data_source')
    if data_source is not None:
        return False
    elif action_type is not None and axis is not None:
        return False
    else:
        return True


def __fetch_transformer_data_warehouse_template(data_source: DataSource):
    template = template_env.get_template('transformers/data_warehouse_transformer.jinja')
    data_source_handler = MAP_DATASOURCE_TO_HANDLER.get(data_source)
    if data_source_handler is None:
        raise ValueError(f'No associated database/warehouse for data source \'{data_source}\'')

    if data_source != DataSource.BIGQUERY:
        additional_args = '\n        loader.commit() # Permanently apply database changes'
    else:
        additional_args = ''

    return (
        template.render(
            additional_args=additional_args,
            data_source=data_source if type(data_source) is str else data_source.value,
            data_source_handler=data_source_handler,
        )
        + '\n'
    )


def __fetch_transformer_action_template(action_type: ActionType, axis: Axis, existing_code: str):
    try:
        template = template_env.get_template(
            f'transformers/transformer_actions/{axis}/{action_type}.py'
        )
    except FileNotFoundError:
        template = template_env.get_template('transformers/default.jinja')
    return template.render(code=existing_code) + '\n'


def fetch_transformer_default_template(existing_code: str):
    template = template_env.get_template('transformers/default.jinja')
    return template.render(code=existing_code) + '\n'


def __fetch_data_exporter_templates(
    config: Mapping[str, str],
    language: BlockLanguage = BlockLanguage.PYTHON,
    pipeline_type: PipelineType = PipelineType.PYTHON,
) -> str:
    data_source = config.get('data_source')
    file_extension = 'py'
    if pipeline_type == PipelineType.PYSPARK:
        template_folder = 'data_exporters/pyspark'
    elif pipeline_type == PipelineType.STREAMING:
        template_folder = 'data_exporters/streaming'
        file_extension = 'yaml'
    elif language == BlockLanguage.R:
        template_folder = 'data_exporters/r'
        file_extension = 'r'
    else:
        template_folder = 'data_exporters'

    default_template = template_folder + '/' + 'default.jinja'
    if data_source is None:
        template_path = default_template
    else:
        data_source_template = template_folder + '/' + f'{data_source.lower()}.{file_extension}'
        if template_exists(data_source_template):
            template_path = data_source_template
        else:
            template_path = default_template

    return (
        template_env.get_template(template_path).render(
            code=config.get('existing_code', ''),
        )
        + '\n'
    )


def __fetch_sensor_templates(config: Mapping[str, str]) -> str:
    data_source = config.get('data_source')
    try:
        _ = DataSource(data_source)
        template_path = f'sensors/{data_source.lower()}.py'
    except ValueError:
        template_path = 'sensors/default.py'

    return (
        template_env.get_template(template_path).render(
            code=config.get('existing_code', ''),
        )
        + '\n'
    )


def __fetch_custom_templates(
    config: Mapping[str, str],
    language: BlockLanguage = BlockLanguage.PYTHON,
) -> str:
    if language != BlockLanguage.PYTHON:
        return ''
    template_path = 'custom/python/default.jinja'
    return (
        template_env.get_template(template_path).render(
            code=config.get('existing_code', ''),
        )
        + '\n'
    )


def __fetch_callback_templates() -> str:
    template_path = 'callbacks/default.py'
    return (
        template_env.get_template(template_path).render()
        + '\n'
    )


def __fetch_conditional_templates() -> str:
    template_path = 'conditionals/base.jinja'
    return (
        template_env.get_template(template_path).render()
        + '\n'
    )
