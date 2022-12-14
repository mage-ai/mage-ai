from deltalake import PyDeltaTableError
from deltalake.writer import try_get_deltatable, write_deltalake
from mage_integrations.destinations.base import Destination as BaseDestination
from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    KEY_RECORD,
)
from mage_integrations.destinations.delta_lake.constants import MODE_APPEND, MODE_OVERWRITE
from mage_integrations.destinations.delta_lake.raw_delta_table import RawDeltaTable
from mage_integrations.destinations.utils import update_record_with_internal_columns
from mage_integrations.utils.array import find
from mage_integrations.utils.dictionary import merge_dict
from typing import Dict, List
import argparse
import math
import pandas as pd
import pyarrow as pa
import sys

# Add 10% buffer
MAX_BYTE_SIZE_PER_WRITE = (5 * (1024 * 1024 * 1024)) * 0.9


class DeltaLake(BaseDestination):
    @property
    def mode(self):
        return self.config.get('mode', MODE_APPEND)

    @property
    def table_name(self):
        return self.config['table']

    def build_client(self):
        raise Exception('Subclasses must implement the build_client method.')

    def build_schema(self, stream: str, df: 'pd.DataFrame'):
        schema = self.schemas[stream]

        schema_out = []
        for column_name, properties in schema['properties'].items():
            column_types = properties.get('type', [])
            column_format = properties.get('format')

            for any_of in properties.get('anyOf', []):
                column_types += any_of.get('type', [])

            nullable = COLUMN_TYPE_NULL in column_types
            col_type = find(lambda x: COLUMN_TYPE_NULL != x, column_types)

            # pa.long_string() is not supported by Delta Lake library as of 2022/12/12
            column_type = pa.string()

            if df[column_name].dropna().count() == 0:
                df[column_name] = df[column_name].fillna('')
            elif COLUMN_TYPE_ARRAY == col_type:
                column_type = pa.list_(pa.string())
            elif COLUMN_TYPE_BOOLEAN == col_type:
                column_type = pa.bool_()
            elif COLUMN_TYPE_INTEGER == col_type:
                column_type = pa.int64()
            elif COLUMN_TYPE_NUMBER == col_type:
                column_type = pa.float64()
            elif COLUMN_TYPE_OBJECT == col_type:
                column_type = pa.map_(pa.string(), pa.string())
            elif COLUMN_TYPE_STRING == col_type and COLUMN_FORMAT_DATETIME == column_format:
                column_type = pa.string()
            elif COLUMN_TYPE_STRING == col_type:
                column_type = pa.string()

            f = pa.field(
                name=column_name,
                type=column_type,
                nullable=nullable,
                metadata={},
            )
            schema_out.append(f)

        schema = pa.schema(schema_out, metadata={})

        return df, schema

    def build_storage_options(self) -> Dict:
        raise Exception('Subclasses must implement the build_storage_options method.')

    def build_table_uri(self, stream: str) -> str:
        raise Exception('Subclasses must implement the build_table_uri method.')

    def check_and_create_delta_log(self, stream: str) -> bool:
        raise Exception('Subclasses must implement the check_and_create_delta_log method.')

    def get_table_for_stream(self, stream: str):
        storage_options = self.build_storage_options()
        table_uri = self.build_table_uri(stream)
        table = try_get_deltatable(table_uri, storage_options)

        if table:
            raw_dt = table._table
            table._table = RawDeltaTable(raw_dt)

        return table

    def export_batch_data(self, record_data: List[Dict], stream: str) -> None:
        storage_options = self.build_storage_options()
        friendly_table_name = self.config['table']
        table_uri = self.build_table_uri(stream)

        tags = dict(
            records=len(record_data),
            stream=stream,
            table_name=friendly_table_name,
            table_uri=table_uri,
        )

        self.logger.info('Export data started.', tags=tags)

        self.logger.info(f'Checking if delta logs exist...', tags=tags)
        if self.check_and_create_delta_log(stream):
            self.logger.info(f'Existing delta logs exist.', tags=tags)
        else:
            self.logger.info(f'No delta logs exist.', tags=tags)

        self.logger.info(f'Checking if table {friendly_table_name} exists...', tags=tags)
        table = self.get_table_for_stream(stream)
        if table:
            self.logger.info(f'Table {friendly_table_name} already exists.', tags=tags)
        else:
            self.logger.info(f'Table {friendly_table_name} doesn’t exists.', tags=tags)

        for r in record_data:
            r['record'] = update_record_with_internal_columns(r['record'])

        df = pd.DataFrame([d[KEY_RECORD] for d in record_data])
        df_count = len(df.index)

        total_byte_size = int(df.memory_usage(deep=True).sum())
        batches = math.ceil(total_byte_size / MAX_BYTE_SIZE_PER_WRITE)
        records_per_batch = math.ceil(df_count / batches)

        if self.disable_column_type_check.get(stream):
            schema = None
        else:
            df, schema = self.build_schema(stream, df)

        records_remaining = df_count
        for idx in range(batches):
            idx_start = idx * records_per_batch
            idx_end = (idx + 1) * records_per_batch
            df_batch = df.iloc[idx_start:idx_end]
            batch_size = len(df_batch.index)

            tags2 = merge_dict(tags, dict(
                batch_byte_size=int(df_batch.memory_usage(deep=True).sum()),
                batch_size=batch_size,
                batches=batches,
                index=idx,
                records_per_batch=records_per_batch,
                total_byte_size=total_byte_size,
            ))

            self.logger.info(f'Inserting records for batch {idx} started.', tags=tags2)

            write_deltalake(
                table or table_uri,
                data=df_batch,
                mode=MODE_APPEND if idx >= 1 else self.mode,
                overwrite_schema=True,
                partition_by=self.partition_keys.get(stream, []),
                schema=schema,
                storage_options=storage_options if not table else None,
            )

            tags3 = merge_dict(tags2, dict(
                records_remaining=records_remaining - batch_size,
            ))
            self.logger.info(f'Inserting records for batch {idx} completed.', tags=tags3)

            self.__after_write_for_batch(stream, idx, tags=tags3)

        tags.update(records_inserted=df_count)

        self.logger.info('Export data completed.', tags=tags)

    def after_write_for_batch(self, stream, index, **kwargs) -> None:
        pass

    def __after_write_for_batch(self, stream, index, **kwargs) -> None:
        tags = kwargs.get('tags', {})

        self.logger.info(f'Handle after write callback for batch {index} started.', tags=tags)
        self.after_write_for_batch(stream, index, **kwargs)
        self.logger.info(f'Handle after write callback for batch {index} completed.', tags=tags)


def main(destination_class):
    destination = destination_class(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
