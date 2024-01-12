import uuid
from datetime import datetime, timedelta


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
