from botocore.config import Config
from botocore.exceptions import ClientError
from datetime import datetime
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.utils import get_standard_metadata
from typing import Dict, Generator, List
import boto3
import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.common as common

REQUIRED_TABLE_CONFIG_KEYS = ['table_name']
LAST_EVALUATED_TABLE_NAME = 'LastEvaluatedTableName'
LAST_EVALUATED_KEY = 'LastEvaluatedKey'
EXCLUSIVE_STAR_KEY = 'ExclusiveStartKey'


class DynamoDb(Source):
    @property
    def region(self) -> str:
        return self.config.get('aws_region', 'us-west-2')
    
    @property
    def table_configs(self):
        """
        Used for multiple streams. Each table config has the key of table_name.
        """
        configs = self.config.get('table_configs', [])
        configs = [c for c in configs if all(k in c for k in REQUIRED_TABLE_CONFIG_KEYS)]
        return configs

    def discover_stream(self, client, table_name):
        '''
        Read a single table in DynamoDB.
        '''
        try:
            table_info = client.describe_table(TableName=table_name).get('Table', {})
        except ClientError:
            self.logger.error(f'Access to table {table_name} was denied, skipping')
            return None

        key_props = [key_schema.get('AttributeName')
                     for key_schema in table_info.get('KeySchema', [])]
        metadata = get_standard_metadata(
                key_properties=key_props,
            )
        catalog_entry = CatalogEntry(
                key_properties=key_props,
                metadata=metadata,
                stream=table_name,
                tap_stream_id=table_name,
            )
        return catalog_entry

    def discover(self, streams: List[str] = None) -> Catalog:
        '''
        Read streams in DynamoDB.
        '''
        client = self.build_client()
        streams = []
        for table_config in self.table_configs:
            catalog_entry = self.discover_stream(client, table_config['table_name'])
            if catalog_entry is not None:
                streams.append(catalog_entry)
        return Catalog(streams)

    def build_client(self):
        '''
        Build DynamoDB client.
        '''
        config = Config(
           retries={
              'max_attempts': 10,
              'mode': 'standard',
           },
        )

        return boto3.client(
            'dynamodb',
            aws_access_key_id=self.config['aws_access_key_id'],
            aws_secret_access_key=self.config['aws_secret_access_key'],
            config=config,
            region_name=self.region,
        )

    def test_connection(self) -> None:
        client = self.build_client()
        for table_config in self.table_configs:
            client.describe_table(TableName=table_config['table_name'])

    def scan_table(self, table_name):
        '''
        Scan records in one table.
        '''
        scan_params = {
            'TableName': table_name,
            'Limit': 1000
        }

        client = self.build_client()
        has_more = True

        while has_more:
            result = client.scan(**scan_params)
            yield result

            if result.get(LAST_EVALUATED_KEY):
                scan_params[EXCLUSIVE_STAR_KEY] = result[LAST_EVALUATED_KEY]

            has_more = result.get(LAST_EVALUATED_KEY, False)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = {},
        sample_data: bool = False,
        start_date: datetime = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        table_name = stream.tap_stream_id
        data = []
        for result in self.scan_table(table_name):
            for item in result.get('Items', []):
                record_message = common.row_to_singer_record(
                        stream.to_dict(),
                        item,
                        None,
                        None,
                    )
                data.append(record_message.record)
        yield data


if __name__ == '__main__':
    main(DynamoDb)
