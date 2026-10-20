from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.providers.active_directory import ADProvider
from mage_ai.authentication.providers.azure_devops import AzureDevopsProvider
from mage_ai.authentication.providers.bitbucket import BitbucketProvider
from mage_ai.authentication.providers.ghe import GHEProvider
from mage_ai.authentication.providers.gitlab import GitlabProvider
from mage_ai.authentication.providers.google import GoogleProvider
from mage_ai.authentication.providers.oidc import OidcProvider
from mage_ai.authentication.providers.okta import OktaProvider

NAME_TO_PROVIDER = {
    ProviderName.ACTIVE_DIRECTORY: ADProvider,
    ProviderName.AZURE_DEVOPS: AzureDevopsProvider,
    ProviderName.BITBUCKET: BitbucketProvider,
    ProviderName.GHE: GHEProvider,
    ProviderName.GITLAB: GitlabProvider,
    ProviderName.GOOGLE: GoogleProvider,
    ProviderName.OIDC_GENERIC: OidcProvider,
    ProviderName.OKTA: OktaProvider,
}
