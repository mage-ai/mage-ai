import logging
import threading
from collections import namedtuple

import requests
from simple_salesforce import SalesforceLogin

LOGGER = logging.getLogger(__name__)


OAuthCredentials = namedtuple('OAuthCredentials', (
    "client_id",
    "client_secret",
    "refresh_token"
))

PasswordCredentials = namedtuple('PasswordCredentials', (
    "username",
    "password",
    "security_token"
))


def parse_credentials(config):
    for cls in reversed((OAuthCredentials, PasswordCredentials)):
        creds = cls(*(config.get(key) for key in cls._fields))
        if all(creds):
            return creds

    raise Exception("Cannot create credentials from config.")


class SalesforceAuth():
    def __init__(self, credentials, domain='login'):
        self.domain = domain
        self._credentials = credentials
        self._access_token = None
        self._instance_url = None
        self._auth_header = None
        self.login_timer = None

    def login(self):
        """Attempt to login and set the `instance_url` and `access_token` on success."""
        pass

    @property
    def rest_headers(self):
        return {"Authorization": "Bearer {}".format(self._access_token)}

    @property
    def bulk_headers(self):
        return {"X-SFDC-Session": self._access_token,
                "Content-Type": "application/json"}

    @property
    def instance_url(self):
        return self._instance_url

    @classmethod
    def from_credentials(cls, credentials, **kwargs):
        if isinstance(credentials, OAuthCredentials):
            return SalesforceAuthOAuth(credentials, **kwargs)

        if isinstance(credentials, PasswordCredentials):
            return SalesforceAuthPassword(credentials, **kwargs)

        raise Exception("Invalid credentials")


class SalesforceAuthOAuth(SalesforceAuth):
    # The minimum expiration setting for SF Refresh Tokens is 15 minutes
    REFRESH_TOKEN_EXPIRATION_PERIOD = 900

    @property
    def _login_body(self):
        return {'grant_type': 'refresh_token', **self._credentials._asdict()}

    @property
    def _login_url(self):
        return f"https://{self.domain}.salesforce.com/services/oauth2/token"

    def login(self):
        try:
            LOGGER.info("Attempting login via OAuth2")

            resp = requests.post(self._login_url,
                                 data=self._login_body,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})

            resp.raise_for_status()
            auth = resp.json()

            LOGGER.info("OAuth2 login successful")
            self._access_token = auth['access_token']
            self._instance_url = auth['instance_url']
        except Exception as e:
            error_message = str(e)
            if resp:
                error_message = error_message + ", Response from Salesforce: {}".format(resp.text)
            raise Exception(error_message) from e


class SalesforceAuthPassword(SalesforceAuth):
    def login(self):
        login = SalesforceLogin(
            domain=self.domain,
            **self._credentials._asdict()
        )

        self._access_token, host = login
        self._instance_url = "https://" + host
