from botocore.config import Config
from collections import Counter
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    FILE_TYPE_CSV,
    FILE_TYPE_PARQUET,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.transformers.utils import convert_data_type, infer_dtypes
from singer.schema import Schema
from typing import Dict, Generator, List
import boto3
import io
import pandas as pd
import re

COLUMN_LAST_MODIFIED = '_s3_last_modified'

VALID_FILE_TYPES = [
    FILE_TYPE_CSV,
    FILE_TYPE_PARQUET,
]


class AmazonS3(Source):
    @property
    def bucket(self) -> str:
        return self.config['bucket']

    @property
    def file_type(self) -> str:
        return self.config.get('file_type')

    @property
    def prefix(self) -> str:
        return self.config['prefix']

    @property
    def region(self) -> str:
        return self.config.get('aws_region', 'us-west-2')

    @property
    def search_pattern(self) -> str:
        return self.config.get('search_pattern')

    @property
    def single_stream_in_prefix(self) -> bool:
        val = self.config.get('single_stream_in_prefix')

        return False if val is None else val

    def build_client(self):
        config = Config(
           retries={
              'max_attempts': 10,
              'mode': 'standard',
           },
        )

        return boto3.client(
            's3',
            aws_access_key_id=self.config['aws_access_key_id'],
            aws_secret_access_key=self.config['aws_secret_access_key'],
            config=config,
            region_name=self.region,
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        streams = []
        for d in self.list_objects():
            key = d['Key']
            parts = key.split('/')
            stream_id = '_'.join(parts[:-1])

            df = self.__build_df(key)

            properties = {}
            for col in df.columns:
                df_filtered = df[df[col].notnull()][[col]]

                for k, v in infer_dtypes(df_filtered).items():
                    if 'mixed' == v:
                        counter = Counter(map(type, df_filtered[col].values))
                        dtype, count = sorted(
                            [(k, v) for k, v in dict(counter).items()],
                            key=lambda t: t[1],
                            reverse=True,
                        )[0]

                        if dtype is list:
                            col_type = COLUMN_TYPE_ARRAY
                        elif dtype is dict:
                            col_type = COLUMN_TYPE_OBJECT
                        else:
                            col_type = COLUMN_TYPE_STRING
                    else:
                        col_type = convert_data_type(v)
                    properties[k] = dict(
                        type=[
                            'null',
                            col_type,
                        ],
                    )
            properties[COLUMN_LAST_MODIFIED] = dict(
                properties=None,
                format=COLUMN_FORMAT_DATETIME,
                type=[COLUMN_TYPE_STRING],
            )

            schema = Schema.from_dict(dict(
                properties=properties,
                type='object',
            ))

            metadata = get_standard_metadata(
                key_properties=[],
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema.to_dict(),
                stream_id=stream_id,
                valid_replication_keys=[COLUMN_LAST_MODIFIED],
            )
            catalog_entry = CatalogEntry(
                key_properties=[],
                metadata=metadata,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema,
                stream=stream_id,
                tap_stream_id=stream_id,
                unique_conflict_method=UNIQUE_CONFLICT_METHOD_UPDATE,
            )

            streams.append(catalog_entry)

        return Catalog(streams)

    def list_objects(self):
        client = self.build_client()

        paginator = client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.bucket, Prefix=self.prefix)
        if self.search_pattern is None:
            matcher = None
        else:
            matcher = re.compile(self.search_pattern)

        for page in pages:
            for d in page.get('Contents', []):
                if int(d.get('Size', 0)) == 0:
                    continue
                if matcher is not None and not matcher.search(d['Key']):
                    continue
                yield d

    def load_data(
        self,
        bookmarks: Dict = None,
        *args,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        bookmark_last_modified = None
        if bookmarks is not None and bookmarks.get(COLUMN_LAST_MODIFIED) is not None:
            bookmark_last_modified = bookmarks.get(COLUMN_LAST_MODIFIED)

        for d in self.list_objects():
            last_modified = d['LastModified'].strftime('%Y-%m-%d %H:%M:%S.%f')
            if bookmark_last_modified is not None and \
               last_modified <= bookmark_last_modified:
                continue
            df = self.__build_df(d['Key'])
            df[COLUMN_LAST_MODIFIED] = last_modified
            yield df.to_dict('records')

    def test_connection(self) -> None:
        client = self.build_client()
        client.head_bucket(Bucket=self.bucket)

    def __build_df(self, key: str) -> 'pd.DataFrame':
        client = self.build_client()
        df = pd.DataFrame()

        file_type = None
        if self.file_type in VALID_FILE_TYPES:
            file_type = self.file_type
        elif '.parquet' in key:
            file_type = FILE_TYPE_PARQUET
        elif '.csv' in key:
            file_type = FILE_TYPE_CSV

        if file_type == FILE_TYPE_PARQUET:
            data_buffer = io.BytesIO()
            client.download_fileobj(self.bucket, key, data_buffer)
            df = pd.read_parquet(data_buffer)
        elif file_type == FILE_TYPE_CSV:
            obj = client.get_object(Bucket=self.bucket, Key=key)
            df = pd.read_csv(io.BytesIO(obj['Body'].read()))

        return df


if __name__ == '__main__':
    main(AmazonS3)
