import re
from functools import reduce
from typing import Any, Dict, List

from jinja2 import Template

from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.utils import get_variable_for_template


def hydrate_block_outputs(
    content: str,
    outputs_from_input_vars: Dict = None,
    upstream_block_uuids: List[str] = None,
    variables: Dict = None,
) -> str:
    def _block_output(
        block_uuid: str = None,
        parse: str = None,
        outputs_from_input_vars=outputs_from_input_vars,
        upstream_block_uuids=upstream_block_uuids,
        variables=variables,
    ) -> Any:
        data = outputs_from_input_vars

        if parse:
            if block_uuid:
                data = outputs_from_input_vars.get(block_uuid)
            elif upstream_block_uuids:
                def _build_positional_arguments(acc: List, upstream_block_uuid: str) -> List:
                    acc.append(outputs_from_input_vars.get(upstream_block_uuid))
                    return acc

                data = reduce(
                    _build_positional_arguments,
                    upstream_block_uuids,
                    [],
                )

            try:
                return parse(data, variables)
            except Exception as err:
                print(f'[WARNING] block_output: {err}')

        return data

    variable_pattern = r'{}[ ]*block_output[^{}]*[ ]*{}'.format(r'\{\{', r'\}\}', r'\}\}')

    match = 1
    while match is not None:
        match = None

        match = re.search(
            variable_pattern,
            content,
            re.IGNORECASE,
        )

        if not match:
            continue

        si, ei = match.span()
        substring = content[si:ei]

        match2 = re.match(
            r'{}([^{}{}]+){}'.format(r'\{\{', r'\{\{', r'\}\}', r'\}\}'),
            substring,
        )
        if match2:
            groups = match2.groups()
            if groups:
                function_string = groups[0].strip()
                results = dict(block_output=_block_output)
                exec(f'value_hydrated = {function_string}', results)

                value_hydrated = results['value_hydrated']
                content = f'{content[0:si]}{value_hydrated}{content[ei:]}'

    return Template(content).render(
        variables=lambda x, p=None, v=variables: get_variable_for_template(
            x,
            parse=p,
            variables=v,
        ),
        **get_template_vars(),
    )
