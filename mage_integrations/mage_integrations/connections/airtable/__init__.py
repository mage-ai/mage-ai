from pyairtable import Api

from mage_integrations.connections.sql.base import Connection


class Airtable(Connection):
    def __init__(
            self,
            access_token: str = None,
            app_id: str = None,
            table_name: str = None,
            view_id: str = None,
            **kwargs
    ):
        super().__init__(**kwargs)
        self.access_token = access_token
        self.app_id = app_id
        self.table_name = table_name
        self.view_id = view_id

        self.api = Api(self.access_token)

    def build_connection(self):
        return self.api
