import struct
from datetime import datetime, timedelta, timezone

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

        # https://github.com/mkleehammer/pyodbc/wiki/Using-an-Output-Converter-function
        cnxn = pyodbc.connect(connection_string)

        def handle_datetimeoffset(dto_value):
            # ref: https://github.com/mkleehammer/pyodbc/issues/134#issuecomment-281739794
            # now struct.unpack: e.g., (2017, 3, 16, 10, 35, 18, 500000000, -6, 0)
            tup = struct.unpack("<6hI2h", dto_value)
            return datetime(tup[0], tup[1], tup[2], tup[3], tup[4], tup[5], tup[6] // 1000,
                            timezone(timedelta(hours=tup[7], minutes=tup[8])))

        cnxn.add_output_converter(-155, handle_datetimeoffset)

        return cnxn
