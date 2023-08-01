import abc
from collections import namedtuple
from dataclasses import dataclass
from typing import Union

import requests
from simple_salesforce import SalesforceLogin

OAuthCredentials = namedtuple(
    "OAuthCredentials", ("client_id", "client_secret", "refresh_token")
)

PasswordCredentials = namedtuple(
    "PasswordCredentials", ("username", "password", "security_token")
)


@dataclass
class Session:
    session_id: str
    instance: str = None
    instance_url: str = None


def parse_credentials(config: dict) -> Union[OAuthCredentials, PasswordCredentials]:
    for cls in reversed((OAuthCredentials, PasswordCredentials)):
        creds = cls(*(config.get(key) for key in cls._fields))
        if all(creds):
            return creds

    raise Exception(
        "Cannot create credentials from config. Target supports OAuth and Password authentication."
    )


class SalesforceAuth(metaclass=abc.ABCMeta):
    def __init__(self, credentials, domain, logger=None):
        self.domain = domain
        self._credentials = credentials
        self.logger = logger

    @abc.abstractmethod
    def login(self) -> Session:
        """Attempt to login and return Session info"""
        pass

    @classmethod
    def from_credentials(cls, credentials, **kwargs):
        if isinstance(credentials, OAuthCredentials):
            return SalesforceAuthOAuth(credentials, **kwargs)

        if isinstance(credentials, PasswordCredentials):
            return SalesforceAuthPassword(credentials, **kwargs)

        raise Exception("Invalid credentials")


class SalesforceAuthOAuth(SalesforceAuth):
    @property
    def _login_body(self):
        return {"grant_type": "refresh_token", **self._credentials._asdict()}

    @property
    def _login_url(self):
        return f"https://{self.domain}.salesforce.com/services/oauth2/token"

    def login(self):
        try:
            self.logger.info("Attempting login via OAuth2")

            resp = requests.post(
                self._login_url,
                data=self._login_body,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            resp.raise_for_status()
            auth = resp.json()

            self.logger.info("OAuth2 login successful")
            return Session(auth["access_token"], instance_url=auth["instance_url"])
        except Exception as e:
            error_message = str(e)
            if resp:
                error_message = error_message + ", Response from Salesforce: {}".format(
                    resp.text
                )
            raise Exception(error_message) from e


class SalesforceAuthPassword(SalesforceAuth):
    def login(self):
        session_id, instance = SalesforceLogin(
            domain=self.domain, **self._credentials._asdict()
        )
        return Session(session_id, instance=instance)
