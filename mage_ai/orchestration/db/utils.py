from typing import Optional, Tuple


def get_user_info_from_db_connection_url(
    url: str,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Attempt to parse db connection url to get username and password. urllib.parse
    does not work for all cases.

    Args:
        url (str): db connection url usually in the form of
            "scheme://username:password@host:port/dbname?options"

    Returns:
        Tuple[str, str]: tuple of username, password
    """
    try:
        prefix = '@'.join(url.split('@')[0:-1])
        user_info = prefix.split('://', 1)[1]
        return user_info.split(':', 1)
    except Exception:
        return None, None
