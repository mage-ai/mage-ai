from mage_ai.authentication.oauth.constants import (
    BITBUCKET_HOST,
    ProviderName,
    get_ghe_hostname,
)


def get_provider_from_remote_url(remote_url: str) -> str:
    ghe_hostname = get_ghe_hostname()

    if not remote_url:
        return ProviderName.GITHUB

    if BITBUCKET_HOST and BITBUCKET_HOST in remote_url or 'bitbucket.org' in remote_url:
        return ProviderName.BITBUCKET
    elif ghe_hostname and ghe_hostname in remote_url:
        return ProviderName.GHE
    else:
        return ProviderName.GITHUB
