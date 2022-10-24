from mage_integrations.connections.sql.base import Connection
from snowflake.connector import connect


class Snowflake(Connection):
    def __init__(
        self,
        account: str,
        database: str,
        password: str,
        schema: str,
        username: str,
        warehouse: str,
    ):
        super().__init__()
        self.account = account
        self.database = database
        self.password = password
        self.schema = schema
        self.username = username
        self.warehouse = warehouse

    def build_connection(self):
        return connect(
            account=self.account,
            database=self.database,
            password=self.password,
            schema=self.schema,
            user=self.username,
            warehouse=self.warehouse,
        )
