from azure.storage.blob import BlobServiceClient
from collections import Counter
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
from singer.schema import Schema
from typing import Dict, Generator, List
import io
import pandas as pd
import singer

LOGGER = singer.get_logger()


class AzureBlobStorage(Source):
    @property
    def container_name(self) -> str:
        return self.config['container_name']

    @property
    def prefix(self) -> str:
        return self.config['prefix']

    def build_client(self):
        return BlobServiceClient.from_connection_string(self.config['connection_string'])

    def discover(self, streams: List[str] = None) -> Catalog:
        client = self.build_client()
        container_client = client.get_container_client(self.container_name)

        streams = []
        for b in container_client.list_blobs(self.prefix):
            """
            All files under the prefix path will be synced
            """
            if int(b.get('size', 0)) == 0:
                continue

            name = b['name']
            parts = name.split('/')
            stream_id = '_'.join(parts[:-1])

            df = self.__build_df(name)

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

            break

        return Catalog(streams)

    def load_data(
        self,
        *args,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        client = self.build_client()

        container_client = client.get_container_client(self.container_name)

        for b in container_client.list_blobs(self.prefix):
            if int(b.get('size', 0)) == 0:
                continue
            df = self.__build_df(b['name'])
            yield df.to_dict('records')

    def test_connection(self) -> None:
        client = self.build_client()
        container_client = client.get_container_client(self.container_name)
        container_exists = container_client.exists()
        if not container_exists:
            raise Exception(f'Container {self.container_name} does not exist.')
        container_client.list_blobs(self.prefix).next()

    def __build_df(self, key: str) -> 'pd.DataFrame':
        client = self.build_client()
        df = pd.DataFrame()
        blob_client = client.get_blob_client(
            self.container_name,
            key,
        )
        if not blob_client.exists():
            return df
        blob_data = blob_client.download_blob()
        buffer = io.BytesIO(blob_data.readall())
        if '.parquet' in key:
            df = pd.read_parquet(buffer)
        elif '.csv' in key:
            df = pd.read_csv(buffer)
        return df


if __name__ == '__main__':
    main(AzureBlobStorage)
