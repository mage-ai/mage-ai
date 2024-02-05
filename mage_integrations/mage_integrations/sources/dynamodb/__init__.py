from datetime import datetime
from typing import Dict, Generator, List

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from singer.schema import Schema

# TODO: refactor this common row_to_singer_record function
# to util file to share between different sources.
import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.common as common
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_TYPE_BINARY,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_STRING,
    DATABASE_TYPE_DYNAMODB,
    REPLICATION_METHOD_FULL_TABLE,
)
from mage_integrations.sources.utils import get_standard_metadata

ATTRIBUTE_DEFINITIONS = 'AttributeDefinitions'
ATTRIBUTE_NAME = 'AttributeName'
ATTRIBUTE_TYPE = 'AttributeType'
AWS_ACCESS_KEY_ID = 'aws_access_key_id'
AWS_REGION = 'aws_region'
AWS_SECRET_ACCESS_KEY = 'aws_secret_access_key'
EXCLUSIVE_START_KEY = 'ExclusiveStartKey'
ITEMS = 'Items'
KEY_SCHEMA = 'KeySchema'
LAST_EVALUATED_TABLE_NAME = 'LastEvaluatedTableName'
LAST_EVALUATED_KEY = 'LastEvaluatedKey'
TABLE = 'Table'
TABLE_NAMES = 'TableNames'


class DynamoDb(Source):
    @property
    def region(self) -> str:
        return self.config.get(AWS_REGION, 'us-west-2')

    def discover_streams(self) -> List[Dict]:
        client = self.build_client()

        response = client.list_tables()
        table_list = response.get(TABLE_NAMES)
        while response.get(LAST_EVALUATED_TABLE_NAME) is not None:
            response = client.list_tables(
                ExclusiveStartTableName=response.get(LAST_EVALUATED_TABLE_NAME))
            table_list += response.get(TABLE_NAMES)

        return [dict(
            stream=stream_id,
            tap_stream_id=stream_id,
        ) for stream_id in table_list]

    def discover_stream(self, client, table_name):
        '''
        Read a single table in DynamoDB.
        '''
        try:
            table_info = client.describe_table(TableName=table_name).get(TABLE, {})
        except ClientError:
            self.logger.error(f'Access to table {table_name} was denied, skipping')
            return None
        key_props = [key_schema.get(ATTRIBUTE_NAME)
                     for key_schema in table_info.get(KEY_SCHEMA, [])]
        properties = dict()
        valid_replication_keys = key_props
        for column_schema in table_info.get(ATTRIBUTE_DEFINITIONS, []):
            column_name = column_schema.get(ATTRIBUTE_NAME)
            column_type = column_schema.get(ATTRIBUTE_TYPE)
            column_types = []
            if column_type == 'S':
                column_types.append(COLUMN_TYPE_STRING)
            elif column_type == 'N':
                column_types.append(COLUMN_TYPE_NUMBER)
            elif column_type == 'B':
                column_types.append(COLUMN_TYPE_BINARY)
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
                # DynamoDB replicas with global tables.
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema.to_dict(),
                stream_id=table_name,
                valid_replication_keys=valid_replication_keys,
            )
        catalog_entry = CatalogEntry(
                key_properties=key_props,
                metadata=metadata,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema,
                stream=table_name,
                tap_stream_id=table_name,
                database=DATABASE_TYPE_DYNAMODB,
            )
        return catalog_entry

    def discover(self, streams: List[str] = None) -> Catalog:
        '''
        Read streams in DynamoDB.
        '''
        client = self.build_client()
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

        if (
            not self.config.get('aws_access_key_id') and
            not self.config.get('aws_secret_access_key') and
            self.config.get('role_arn')
        ):
            # Assume IAM role and get credentials
            role_session_name = self.config.get('role_session_name', 'mage-data-integration')
            sts_session = boto3.Session()
            sts_connection = sts_session.client('sts')
            assume_role_object = sts_connection.assume_role(
                RoleArn=self.config.get('role_arn'),
                RoleSessionName=role_session_name,
            )

            session = boto3.Session(
                aws_access_key_id=assume_role_object['Credentials']['AccessKeyId'],
                aws_secret_access_key=assume_role_object['Credentials']['SecretAccessKey'],
                aws_session_token=assume_role_object['Credentials']['SessionToken'],
            )

            return session.client(
                'dynamodb',
                config=config,
                region_name=self.region,
            )

        return boto3.client(
            'dynamodb',
            aws_access_key_id=self.config[AWS_ACCESS_KEY_ID],
            aws_secret_access_key=self.config[AWS_SECRET_ACCESS_KEY],
            config=config,
            region_name=self.region,
        )

    def test_connection(self) -> None:
        client = self.build_client()
        client.describe_endpoints()

    def scan_table(self, table_name, last_evaluated_key):
        '''
        Scan records in one table.
        '''
        scan_params = {
            'TableName': table_name,
            'Limit': 100
        }

        client = self.build_client()
        has_more = True

        if last_evaluated_key is not None and last_evaluated_key:
            scan_params[EXCLUSIVE_START_KEY] = last_evaluated_key

        while has_more:
            result = client.scan(**scan_params)
            yield result

            if result.get(LAST_EVALUATED_KEY):
                scan_params[EXCLUSIVE_START_KEY] = result[LAST_EVALUATED_KEY]

            has_more = result.get(LAST_EVALUATED_KEY, False)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        sample_data: bool = False,
        start_date: datetime = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        table_name = stream.tap_stream_id

        for result in self.scan_table(table_name, bookmarks):
            data = []

            for item in result.get(ITEMS, []):
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
