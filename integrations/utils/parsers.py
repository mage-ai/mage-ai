from datetime import datetime


def encode_complex(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()

    return obj
