import os
from typing import Optional

ACTIVE_DIRECTORY_CLIENT_ID = '51aec820-9d49-40a9-b046-17c1f28f620d'

GITHUB_CLIENT_ID = '8577f13ddc81e2848b07'
GITHUB_STATE = '1337'

OAUTH_PROVIDER_ACTIVE_DIRECTORY = 'active_directory'
OAUTH_PROVIDER_GITHUB = 'github'
OAUTH_PROVIDER_GHE = 'ghe'
OAUTH_PROVIDER_GOOGLE = 'google'
OAUTH_PROVIDER_OKTA = 'okta'

GHE_CLIENT_ID_ENV_VAR = 'GHE_CLIENT_ID'
GHE_CLIENT_SECRET_ENV_VAR = 'GHE_CLIENT_SECRET'
GHE_HOSTNAME_ENV_VAR = 'GHE_HOSTNAME'

DEFAULT_GITHUB_HOSTNAME = 'https://github.com'

VALID_OAUTH_PROVIDERS = [
    OAUTH_PROVIDER_ACTIVE_DIRECTORY,
    OAUTH_PROVIDER_GHE,
    OAUTH_PROVIDER_GITHUB,
    OAUTH_PROVIDER_GOOGLE,
    OAUTH_PROVIDER_OKTA,
]


def get_ghe_hostname() -> Optional[str]:
    ghe_hostname = os.getenv(GHE_HOSTNAME_ENV_VAR)
    if ghe_hostname and not ghe_hostname.startswith('http'):
        ghe_hostname = f'https://{ghe_hostname}'

    return ghe_hostname
