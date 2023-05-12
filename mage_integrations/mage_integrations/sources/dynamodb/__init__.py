from botocore.config import Config
from botocore.exceptions import ClientError
from datetime import datetime
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.sources.constants import (
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_STRING,
)
from typing import Dict, Generator, List
import boto3
from singer.schema import Schema
import singer
# TODO: refactor this common row_to_singer_record function
# to util file to share between different sources.
import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.common as common

REQUIRED_TABLE_CONFIG_KEYS = ['table_name']
LAST_EVALUATED_TABLE_NAME = 'LastEvaluatedTableName'
LAST_EVALUATED_KEY = 'LastEvaluatedKey'
EXCLUSIVE_STAR_KEY = 'ExclusiveStartKey'


class DynamoDb(Source):
    @property
    def region(self) -> str:
        return self.config.get('aws_region', 'us-west-2')

    def discover_streams(self) -> List[Dict]:
        client = self.build_client()
        self.logger.info('Testing running inside discover_streams')

        response = client.list_tables()
        table_list = response.get('TableNames')
        while response.get('LastEvaluatedTableName') is not None:
            response = client.list_tables(ExclusiveStartTableName=response.get('LastEvaluatedTableName'))
            table_list += response.get('TableNames')

        return [dict(
            stream=stream_id,
            tap_stream_id=stream_id,
        ) for stream_id in table_list]

    def discover_stream(self, client, table_name):
        '''
        Read a single table in DynamoDB.
        '''
        self.logger.info('Testing running discover_stream in dynamodb')
        try:
            table_info = client.describe_table(TableName=table_name).get('Table', {})
        except ClientError:
            self.logger.error(f'Access to table {table_name} was denied, skipping')
            return None
        self.logger.info(f'{table_info}')
        key_props = [key_schema.get('AttributeName')
                     for key_schema in table_info.get('KeySchema', [])]
        properties = dict()
        for column_schema in table_info.get('AttributeDefinitions', []):
            column_name = column_schema.get('AttributeName')
            column_type = column_schema.get('AttributeType')
            column_types = []
            if column_type == 'S':
                column_types.append(COLUMN_TYPE_STRING)
            elif column_type == 'N':
                column_types.append(COLUMN_TYPE_NUMBER)
            elif column_type == 'B':
                column_types.append(COLUMN_TYPE_OBJECT)
            else:
                self.logger.error(f'Unknown column type {column_type} for column {column_name}')

            properties[column_name] = dict(
                    type=column_types,
                )
        schema = Schema.from_dict(dict(
                properties=properties,
                type='object',
            ))
        metadata = get_standard_metadata(
                key_properties=key_props,
                schema=schema.to_dict(),
                stream_id=table_name,
            )
        catalog_entry = CatalogEntry(
                key_properties=key_props,
                metadata=metadata,
                schema=schema,
                stream=table_name,
                tap_stream_id=table_name,
            )
        return catalog_entry

    def discover(self, streams: List[str] = None) -> Catalog:
        '''
        Read streams in DynamoDB.
        '''
        self.logger.info('Testing running discover in dynamodb')
        
        client = self.build_client()
        self.logger.info('Debugging running discover')
        outputs = []
        if streams:
            # Check if streams available
            for stream in streams:
                catalog_entry = self.discover_stream(client, stream)
                if catalog_entry is not None:
                    outputs.append(catalog_entry)
        return Catalog(outputs)

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
        client.describe_endpoints()

        all_tables_response = client.list_tables()
        self.logger.info(f'Testing all_tables_response: {all_tables_response}')

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
        for result in self.scan_table(table_name):
            data = []
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
    LOGGER = singer.get_logger()
    main(DynamoDb)
