import datetime
import json
import math
import re
from functools import reduce
from typing import Any, Dict, List

import inflection
import pandas as pd
from jinja2 import Template

from mage_ai.data_preparation.shared.utils import (
    get_template_vars,
    get_template_vars_no_db,
)
from mage_ai.data_preparation.templates.utils import get_variable_for_template
from mage_ai.shared.hash import merge_dict


def hydrate_block_outputs(
    content: str,
    outputs_from_input_vars: Dict = None,
    upstream_block_uuids: List[str] = None,
    variables: Dict = None,
) -> str:
    include_python_libraries = dict(
        datetime=datetime,
        inflection=inflection,
        json=json,
        math=math,
    )

    def _block_output(
        block_uuid: str = None,
        parse: str = None,
        outputs_from_input_vars=outputs_from_input_vars,
        include_python_libraries=include_python_libraries,
        upstream_block_uuids=upstream_block_uuids,
        variables=variables,
    ) -> Any:
        data = outputs_from_input_vars

        if parse:
            if block_uuid:
                data = outputs_from_input_vars.get(block_uuid)
            elif upstream_block_uuids:
                def _build_positional_arguments(acc: List, upstream_block_uuid: str) -> List:
                    results = outputs_from_input_vars.get(upstream_block_uuid)
                    if isinstance(results, pd.DataFrame):
                        results = results.to_dict(orient='records')
                    acc.append(results)

                    return acc

                data = reduce(
                    _build_positional_arguments,
                    upstream_block_uuids,
                    [],
                )

            try:
                return parse(data, variables)
            except Exception as err:
                print(f'[ERROR] Parsing block_output function: {err}')

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
                results = merge_dict(get_template_vars_no_db(
                    include_python_libraries=include_python_libraries,
                ), dict(
                    block_output=_block_output,
                ))
                exec(f'value_hydrated = {function_string}', results)

                value_hydrated = results['value_hydrated']
                content = f'{content[0:si]}{value_hydrated}{content[ei:]}'

    return Template(content).render(
        variables=lambda x, p=None, v=variables: get_variable_for_template(
            x,
            parse=p,
            variables=v,
        ),
        **get_template_vars(include_python_libraries=include_python_libraries),
    )
