import os
from typing import Any, Dict, Optional, Tuple

import joblib

from mage_ai.ai.utils.xgboost import load_model as load_model_xgboost
from mage_ai.ai.utils.xgboost import save_model as save_model_xgboost

# MATRIX_NPZ_FILE, MATRIX_SAMPLE_NPZ_FILE
from mage_ai.data_preparation.models.variables.constants import (
    CONFIG_JSON_FILE,
    JOBLIB_FILE,
    JOBLIB_OBJECT_FILE,
    MEDIA_IMAGE_VISUALIZATION_FILE,
    UBJSON_MODEL_FILENAME,
    VariableType,
)
from mage_ai.shared.array import is_iterable
from mage_ai.shared.parsers import object_to_dict

# from scipy.sparse import load_npz, save_npz


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

        save_model_xgboost(
            data,
            model_dir=variable_path,
            model_filename=UBJSON_MODEL_FILENAME,
            config_filename=CONFIG_JSON_FILE,
            image_filename=MEDIA_IMAGE_VISUALIZATION_FILE,
        )
    # elif VariableType.MATRIX_SPARSE == variable_type:
    #     save_npz(os.path.join(variable_path, MATRIX_NPZ_FILE), data)
    elif VariableType.CUSTOM_OBJECT == variable_type:
        is_object = True
        os.makedirs(variable_path, exist_ok=True)

        if not is_iterable(data):
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
    try:
        if VariableType.MODEL_SKLEARN == variable_type:
            return joblib.load(os.path.join(variable_path, JOBLIB_FILE))
        elif VariableType.MODEL_XGBOOST == variable_type:
            return load_model_xgboost(
                model_dir=variable_path,
                model_filename=UBJSON_MODEL_FILENAME,
                config_filename=CONFIG_JSON_FILE,
                raise_exception=False,
            )
        # elif VariableType.MATRIX_SPARSE == variable_type:
        #     return load_npz(os.path.join(variable_path, MATRIX_NPZ_FILE))
        elif VariableType.CUSTOM_OBJECT == variable_type:
            return joblib.load(os.path.join(variable_path, JOBLIB_OBJECT_FILE))
        elif VariableType.DICTIONARY_COMPLEX == variable_type:
            pass
    except Exception as e:
        print(f'Error loading {variable_type} at {variable_path}: {e}')
