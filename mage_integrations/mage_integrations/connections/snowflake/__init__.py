from snowflake.connector import connect

from mage_integrations.connections.sql.base import Connection


class Snowflake(Connection):
    def __init__(
        self,
        account: str,
        database: str,
        schema: str,
        username: str,
        warehouse: str,
        password: str = None,
        private_key_file: str = None,
        private_key_file_pwd: str = None,
        role: str = None,
    ):
        super().__init__()
        self.account = account
        self.database = database
        self.schema = schema
        self.username = username
        self.warehouse = warehouse

        self.password = password
        self.private_key_file = private_key_file
        self.private_key_file_pwd = private_key_file_pwd
        self.role = role

    def build_connection(self):
        connect_kwargs = dict(
            account=self.account,
            database=self.database,
            schema=self.schema,
            user=self.username,
            warehouse=self.warehouse,
        )
        if self.password:
            connect_kwargs['password'] = self.password
        if self.private_key_file:
            connect_kwargs['private_key_file'] = self.private_key_file
        if self.private_key_file_pwd:
            connect_kwargs['private_key_file_pwd'] = self.private_key_file_pwd.encode()
        if self.role:
            connect_kwargs['role'] = self.role
        return connect(**connect_kwargs)
