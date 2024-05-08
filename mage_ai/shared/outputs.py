import os
from typing import Any, Dict, Optional, Tuple

import joblib

from mage_ai.ai.utils.xgboost import load_model as load_model_xgboost
from mage_ai.ai.utils.xgboost import save_model as save_model_xgboost
from mage_ai.data_preparation.models.variables.constants import (
    JOBLIB_FILE, JOBLIB_OBJECT_FILE, UBJSON_MODEL_FILENAME, VariableType)
from mage_ai.shared.parsers import object_to_dict


def save_custom_object(
    data: Any,
    variable_path: str,
    variable_type: Optional[VariableType] = None,
) -> Tuple[Dict, Optional[str]]:
    is_object = False
    full_path = None

    if VariableType.MODEL_SKLEARN == variable_type:
        is_object = True
        os.makedirs(variable_path, exist_ok=True)
        full_path = os.path.join(variable_path, JOBLIB_FILE)
        joblib.dump(data, full_path)
    elif VariableType.MODEL_XGBOOST == variable_type:
        is_object = True
        os.makedirs(variable_path, exist_ok=True)
        full_path = os.path.join(variable_path, UBJSON_MODEL_FILENAME)
        save_model_xgboost(data, full_path)
    elif VariableType.CUSTOM_OBJECT == variable_type:
        is_object = True
        os.makedirs(variable_path, exist_ok=True)
        full_path = os.path.join(variable_path, JOBLIB_OBJECT_FILE)
        joblib.dump(data, full_path)
    elif VariableType.DICTIONARY_COMPLEX == variable_type:
        is_object = True
        pass

    if is_object:
        data = object_to_dict(data, variable_type=variable_type)

    return data, full_path


def load_custom_object(
    variable_path: str,
    variable_type: Optional[VariableType] = None,
) -> Optional[Any]:
    if VariableType.MODEL_SKLEARN == variable_type:
        return joblib.load(os.path.join(variable_path, JOBLIB_FILE))
    elif VariableType.MODEL_XGBOOST == variable_type:
        return load_model_xgboost(
            os.path.join(variable_path, UBJSON_MODEL_FILENAME),
            raise_exception=False,
        )
    elif VariableType.CUSTOM_OBJECT == variable_type:
        return joblib.load(os.path.join(variable_path, JOBLIB_OBJECT_FILE))
    elif VariableType.DICTIONARY_COMPLEX == variable_type:
        pass
