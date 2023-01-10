from datetime import datetime


def encode_complex(obj):
    if hasattr(obj, 'isoformat') and type(obj.isoformat).__name__ == 'method':
        return obj.isoformat()
    elif isinstance(obj, datetime):
        return obj.isoformat()

    return obj
