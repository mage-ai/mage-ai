from datetime import datetime


def encode_complex(obj):
    if hasattr(obj, 'isoformat') and 'method' in type(obj.isoformat).__name__:
        return obj.isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()

    return obj
