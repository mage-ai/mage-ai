import pyodbc

from mage_integrations.connections.sql.base import Connection


class MSSQL(Connection):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        username: str,
        driver: str = None,
        port: int = 1433,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 1433
        self.username = username
        self.driver = driver or 'ODBC Driver 18 for SQL Server'

    def build_connection(self):
        connection_string = (
            f'DRIVER={{{self.driver}}};'
            f'SERVER={self.host};'
            f'DATABASE={self.database};'
            f'UID={self.username};'
            f'PWD={self.password};'
            'ENCRYPT=yes;'
            'TrustServerCertificate=yes;'
        )
        return pyodbc.connect(connection_string)
