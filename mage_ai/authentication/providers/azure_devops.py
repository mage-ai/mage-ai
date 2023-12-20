from mage_ai.authentication.oauth.constants import (
    AZURE_DEVOPS_INSTANCE,
    OAUTH_PROVIDER_AZURE_DEVOPS,
)
from mage_ai.authentication.providers.active_directory import ADProvider


class AzureDevopsProvider(ADProvider):
    provider = OAUTH_PROVIDER_AZURE_DEVOPS
    scope = 'vso.tokenadministration vso.code_write vso.profile'  # noqa: E501

    def __init__(self):
        super().__init__()
        if not AZURE_DEVOPS_INSTANCE:
            raise Exception(
                'Azure DevOps instance is empty. '
                'Make sure the AZURE_DEVOPS_INSTANCE environment variable is set.')
