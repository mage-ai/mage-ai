from typing import Dict

from jinja2 import Template

from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.utils import get_variable_for_template


def interpolate_content(content: str, variables: Dict = None) -> Dict:
    return Template(content).render(
        variables=lambda x, p=None, v=variables: get_variable_for_template(
            x,
            parse=p,
            variables=v,
        ),
        **get_template_vars(),
    )
