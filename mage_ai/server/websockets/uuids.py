import re
from typing import Dict

MSG_ID_REGEX = re.compile(r'_[\d]+_[\d]+$')


def generalize_msg_id(msg_id: str) -> str:
    return MSG_ID_REGEX.sub('', msg_id)


def contains_msg_id(mapping: Dict[str, str], msg_id: str) -> bool:
    if not mapping:
        return False

    # msg_id = 'f59e1913-80fc7db2b112bfbdc12e21b3_1_1'
    msg_ids = [generalize_msg_id(m) for m in mapping.keys()]
    return generalize_msg_id(msg_id) in msg_ids
