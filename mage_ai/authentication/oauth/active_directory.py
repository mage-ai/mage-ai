from typing import Dict

import requests


def get_user_info(token: str) -> Dict:
    url = 'https://graph.microsoft.com/v1.0/me'

    headers = {
        'Content-Type': 'application\\json',
        'Authorization': 'Bearer {}'.format(token)
    }

    resp = requests.get(url, headers=headers)
    result = resp.json()

    return result
