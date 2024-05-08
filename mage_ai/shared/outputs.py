from typing import Any, Dict, List, Optional, Tuple, Union

from pandas import DataFrame
from sklearn.utils import estimator_html_repr

from mage_ai.data_preparation.models.utils import infer_variable_type, serialize_complex
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.shared.parsers import convert_matrix_to_dataframe


def prepare_data_for_output(
    data: Any,
    single_item_only: bool = False,
) -> Tuple[
    Union[DataFrame, Dict, str, List[Union[DataFrame, Dict, str]]],
    Optional[VariableType],
]:
    variable_type, basic_iterable = infer_variable_type(data)

    if single_item_only and basic_iterable and len(data) >= 1:
        data = data[0]

    if VariableType.SERIES_PANDAS == variable_type:
        if basic_iterable:
            data = DataFrame(data).T
        else:
            data = data.to_frame()
    elif VariableType.MATRIX_SPARSE == variable_type:
        if basic_iterable:
            data = convert_matrix_to_dataframe(data[0])
        else:
            data = convert_matrix_to_dataframe(data)
    elif VariableType.MODEL_SKLEARN == variable_type:
        if basic_iterable:
            data = [estimator_html_repr(d) for d in data]
        else:
            data = estimator_html_repr(data)
    elif VariableType.MODEL_XGBOOST == variable_type:
        if basic_iterable:
            data = [str(d) for d in data]
        else:
            data = str(data)
    elif VariableType.DICTIONARY_COMPLEX == variable_type:
        if basic_iterable:
            data = [serialize_complex(d) for d in data]
        else:
            data = serialize_complex(data)
    else:
        variable_type = None

    return data, variable_type
