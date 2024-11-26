import io
from collections import Counter
from typing import Dict, Generator, List

import pandas as pd
from charset_normalizer import from_bytes
from singer.schema import Schema

from mage_integrations.connections.google_cloud_storage import (
    GoogleCloudStorage as GSCConnection,
)
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.transformers.utils import convert_data_type, infer_dtypes


class GoogleCloudStorage(Source):
    @property
    def bucket(self):
        return self.config['bucket']

    @property
    def file_type(self) -> str:
        return self.config.get('file_type')

    @property
    def prefix(self) -> str:
        return self.config.get('prefix')

    def build_client(self):
        connection = GSCConnection(
            credentials_info=self.config.get('credentials_info'),
            path_to_credentials_json_file=self.config.get('path_to_credentials_json_file'),
        )
        client = connection.build_connection()
        return client

    def discover(self, streams: List[str] = None) -> Catalog:
        client = self.build_client()

        streams = []
        for blob in client.list_blobs(self.bucket, prefix=self.prefix):
            if blob.size == 0:
                continue

            key = blob.name

            # Ensure the file type matches the required file type
            if not key.endswith(f'.{self.file_type}'):
                continue

            parts = key.split('.')
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

            schema = Schema.from_dict(dict(
                properties=properties,
                type='object',
            ))

            metadata = get_standard_metadata(
                key_properties=[],
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema.to_dict(),
                stream_id=stream_id,
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

    def load_data(
            self,
            *args,
            **kwargs,
    ) -> Generator[List[Dict], None, None]:
        client = self.build_client()

        for blob in client.list_blobs(self.bucket, prefix=self.prefix):
            if blob.size == 0:
                continue

            key = blob.name
            stream_id = '_'.join(key.split('.')[:-1])

            # load selected streams only
            if stream_id in self.selected_streams:
                df = self.__build_df(blob.name)
                yield df.to_dict('records')

    def test_connection(self) -> None:
        client = self.build_client()
        if not client.get_bucket(self.bucket).exists():
            raise Exception(f'Bucket {self.bucket} does not exist.')
        client.list_blobs(self.bucket)

    def __build_df(self, key: str) -> 'pd.DataFrame':
        client = self.build_client()
        df = pd.DataFrame()
        bucket = client.get_bucket(self.bucket)
        blob = bucket.get_blob(key)
        data = blob.download_as_bytes()
        buffer = io.BytesIO(data)
        if '.parquet' in key:
            df = pd.read_parquet(buffer)
        elif '.csv' in key:
            encoding = from_bytes(data).best().encoding
            df = pd.read_csv(buffer, encoding=encoding)
        return df


if __name__ == '__main__':
    main(GoogleCloudStorage)
