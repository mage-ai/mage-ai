import enum
import io
import os
from typing import Dict

import paramiko
from mysql.connector import connect
from sshtunnel import SSHTunnelForwarder

from mage_integrations.connections.sql.base import Connection


class ConnectionMethod(str, enum.Enum):
    DIRECT = "direct"
    SSH_TUNNEL = "ssh_tunnel"


class Doris(Connection):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        username: str,
        port: int = None,
        connection_method: ConnectionMethod = ConnectionMethod.DIRECT,
        conn_kwargs: Dict = None,
        ssh_host: str = None,
        ssh_port: int = 22,
        ssh_username: str = None,
        ssh_password: str = None,
        ssh_pkey: str = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.connection_method = connection_method
        self.database = database
        self.host = host
        self.password = password
        self.port = port or 3306
        self.username = username
        self.ssh_host = ssh_host
        self.ssh_port = ssh_port
        self.ssh_username = ssh_username
        self.ssh_password = ssh_password
        self.ssh_pkey = ssh_pkey
        self.conn_kwargs = conn_kwargs or dict()

        self.ssh_tunnel = None

    def build_connection(self):
        host = self.host
        port = self.port
        if self.connection_method == ConnectionMethod.SSH_TUNNEL:
            ssh_setting = dict(ssh_username=self.ssh_username)
            if self.ssh_pkey is not None:
                if os.path.exists(self.ssh_pkey):
                    ssh_setting["ssh_pkey"] = self.ssh_pkey
                else:
                    ssh_setting["ssh_pkey"] = paramiko.RSAKey.from_private_key(
                        io.StringIO(self.ssh_pkey),
                    )
            else:
                ssh_setting["ssh_password"] = self.ssh_password
            self.ssh_tunnel = SSHTunnelForwarder(
                (self.ssh_host, self.ssh_port),
                remote_bind_address=(self.host, self.port),
                local_bind_address=("", self.port),
                **ssh_setting,
            )
            self.ssh_tunnel.start()
            self.ssh_tunnel._check_is_started()

            host = "127.0.0.1"
            port = self.ssh_tunnel.local_bind_port
        return connect(
            database=self.database,
            host=host,
            password=self.password,
            port=port,
            user=self.username,
            **self.conn_kwargs,
        )

    def close_connection(self, connection):
        connection.close()
        if self.ssh_tunnel is not None:
            self.ssh_tunnel.stop()
            self.ssh_tunnel = None
