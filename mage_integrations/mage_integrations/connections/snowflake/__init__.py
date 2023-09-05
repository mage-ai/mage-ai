from snowflake.connector import connect

from mage_integrations.connections.sql.base import Connection


class Snowflake(Connection):
    def __init__(
        self,
        account: str,
        database: str,
        password: str,
        schema: str,
        username: str,
        warehouse: str,
        role: str = None,
    ):
        super().__init__()
        self.account = account
        self.database = database
        self.password = password
        self.schema = schema
        self.username = username
        self.warehouse = warehouse
        self.role = role

    def build_connection(self):
        connect_kwargs = dict(
            account=self.account,
            database=self.database,
            password=self.password,
            schema=self.schema,
            user=self.username,
            warehouse=self.warehouse,
        )
        if self.role:
            connect_kwargs['role'] = self.role
        return connect(**connect_kwargs)
