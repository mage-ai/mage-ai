from mage_ai.authentication.oauth.constants import (
    BITBUCKET_HOST,
    OAUTH_PROVIDER_BITBUCKET,
    OAUTH_PROVIDER_GHE,
    OAUTH_PROVIDER_GITHUB,
    get_ghe_hostname,
)


def get_provider_from_remote_url(remote_url: str) -> str:
    ghe_hostname = get_ghe_hostname()

    if not remote_url:
        return OAUTH_PROVIDER_GITHUB

    if BITBUCKET_HOST and BITBUCKET_HOST in remote_url or 'bitbucket.org' in remote_url:
        return OAUTH_PROVIDER_BITBUCKET
    elif ghe_hostname and ghe_hostname in remote_url:
        return OAUTH_PROVIDER_GHE
    else:
        return OAUTH_PROVIDER_GITHUB
