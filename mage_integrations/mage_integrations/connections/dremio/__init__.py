from typing import List

import numpy as np
from dremio.flight.endpoint import DremioFlightEndpoint

from mage_integrations.connections.sql.base import Connection
from mage_integrations.utils.dictionary import merge_dict


class Dremio(Connection):
    def __init__(
        self,
        username: str,
        hostname: str = None,
        port: int = None,
        password: str = None,
        token: str = None,
        query: str = None,
        tls: bool = None,
        disable_certificate_verification: bool = None,
        path_to_certs: str = None,
        session_properties: list = None,
        source_backend: str = None,
        schema: str = None
    ):
        super().__init__()
        self.hostname = hostname
        self.port = port or 32010
        self.username = username
        self.password = password
        self.token = token
        self.query = query
        self.tls = tls or False
        self.disable_certificate_verification = disable_certificate_verification or False
        self.path_to_certs = path_to_certs
        self.session_properties = session_properties
        self.dremio_flight_endpoint = None
        self.source_backend = source_backend
        self.schema = schema

    def build_connection(self):
        connect_kwargs = dict(
            username=self.username,
            query=self.query,
        )
        if self.hostname is not None:
            connect_kwargs['hostname'] = self.hostname

        if self.port is not None:
            connect_kwargs['port'] = self.port

        if self.password is not None:
            connect_kwargs['password'] = self.password

        if self.token is not None:
            connect_kwargs['token'] = self.token

        if self.tls is not None:
            connect_kwargs['tls'] = self.tls

        if self.disable_certificate_verification is not None:
            connect_kwargs['disable_certificate_verification'] = self.disable_certificate_verification # noqa

        if self.path_to_certs is not None:
            connect_kwargs['path_to_certs'] = self.path_to_certs

        if self.session_properties is not None:
            connect_kwargs['session_properties'] = self.session_properties

        # Initiating DremioFlight object and connection to server endpoint

        self.dremio_flight_endpoint = DremioFlightEndpoint(connect_kwargs)
        flight_client = self.dremio_flight_endpoint.connect()
        return flight_client

    def execute(
        self,
        query_strings: str,
        commit=False,
    ) -> List[List[tuple]]:

        self.query = query_strings
        flight_client = self.build_connection()

        # Data is returned as a Pandas Dataframe by Dremio Flight Endpoint
        dataframe = self.dremio_flight_endpoint.execute_query(flight_client)

        return dataframe

    def load(self, query_string: str) -> List[List[tuple]]:
        tags = merge_dict(self.build_tags(), dict(query=query_string))
        self.info('Load started.', tags=tags)
        df = self.execute(query_string)
        df.replace({np.nan: None}, inplace=True)
        data = df.values.tolist()

        if len(data[0]) == 0:
            raise Exception('0 Records where found')

        self.info('Load completed.', tags=merge_dict(tags, dict(count=len(data[0]))))

        return data

    def close_connection(self, connection):
        pass
