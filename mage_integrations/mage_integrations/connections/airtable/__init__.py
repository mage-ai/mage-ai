from pyairtable import Api, Base

from mage_integrations.connections.sql.base import Connection


class Airtable(Connection):
    """
    Represents a connection to an Airtable API.

    Attributes:
        token (str): Airtable API access token (required).
        base_id (str): Airtable app ID (optional).

    Methods:
        build_connection(): Returns the Airtable Base object for further interaction.
    """

    def __init__(
            self,
            token: str,
            base_id: str,
            **kwargs
    ):
        super().__init__(**kwargs)

        self.token = token
        self.base_id = base_id
        self.api = Api(self.token)

    def build_connection(self) -> Base:
        return self.api.base(self.base_id)
