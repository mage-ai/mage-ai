try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover


class OauthScope():
    SCOPE_DELIMITER = ','

    CLIENT_ALL = 'all'
    CLIENT_INTERNAL = 'internal'
    CLIENT_PRIVATE = 'private'
    CLIENT_PUBLIC = 'public'

    CLIENT_SCOPES = [
        CLIENT_INTERNAL,
        CLIENT_PRIVATE,
        CLIENT_PUBLIC,
    ]

    TOKEN_SCOPES = []


class OauthScopeType(StrEnum):
    CLIENT_ALL = 'all'
    CLIENT_INTERNAL = 'internal'
    CLIENT_PRIVATE = 'private'
    CLIENT_PUBLIC = 'public'
