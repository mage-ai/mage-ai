from typing import Dict, Optional

from mage_ai.shared.array import find


def get_bearer_auth_token_from_headers(headers: Dict) -> Optional[str]:
    """
    Args:
        headers (Dict): Headers from the request

    Returns:
        Optional[str]: The bearer token from the headers if it exists
    """
    if headers is None:
        return None
    token_from_header = headers.get('Authorization')
    if token_from_header:
        tokens = token_from_header.split(',')
        token_from_header = find(lambda x: 'bearer' in x.lower(), tokens)
        if token_from_header:
            token_from_header = (
                token_from_header.
                replace('Bearer ', '').
                replace('bearer ', '')
            )
        else:
            token_from_header = None
    return token_from_header
