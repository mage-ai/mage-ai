import os
from enum import Enum
from typing import Optional

ACTIVE_DIRECTORY_CLIENT_ID = '51aec820-9d49-40a9-b046-17c1f28f620d'

GITHUB_CLIENT_ID = '8577f13ddc81e2848b07'
GITHUB_STATE = '1337'


class ProviderName(str, Enum):
    ACTIVE_DIRECTORY = 'active_directory'
    BITBUCKET = 'bitbucket'
    GITHUB = 'github'
    GITLAB = 'gitlab'
    GHE = 'ghe'
    GOOGLE = 'google'
    OKTA = 'okta'


VALID_OAUTH_PROVIDERS = [e.value for e in ProviderName]

GHE_CLIENT_ID_ENV_VAR = 'GHE_CLIENT_ID'
GHE_CLIENT_SECRET_ENV_VAR = 'GHE_CLIENT_SECRET'
GHE_HOSTNAME_ENV_VAR = 'GHE_HOSTNAME'

GITLAB_HOST = os.getenv('GITLAB_HOST')
GITLAB_CLIENT_ID = os.getenv('GITLAB_CLIENT_ID')
GITLAB_CLIENT_SECRET = os.getenv('GITLAB_CLIENT_SECRET')

BITBUCKET_HOST = os.getenv('BITBUCKET_HOST')
BITBUCKET_OAUTH_KEY = os.getenv('BITBUCKET_OAUTH_KEY')
BITBUCKET_OAUTH_SECRET = os.getenv('BITBUCKET_OAUTH_SECRET')

DEFAULT_GITHUB_HOSTNAME = 'https://github.com'

GIT_OAUTH_PROVIDERS = [
    ProviderName.BITBUCKET,
    ProviderName.GITLAB,
]


def get_ghe_hostname() -> Optional[str]:
    ghe_hostname = os.getenv(GHE_HOSTNAME_ENV_VAR)
    if ghe_hostname and not ghe_hostname.startswith('http'):
        ghe_hostname = f'https://{ghe_hostname}'

    return ghe_hostname
