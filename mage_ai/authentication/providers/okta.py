from urllib.parse import unquote, urlparse

from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.providers.oidc import OidcProvider
from mage_ai.settings import get_settings_value
from mage_ai.settings.keys import OKTA_CLIENT_ID, OKTA_CLIENT_SECRET, OKTA_DOMAIN_URL


class OktaProvider(
    OidcProvider
):  # Okta configuration uses OIDC so we can just subclass the OidcProvider
    provider = ProviderName.OKTA

    def __init__(self):
        self.hostname = get_settings_value(OKTA_DOMAIN_URL)
        self.client_id = get_settings_value(OKTA_CLIENT_ID)
        self.client_secret = get_settings_value(OKTA_CLIENT_SECRET)
        self.parsed_url = urlparse(unquote(self.hostname))
        if not self.parsed_url.scheme:
            self.parsed_url = urlparse(unquote(f'https://{self.hostname}'))
        self.__validate()

        self.discovery_url = (
            f'https://{self.parsed_url.netloc}/.well-known/openid-configuration'
        )
        self.discover()

    def __validate(self):
        if not self.parsed_url.netloc:
            raise ValueError(
                'Okta hostname is empty. '
                'Make sure the OKTA_DOMAIN_URL environment variable is set.'
            )
        if not self.client_id:
            raise ValueError(
                'Okta client id is empty. '
                'Make sure the OKTA_CLIENT_ID environment variable is set.'
            )
        if not self.client_secret:
            raise ValueError(
                'Okta client secret is empty. '
                'Make sure the OKTA_CLIENT_SECRET environment variable is set.'
            )
