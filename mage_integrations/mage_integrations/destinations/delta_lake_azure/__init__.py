import re
from typing import Dict

from azure.storage.blob import ContainerClient

from mage_integrations.destinations.delta_lake.base import DeltaLake as BaseDeltaLake
from mage_integrations.destinations.delta_lake.base import main


class DeltaLakeAzure(BaseDeltaLake):
    def build_client(self):
        return ContainerClient(
            f"https://{self.config['account_name']}.blob.core.windows.net",
            re.search(r'//(.*?)@', self.config['table_uri'])[1],
            credential={'account_name': self.config['account_name'],
                        'account_key': self.config['access_key']}
        )

    def test_connection(self) -> None:
        client = self.build_client()
        if client.exists() is True:
            return True
        else:
            raise Exception

    def build_storage_options(self) -> Dict:
        return {
            'azure_storage_account_name': self.config['account_name'],
            'azure_storage_access_key': self.config['access_key']
        }

    def build_table_uri(self, stream: str) -> str:
        return self.config['table_uri']

    def check_and_create_delta_log(self, stream: str) -> bool:
        client = self.build_client()
        list_of_names = [item for item in client.list_blobs(name_starts_with='_delta_log')]
        if len(list_of_names) > 0:
            return True
        else:
            return False


if __name__ == '__main__':
    main(DeltaLakeAzure)
