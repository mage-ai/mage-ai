"""clickhouse target sink class, which handles writing streams."""

from __future__ import annotations

import typing
from typing import TYPE_CHECKING, Any, Iterable

import simplejson as json
import sqlalchemy.types
from clickhouse_sqlalchemy import Table, engines
from singer_sdk import typing as th
from singer_sdk.connectors import SQLConnector
from sqlalchemy import Column, MetaData, create_engine

from mage_integrations.destinations.sqlsink import SQLSink

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine


class ClickhouseConnector(SQLConnector):
    """Clickhouse Meltano Connector.

    Inherits from `SQLConnector` class, overriding methods where needed
    for Clickhouse compatibility.
    """

    allow_column_add: bool = True  # Whether ADD COLUMN is supported.
    allow_column_rename: bool = True  # Whether RENAME COLUMN is supported.
    allow_column_alter: bool = False  # Whether altering column types is supported.
    allow_merge_upsert: bool = False  # Whether MERGE UPSERT is supported.
    allow_temp_tables: bool = True  # Whether temp tables are supported.

    def get_sqlalchemy_url(self, config: dict) -> str:
        """Generates a SQLAlchemy URL for clickhouse.

        Args:
            config: The configuration for the connector.
        """
        return super().get_sqlalchemy_url(config)

    def create_engine(self) -> Engine:
        """Create a SQLAlchemy engine for clickhouse."""
        return create_engine(self.get_sqlalchemy_url(self.config))

    def to_sql_type(self, jsonschema_type: dict) -> sqlalchemy.types.TypeEngine:
        """Return a JSON Schema representation of the provided type.

        Developers may override this method to accept additional input argument types,
        to support non-standard types, or to provide custom typing logic.

        Args:
            jsonschema_type: The JSON Schema representation of the source type.

        Returns:
            The SQLAlchemy type representation of the data type.
        """
        sql_type = th.to_sql_type(jsonschema_type)

        # Clickhouse does not support the DECIMAL type without providing precision,
        # so we need to use the FLOAT type.
        if type(sql_type) == sqlalchemy.types.DECIMAL:
            sql_type = typing.cast(
                sqlalchemy.types.TypeEngine, sqlalchemy.types.FLOAT(),
            )

        return sql_type

    def create_empty_table(
        self,
        full_table_name: str,
        schema: dict,
        primary_keys: list[str] | None = None,
        partition_keys: list[str] | None = None,
        as_temp_table: bool = False,  # noqa: FBT001, FBT002
    ) -> None:
        """Create an empty target table, using Clickhouse Engine.

        Args:
            full_table_name: the target table name.
            schema: the JSON schema for the new table.
            primary_keys: list of key properties.
            partition_keys: list of partition keys.
            as_temp_table: True to create a temp table.

        Raises:
            NotImplementedError: if temp tables are unsupported and as_temp_table=True.
            RuntimeError: if a variant schema is passed with no properties defined.
        """
        if as_temp_table:
            msg = "Temporary tables are not supported."
            raise NotImplementedError(msg)

        _ = partition_keys  # Not supported in generic implementation.

        _, _, table_name = self.parse_full_table_name(full_table_name)

        # If config table name is set, then use it instead of the table name.
        if self.config.get("table_name"):
            table_name = self.config.get("table_name")

        # Do not set schema, as it is not supported by Clickhouse.
        meta = MetaData(schema=None, bind=self._engine)
        columns: list[Column] = []
        primary_keys = primary_keys or []
        try:
            properties: dict = schema["properties"]
        except KeyError as e:
            msg = f"Schema for '{full_table_name}' does not define properties: {schema}"
            raise RuntimeError(msg) from e
        for property_name, property_jsonschema in properties.items():
            is_primary_key = property_name in primary_keys
            columns.append(
                Column(
                    property_name,
                    self.to_sql_type(property_jsonschema),
                    primary_key=is_primary_key,
                ),
            )

        table_engine = engines.MergeTree(primary_key=primary_keys)
        _ = Table(table_name, meta, *columns, table_engine)
        meta.create_all(self._engine)

    def prepare_schema(self, _: str) -> None:
        """Create the target database schema.

        In Clickhouse, a schema is a database, so this method is a no-op.

        Args:
            schema_name: The target schema name.
        """
        return


class ClickhouseSink(SQLSink):
    """clickhouse target sink class."""

    connector_class = ClickhouseConnector

    @property
    def full_table_name(self) -> str:
        """Return the fully qualified table name.

        Returns
            The fully qualified table name.
        """
        # Use the config table name if set.
        if self.config.get("table_name"):
            return self.config.get("table_name")

        return self.connector.get_fully_qualified_name(
            table_name=self.table_name,
            schema_name=self.schema_name,
            db_name=self.database_name,
        )

    def bulk_insert_records(
            self,
            full_table_name: str,
            schema: dict,
            records: Iterable[dict[str, Any]],
         ) -> int | None:
        """Bulk insert records to an existing destination table.

        The default implementation uses a generic SQLAlchemy bulk insert operation.
        This method may optionally be overridden by developers in order to provide
        faster, native bulk uploads.

        Args:
            full_table_name: the target table name.
            schema: the JSON schema for the new table, to be used when inferring column
                names.
            records: the input records.

        Returns:
            True if table exists, False if not, None if unsure or undetectable.
        """
        # Need to convert any records with a dict type to a JSON string.
        for record in records:
            for key, value in record.items():
                if isinstance(value, dict):
                    record[key] = json.dumps(value)

        return super().bulk_insert_records(full_table_name, schema, records)

    def _validate_and_parse(self, record: dict) -> dict:
        """Validate or repair the record, parsing to python-native types as needed.

        Args:
            record: Individual record in the stream.

        Returns:
            TODO
        """
        self._parse_timestamps_in_record(
            record=record,
            schema=self.schema,
            treatment=self.datetime_error_treatment,
        )
        return record
