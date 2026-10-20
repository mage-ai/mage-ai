from mage_integrations.connections.redshift import Redshift as RedshiftConnection
from mage_integrations.sources.redshift.constants import (
    DATA_TYPES_BOOLEAN,
    DATA_TYPES_INTEGER,
    DATA_TYPES_NUMBER,
    DATA_TYPES_DATE,
)
from mage_integrations.sources.base import main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.sql.base import Source
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.utils.dictionary import group_by
from singer.schema import Schema
from typing import List


class Redshift(Source):
    @property
    def table_prefix(self):
        database_name = self.config['database']
        schema_name = self.config['schema']
        return f'{database_name}.{schema_name}.'

    def build_connection(self) -> RedshiftConnection:
        return RedshiftConnection(
            access_key_id=self.config.get('access_key_id'),
            cluster_identifier=self.config.get('cluster_identifier'),
            database=self.config.get('database'),
            db_user=self.config.get('db_user'),
            host=self.config.get('host'),
            password=self.config.get('password'),
            port=self.config.get('port'),
            region=self.config.get('region'),
            secret_access_key=self.config.get('secret_access_key'),
            user=self.config.get('user'),
            verbose=0 if self.discover_mode or self.discover_streams_mode else 1,
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        schema = self.config['schema']

        query = f"""
SELECT
    schemaname
    , tablename
    , "column" AS column_name
    , type
    , encoding
    , "distkey"
    , "sortkey"
    , "notnull"
FROM PG_TABLE_DEF
WHERE schemaname = '{schema}'
        """
        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND tablename IN ({table_names})'

        rows = self.build_connection().execute([
            f'SET search_path TO {schema}',
            query,
        ])
        groups = group_by(lambda t: t[1], rows[len(rows) - 1])

        streams = []
        for stream_id, columns_data in groups.items():
            properties = dict()
            unique_constraints = []
            valid_replication_keys = []

            # https://docs.aws.amazon.com/redshift/latest/dg/r_PG_TABLE_DEF.html
            for column_data in columns_data:
                column_name = column_data[2]
                column_type = column_data[3]
                is_nullable = column_data[7]

                column_format = None
                column_properties = None
                column_types = []

                valid_replication_keys.append(column_name)

                if is_nullable:
                    column_types.append(COLUMN_TYPE_NULL)

                column_type = column_type.split('(')[0]
                if column_type in DATA_TYPES_BOOLEAN:
                    column_types.append(COLUMN_TYPE_BOOLEAN)
                elif column_type in DATA_TYPES_INTEGER:
                    column_types.append(COLUMN_TYPE_INTEGER)
                elif column_type in DATA_TYPES_NUMBER:
                    column_types.append(COLUMN_TYPE_NUMBER)
                elif column_type in DATA_TYPES_DATE:
                    column_format = COLUMN_FORMAT_DATETIME
                    column_types.append(COLUMN_TYPE_STRING)
                else:
                    column_types.append(COLUMN_TYPE_STRING)

                properties[column_name] = dict(
                    properties=column_properties,
                    format=column_format,
                    type=column_types,
                )

            schema = Schema.from_dict(dict(
                properties=properties,
                type='object',
            ))
            metadata = get_standard_metadata(
                key_properties=unique_constraints,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema.to_dict(),
                stream_id=stream_id,
                valid_replication_keys=unique_constraints + valid_replication_keys,
            )
            catalog_entry = CatalogEntry(
                key_properties=unique_constraints,
                metadata=metadata,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                schema=schema,
                stream=stream_id,
                tap_stream_id=stream_id,
                unique_conflict_method=UNIQUE_CONFLICT_METHOD_UPDATE,
                unique_constraints=unique_constraints,
            )

            streams.append(catalog_entry)

        return Catalog(streams)


if __name__ == '__main__':
    main(Redshift)
