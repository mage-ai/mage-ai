import base64
import uuid
from datetime import datetime, timedelta
from typing import Any, Callable, Union, Dict, List


def process_data(
        data: Union[Dict[str, Any], List[Any], bytes, Any],
) -> Union[Dict[str, Any], List[Any], Any]:
    """Recursively processes the input data based on its type.

    If the input data is a dictionary, recursively processes each key and value.
    If the input data is a list, recursively processes each item in the list.
    If the input data is bytes, applies the `encode_complex_obj` function.
    Otherwise, returns the data unchanged.

    Args:
        data: Input data which can be a dictionary, list, bytes, or any other type.

    Returns:
        The processed data of the same type as the input data.
    """

    def process_bytes(obj: Any) -> Any:
        """Encodes the input object to base64 if it is a bytes object.

        If the input object is a bytes object, encodes it to base64 and returns a string.

        Args:
            obj: The input object which can be a bytes object or any other type.

        Returns:
            The input object encoded to base64 if it is a bytes object,
            otherwise returns the input object unchanged.

        """

        return base64.b64encode(obj).decode("utf-8", errors="replace")

    def process_dict(d: Dict[str, Any]) -> Dict[str, Any]:
        return {key: process_data(value) for key, value in d.items()}

    def process_list(lst: List[Any]) -> List[Any]:
        return [process_data(item) for item in lst]

    def process_datatime(dt: datetime) -> str:
        return dt.isoformat()

    type_handlers: Dict[type, Callable[[Any], Any]] = {
        dict: process_dict,
        list: process_list,
        bytes: process_bytes,
        datetime: process_datatime,
    }

    for data_type, handler in type_handlers.items():
        if isinstance(data, data_type):
            return handler(data)

    return data


def encode_complex(obj):
    if hasattr(obj, 'isoformat') and 'method' in type(obj.isoformat).__name__:
        return obj.isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, timedelta):
        # Used to encode the TIME type from the source DB
        return str(obj)
    elif type(obj) is uuid.UUID:
        return str(obj)

    return obj
