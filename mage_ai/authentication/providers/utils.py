from urllib.parse import unquote, urlparse

from mage_ai.settings import REQUESTS_BASE_PATH


def get_base_url(url: str) -> str:
    parsed_url = urlparse(unquote(url))
    base_url = parsed_url.scheme + '://' + parsed_url.netloc
    if REQUESTS_BASE_PATH:
        base_url += f'/{REQUESTS_BASE_PATH}'

    return base_url
