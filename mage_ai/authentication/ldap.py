from abc import ABC, abstractmethod
from typing import Tuple
from ldap3 import Server, Connection
from ldap3.core.exceptions import LDAPException
from mage_ai.settings import (
    LDAP_SERVER,
    LDAP_BIND_DN,
    LDAP_BIND_PASSWORD,
    LDAP_BASE_DN,
    LDAP_AUTHENTICATION_FILTER,
    LDAP_AUTHORIZATION_FILTER,
)


class LDAPAuthenticator(ABC):
    @abstractmethod
    def authenticate(self, username: str, password: str) -> Tuple[bool, str]:
        pass

    @abstractmethod
    def authorize(self, username: str) -> bool:
        pass

    def verify(self, username: str, password: str) -> bool:
        authenticated, user_dn = self.authenticate(username, password)
        if authenticated:
            return self.authorize(user_dn)
        return False


class LDAPConnection(LDAPAuthenticator):
    def __init__(
        self,
        server_url,
        bind_dn,
        bind_password,
        base_dn,
        authentication_filter,
        authorization_filter,
    ):
        self.server_url = server_url
        self.bind_dn = bind_dn
        self.bind_password = bind_password
        self.base_dn = base_dn
        self.authentication_filter = authentication_filter
        self.authorization_filter = authorization_filter
        self.conn = None

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.unbind()

    def bind(self):
        self.conn = Connection(
            Server(self.server_url), self.bind_dn, self.bind_password, auto_bind=True
        )

    def authenticate(self, username: str, password: str) -> Tuple[bool, str]:
        try:
            if not self.conn:
                self.bind()
            self.conn.search(
                self.base_dn, self.authentication_filter.format(username=username)
            )
            if not self.conn.entries:
                return False, ""
            user_dn = self.conn.entries[0].entry_dn
            if self.conn.rebind(user=user_dn, password=password):
                return True, user_dn
            return False, user_dn
        except LDAPException:
            return False, ""

    def authorize(self, user_dn: str) -> bool:
        try:
            if not self.conn:
                self.bind()
            self.conn.entries.clear()
            self.conn.search(self.base_dn, self.authorization_filter.format(user_dn=user_dn))
            if self.conn.entries:
                if len(self.conn.entries) > 0:
                    return True
            return False
        except LDAPException:
            return False


def new_ldap_connection() -> LDAPConnection:
    return LDAPConnection(
        LDAP_SERVER,
        LDAP_BIND_DN,
        LDAP_BIND_PASSWORD,
        LDAP_BASE_DN,
        LDAP_AUTHENTICATION_FILTER,
        LDAP_AUTHORIZATION_FILTER,
    )


def verify(username, password: str) -> bool:
    return LDAPConnection(
        LDAP_SERVER,
        LDAP_BIND_DN,
        LDAP_BIND_PASSWORD,
        LDAP_BASE_DN,
        LDAP_AUTHENTICATION_FILTER,
        LDAP_AUTHORIZATION_FILTER,
    ).verify(username, password)
