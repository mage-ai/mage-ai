import struct
from datetime import datetime, timedelta, timezone

import pyodbc

from mage_integrations.connections.sql.base import Connection


class MSSQL(Connection):
    def __init__(
        self,
        authentication: str = None,
        database: str = None,
        driver: str = None,
        host: str = None,
        password: str = None,
        port: int = 1433,
        username: str = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.authentication = authentication
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 1433
        self.username = username
        self.driver = driver or 'ODBC Driver 18 for SQL Server'

    def build_connection(self):
        connection_string_params = [
            f'DRIVER={{{self.driver}}};',
            f'SERVER={self.host};',
            f'DATABASE={self.database};',
            f'UID={self.username};',
            f'PWD={self.password};',
        ]
        if self.authentication:
            connection_string_params += f'Authentication={self.authentication};'

        connection_string_params += [
            'ENCRYPT=yes;'
            'TrustServerCertificate=yes;'
        ]

        connection_string = ''.join(connection_string_params)

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
