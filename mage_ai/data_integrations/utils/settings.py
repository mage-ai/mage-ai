from typing import Dict


def get_uuid(option: Dict) -> str:
    if option.get('uuid'):
        return option.get('uuid')

    return option['name'].lower().replace(' ', '_')
