from urllib.parse import unquote, urlparse

from mage_ai.settings import ROUTES_BASE_PATH


def get_base_url(url: str) -> str:
    parsed_url = urlparse(unquote(url))
    base_url = parsed_url.scheme + '://' + parsed_url.netloc
    if ROUTES_BASE_PATH:
        base_url += f'/{ROUTES_BASE_PATH}'

    return base_url
