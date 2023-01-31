from datetime import datetime
import uuid


def encode_complex(obj):
    if hasattr(obj, 'isoformat') and 'method' in type(obj.isoformat).__name__:
        return obj.isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif type(obj) is uuid.UUID:
        return str(obj)

    return obj
