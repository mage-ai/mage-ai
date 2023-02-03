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
