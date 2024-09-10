from pyairtable import Api

from mage_integrations.connections.sql.base import Connection


class Airtable(Connection):
    """
    Represents a connection to an Airtable API.

    Attributes:
        token (str): Airtable API access token (required).
        base_id (str): Airtable app ID (optional).
        table_name (str): Name or ID of the Airtable table to connect to (optional).

    Methods:
        build_connection(): Returns the Airtable API object for further interaction.
    """

    def __init__(
            self,
            token: str,
            base_id: str = None,
            table_name: str = None,
            **kwargs
    ):
        super().__init__(**kwargs)
        self.token = token
        self.base_id = base_id
        self.table_name = table_name

        self.api = Api(self.token)

    def build_connection(self):
        return self.api
