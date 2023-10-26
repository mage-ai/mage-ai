from typing import Dict, List, Mapping, Union

from mage_ai.data_integrations.destinations.constants import DESTINATIONS
from mage_ai.data_integrations.sources.constants import SOURCES
from mage_ai.data_integrations.utils.settings import get_uuid
from mage_ai.data_preparation.models.constants import (
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.templates.data_integrations.constants import (
    DATA_INTEGRATION_TYPE_DESTINATIONS,
    DATA_INTEGRATION_TYPE_SOURCES,
    TEMPLATE_TYPE_DATA_INTEGRATION,
)
from mage_ai.data_preparation.templates.utils import template_env
from mage_ai.server.api.integration_sources import build_integration_module_info
from mage_ai.shared.strings import is_number


def get_templates(group_templates: bool = False) -> Union[List[Dict], Dict]:
    arr = []
    mapping = {}

    for items, block_type, di_type in [
        (SOURCES, BlockType.DATA_LOADER, DATA_INTEGRATION_TYPE_SOURCES),
        (DESTINATIONS, BlockType.DATA_EXPORTER, DATA_INTEGRATION_TYPE_DESTINATIONS),
    ]:
        for data_dict in items:
            display_name = data_dict.get('name')
            module_name = data_dict.get('module_name')
            uuid = data_dict.get('uuid')

            block_type_display = str(block_type.replace('_', ' '))
            description = \
                f'Data integration {block_type_display} block for {display_name} {di_type}'
            if module_name:
                description = f'{description} ({module_name}).'
            else:
                description = f'{description}.'

            template = dict(
                block_type=block_type,
                configuration=dict(data_integration={}),
                defaults=dict(
                    language=BlockLanguage.YAML,
                ),
                description=description,
                language=di_type,
                name=display_name,
                path=f'data_integrations/{di_type}/base',
                template_type=TEMPLATE_TYPE_DATA_INTEGRATION,
                template_variables=data_dict,
            )

            arr.append(template)

            if group_templates:
                uuid = get_uuid(data_dict)
                mapping[uuid] = template

    if group_templates:
        return mapping

    return arr


def render_template(
    block_type: Union[BlockType, str],
    config: Mapping[str, str],
    language: BlockLanguage = BlockLanguage.PYTHON,
    pipeline_type: PipelineType = PipelineType.PYTHON,
) -> str:
    template_variables = config.get('template_variables') or {}

    module_parent = DATA_INTEGRATION_TYPE_SOURCES
    if BlockType.DATA_EXPORTER == block_type:
        module_parent = DATA_INTEGRATION_TYPE_DESTINATIONS

    info = build_integration_module_info(module_parent, template_variables) or {}
    config_template = (info.get('templates') or {}).get('config')
    data_integration_uuid = info.get('uuid') or ''

    config_string = '',

    if language not in [BlockLanguage.PYTHON, BlockLanguage.YAML]:
        language = BlockLanguage.YAML

    if BlockLanguage.PYTHON == language:
        config_string_parts = [
            '    return {',
        ]
        for key, value in config_template.items():
            value_use = value
            if value_use is None or len(str(value_use)) == 0:
                value_use = "''"
            elif not is_number(value_use):
                value_use = f"'{value_use}'"

            config_string_parts.append(f"        '{key}': {value_use},")
        config_string_parts.append('    }')
        config_string = '\n'.join(config_string_parts)

        data_integration_uuid = f"'{data_integration_uuid}'"
    elif BlockLanguage.YAML == language:
        config_string_parts = []
        for key, value in config_template.items():
            value_use = value
            if not value_use or not is_number(value_use):
                value_use = 'null'

            config_string_parts.append(f'  {key}: {value_use}')
        config_string = '\n'.join(config_string_parts)

    template_path_with_extension = '.'.join([
        config['template_path'],
        BLOCK_LANGUAGE_TO_FILE_EXTENSION[language],
    ])

    return (
        template_env.get_template(template_path_with_extension).render(
            config=config_string,
            data_integration_uuid=data_integration_uuid,
        )
    )
