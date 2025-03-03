from cryptography.hazmat.primitives import serialization
from snowflake.connector import connect

from mage_integrations.connections.sql.base import Connection


class Snowflake(Connection):
    def __init__(
        self,
        account: str,
        database: str,
        schema: str,
        warehouse: str,
        username: str = None,
        password: str = None,
        private_key: bytes = None,
        passphrase: str = None,
        role: str = None,
    ):
        super().__init__()
        self.account = account
        self.database = database
        self.schema = schema
        self.warehouse = warehouse
        self.username = username
        self.password = password
        self.private_key = private_key
        self.passphrase = passphrase
        self.role = role

        if private_key:
            if not self.passphrase:
                raise ValueError("Private key authentication requires 'passphrase'.")
            self.private_key = self.load_private_key(private_key, passphrase)
            self.passphrase = passphrase
            self.password = None
        else:
            if not username or not password:
                raise ValueError("Username and password are required if not using"
                                 "private key authentication.")
            self.password = password
            self.private_key = None
            self.passphrase = None

    @staticmethod
    def load_private_key(private_key_str: str, passphrase: str):
        """Load private key content from a string and decrypt with passphrase."""
        try:
            private_key = serialization.load_pem_private_key(
                private_key_str.encode('utf-8'),
                password=passphrase.encode('utf-8'),
            )
            return private_key
        except ValueError as e:
            raise ValueError(f"Failed to load private key: {e}")

    def build_connection(self):
        connect_kwargs = {
            "account": self.account,
            "database": self.database,
            "schema": self.schema,
            "warehouse": self.warehouse,
            "user": self.username,  # Snowflake uses 'user' instead of 'username'
        }

        if self.role:
            connect_kwargs["role"] = self.role

        if self.private_key:
            connect_kwargs["private_key"] = self.private_key
            connect_kwargs["passphrase"] = self.passphrase
        else:
            connect_kwargs["password"] = self.password
        return connect(**connect_kwargs)
