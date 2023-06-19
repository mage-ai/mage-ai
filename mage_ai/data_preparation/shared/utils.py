import os
from typing import Callable, Dict

from mage_ai.data_preparation.shared.secrets import get_secret_value
from mage_ai.shared.hash import get_json_value


def get_template_vars() -> Dict[str, Callable]:
    kwargs = dict(
        env_var=os.getenv,
        json_value=get_json_value,
        mage_secret_var=get_secret_value,
    )

    try:
        from mage_ai.services.aws.secrets_manager.secrets_manager import get_secret
        kwargs['aws_secret_var'] = get_secret
    except ImportError:
        pass

    return kwargs
