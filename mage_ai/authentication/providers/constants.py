from mage_ai.authentication.oauth.constants import (
    OAUTH_PROVIDER_ACTIVE_DIRECTORY,
    OAUTH_PROVIDER_GHE,
    OAUTH_PROVIDER_GOOGLE,
    OAUTH_PROVIDER_OKTA,
)
from mage_ai.authentication.providers.active_directory import ADProvider
from mage_ai.authentication.providers.ghe import GHEProvider
from mage_ai.authentication.providers.google import GoogleProvider
from mage_ai.authentication.providers.okta import OktaProvider

NAME_TO_PROVIDER = {
    OAUTH_PROVIDER_ACTIVE_DIRECTORY: ADProvider,
    OAUTH_PROVIDER_GHE: GHEProvider,
    OAUTH_PROVIDER_GOOGLE: GoogleProvider,
    OAUTH_PROVIDER_OKTA: OktaProvider,
}
