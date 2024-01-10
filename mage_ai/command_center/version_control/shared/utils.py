from typing import Dict

from mage_ai.command_center.constants import ValidationType


def add_validate_output_error_fatal(item_dict: Dict) -> Dict:
    action_uuid = item_dict['actions'][0]['uuid']

    item_dict['actions'][1]['validations'] = [ValidationType.CUSTOM_VALIDATION_PARSERS]
    item_dict['actions'][1]['validation_parsers'] = [
        dict(
            positional_argument_names=[
                'item',
                'action',
                'applicationState',
                'results',
            ],
            function_body="""
return !results?.{}?.version_control_branch?.output?.some?.(
  line => line?.trim()?.startsWith('error') || line?.trim()?.startsWith('fatal')
  || line?.trim()?.startsWith('stderror')
);
""".format(action_uuid),
        ),
    ]

    return item_dict
