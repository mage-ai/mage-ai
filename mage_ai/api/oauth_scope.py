from mage_ai.shared.enum import StrEnum


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
