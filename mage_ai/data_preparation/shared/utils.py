import os
from typing import Callable, Dict

from mage_ai.shared.hash import get_json_value, merge_dict


def get_template_vars(include_python_libraries: Dict = None) -> Dict[str, Callable]:
    from mage_ai.data_preparation.shared.secrets import get_secret_value
    no_db_kwargs = get_template_vars_no_db(include_python_libraries=include_python_libraries)

    kwargs = dict(mage_secret_var=get_secret_value)

    return merge_dict(no_db_kwargs, kwargs)


def get_template_vars_no_db(include_python_libraries: Dict = None) -> Dict[str, Callable]:
    kwargs = dict(
        env_var=os.getenv,
        json_value=get_json_value,
    )

    if include_python_libraries:
        kwargs.update(include_python_libraries)

    try:
        from mage_ai.services.aws.secrets_manager.secrets_manager import get_secret
        kwargs['aws_secret_var'] = get_secret
    except Exception:
        pass

    try:
        from mage_ai.services.azure.key_vault.key_vault import get_secret
        kwargs['azure_secret_var'] = get_secret
    except Exception:
        pass

    return kwargs
