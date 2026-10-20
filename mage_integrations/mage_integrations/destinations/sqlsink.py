"""Sink classes load data to SQL targets."""

from __future__ import annotations

import re
import typing as t
from collections import defaultdict
from copy import copy
from textwrap import dedent

import sqlalchemy
from pendulum import now
from singer_sdk.connectors import SQLConnector
from singer_sdk.exceptions import ConformedNameClashException
from singer_sdk.helpers._conformers import replace_leading_digit
from sqlalchemy.sql.expression import bindparam

from mage_integrations.destinations.sink import BatchSink

if t.TYPE_CHECKING:
    from singer_sdk.plugin_base import PluginBase
    from sqlalchemy.sql import Executable


class SQLSink(BatchSink):
    """SQL-type sink type."""

    connector_class: type[SQLConnector]
    soft_delete_column_name = "_sdc_deleted_at"
    version_column_name = "_sdc_table_version"

    def __init__(
        self,
        target: PluginBase,
        stream_name: str,
        schema: dict,
        key_properties: list[str] | None,
        connector: SQLConnector | None = None,
    ) -> None:
        """Initialize SQL Sink.

        Args:
            target: The target object.
            stream_name: The source tap's stream name.
            schema: The JSON Schema definition.
            key_properties: The primary key columns.
            connector: Optional connector to reuse.
        """
        self._connector: SQLConnector
        self._connector = connector or self.connector_class(dict(target.config))
        super().__init__(target, stream_name, schema, key_properties)

    @property
    def connector(self) -> SQLConnector:
        """The connector object.

        Returns:
            The connector object.
        """
        return self._connector

    @property
    def connection(self) -> sqlalchemy.engine.Connection:
        """Get or set the SQLAlchemy connection for this sink.

        Returns:
            A connection object.
        """
        return self.connector.connection

    @property
    def table_name(self) -> str:
        """Return the table name, with no schema or database part.

        Returns:
            The target table name.
        """
        parts = self.stream_name.split("-")
        table = self.stream_name if len(parts) == 1 else parts[-1]
        return self.conform_name(table, "table")

    @property
    def schema_name(self) -> str | None:
        """Return the schema name or `None` if using names with no schema part.

        Returns:
            The target schema name.
        """
        # Look for a default_target_scheme in the configuraion fle
        default_target_schema: str = self.config.get("default_target_schema", None)
        parts = self.stream_name.split("-")

        # 1) When default_target_scheme is in the configuration use it
        # 2) if the streams are in <schema>-<table> format use the
        #    stream <schema>
        # 3) Return None if you don't find anything
        if default_target_schema:
            return default_target_schema

        if len(parts) in {2, 3}:
            # Stream name is a two-part or three-part identifier.
            # Use the second-to-last part as the schema name.
            return self.conform_name(parts[-2], "schema")

        # Schema name not detected.
        return None

    @property
    def database_name(self) -> str | None:
        """Return the DB name or `None` if using names with no database part."""
        # Assumes single-DB target context.

    @property
    def full_table_name(self) -> str:
        """Return the fully qualified table name.

        Returns:
            The fully qualified table name.
        """
        return self.connector.get_fully_qualified_name(
            table_name=self.table_name,
            schema_name=self.schema_name,
            db_name=self.database_name,
        )

    @property
    def full_schema_name(self) -> str:
        """Return the fully qualified schema name.

        Returns:
            The fully qualified schema name.
        """
        return self.connector.get_fully_qualified_name(
            schema_name=self.schema_name,
            db_name=self.database_name,
        )

    def conform_name(
        self,
        name: str,
        object_type: str | None = None,  # noqa: ARG002
    ) -> str:
        """Conform a stream property name to one suitable for the target system.

        Transforms names to snake case by default, applicable to most common DBMSs'.
        Developers may override this method to apply custom transformations
        to database/schema/table/column names.

        Args:
            name: Property name.
            object_type: One of ``database``, ``schema``, ``table`` or ``column``.


        Returns:
            The name transformed to snake case.
        """
        # strip non-alphanumeric characters
        name = re.sub(r"[^a-zA-Z0-9_\-\.\s]", "", name)
        # strip leading/trailing whitespace,
        # transform to lowercase and replace - . and spaces to _
        name = (
            name.lower()
            .lstrip()
            .rstrip()
            .replace(".", "_")
            .replace("-", "_")
            .replace(" ", "_")
        )
        # replace leading digit
        return replace_leading_digit(name)

    @staticmethod
    def _check_conformed_names_not_duplicated(
        conformed_property_names: dict[str, str],
    ) -> None:
        """Check if conformed names produce duplicate keys.

        Args:
            conformed_property_names: A name:conformed_name dict map.

        Raises:
            ConformedNameClashException: if duplicates found.
        """
        # group: {'_a': ['1_a'], 'abc': ['aBc', 'abC']}  # noqa: ERA001
        grouped = defaultdict(list)
        for k, v in conformed_property_names.items():
            grouped[v].append(k)

        # filter
        duplicates = list(filter(lambda p: len(p[1]) > 1, grouped.items()))
        if duplicates:
            msg = (
                "Duplicate stream properties produced when conforming property names: "
                f"{duplicates}"
            )
            raise ConformedNameClashException(msg)

    def conform_schema(self, schema: dict) -> dict:
        """Return schema dictionary with property names conformed.

        Args:
            schema: JSON schema dictionary.

        Returns:
            A schema dictionary with the property names conformed.
        """
        conformed_schema = copy(schema)
        conformed_property_names = {
            key: self.conform_name(key) for key in conformed_schema["properties"]
        }
        self._check_conformed_names_not_duplicated(conformed_property_names)
        conformed_schema["properties"] = {
            conformed_property_names[key]: value
            for key, value in conformed_schema["properties"].items()
        }
        return conformed_schema

    def conform_record(self, record: dict) -> dict:
        """Return record dictionary with property names conformed.

        Args:
            record: Dictionary representing a single record.

        Returns:
            New record dictionary with conformed column names.
        """
        conformed_property_names = {key: self.conform_name(key) for key in record}
        self._check_conformed_names_not_duplicated(conformed_property_names)
        return {conformed_property_names[key]: value for key, value in record.items()}

    def setup(self) -> None:
        """Set up Sink.

        This method is called on Sink creation, and creates the required Schema and
        Table entities in the target database.
        """
        if self.schema_name:
            self.connector.prepare_schema(self.schema_name)
        self.connector.prepare_table(
            full_table_name=self.full_table_name,
            schema=self.conform_schema(self.schema),
            primary_keys=self.key_properties,
            as_temp_table=False,
        )

    @property
    def key_properties(self) -> list[str]:
        """Return key properties, conformed to target system naming requirements.

        Returns:
            A list of key properties, conformed with `self.conform_name()`
        """
        return [self.conform_name(key, "column") for key in super().key_properties]

    def process_batch(self, context: dict) -> None:
        """Process a batch with the given batch context.

        Writes a batch to the SQL target. Developers may override this method
        in order to provide a more efficient upload/upsert process.

        Args:
            context: Stream partition or context dictionary.
        """
        # If duplicates are merged, these can be tracked via
        # :meth:`~singer_sdk.Sink.tally_duplicate_merged()`.
        self.bulk_insert_records(
            full_table_name=self.full_table_name,
            schema=self.schema,
            records=context["records"],
        )

    def generate_insert_statement(
        self,
        full_table_name: str,
        schema: dict,
    ) -> str | Executable:
        """Generate an insert statement for the given records.

        Args:
            full_table_name: the target table name.
            schema: the JSON schema for the new table.

        Returns:
            An insert statement.
        """
        property_names = list(self.conform_schema(schema)["properties"].keys())
        statement = dedent(
            f"""\
            INSERT INTO {full_table_name}
            ({", ".join(property_names)})
            VALUES ({", ".join([f":{name}" for name in property_names])})
            """,  # noqa: S608
        )
        return statement.rstrip()

    def bulk_insert_records(
        self,
        full_table_name: str,
        schema: dict,
        records: t.Iterable[dict[str, t.Any]],
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
        insert_sql = self.generate_insert_statement(
            full_table_name,
            schema,
        )
        if isinstance(insert_sql, str):
            insert_sql = sqlalchemy.text(insert_sql)

        conformed_records = (
            [self.conform_record(record) for record in records]
            if isinstance(records, list)
            else (self.conform_record(record) for record in records)
        )
        self.logger.info(f"Inserting with SQL: {insert_sql}")
        with self.connector._connect() as conn, conn.begin():
            conn.execute(insert_sql, conformed_records)
        return len(conformed_records) if isinstance(conformed_records, list) else None

    def merge_upsert_from_table(
        self,
        target_table_name: str,
        from_table_name: str,
        join_keys: list[str],
    ) -> int | None:
        """Merge upsert data from one table to another.

        Args:
            target_table_name: The destination table name.
            from_table_name: The source table name.
            join_keys: The merge upsert keys, or `None` to append.

        Return:
            The number of records copied, if detectable, or `None` if the API does not
            report number of records affected/inserted.

        Raises:
            NotImplementedError: if the merge upsert capability does not exist or is
                undefined.
        """
        raise NotImplementedError

    def activate_version(self, new_version: int) -> None:
        """Bump the active version of the target table.

        Args:
            new_version: The version number to activate.
        """
        # There's nothing to do if the table doesn't exist yet
        # (which it won't the first time the stream is processed)
        if not self.connector.table_exists(self.full_table_name):
            return

        deleted_at = now()

        if not self.connector.column_exists(
            full_table_name=self.full_table_name,
            column_name=self.version_column_name,
        ):
            self.connector.prepare_column(
                self.full_table_name,
                self.version_column_name,
                sql_type=sqlalchemy.types.Integer(),
            )

        if self.config.get("hard_delete", True):
            with self.connector._connect() as conn, conn.begin():
                conn.execute(
                    sqlalchemy.text(
                        f"DELETE FROM {self.full_table_name} "  # noqa: S608
                        f"WHERE {self.version_column_name} <= {new_version}",
                    ),
                )
            return

        if not self.connector.column_exists(
            full_table_name=self.full_table_name,
            column_name=self.soft_delete_column_name,
        ):
            self.connector.prepare_column(
                self.full_table_name,
                self.soft_delete_column_name,
                sql_type=sqlalchemy.types.DateTime(),
            )

        query = sqlalchemy.text(
            f"UPDATE {self.full_table_name}\n"  # noqa: S608
            f"SET {self.soft_delete_column_name} = :deletedate \n"
            f"WHERE {self.version_column_name} < :version \n"
            f"  AND {self.soft_delete_column_name} IS NULL\n",
        )
        query = query.bindparams(
            bindparam("deletedate", value=deleted_at, type_=sqlalchemy.types.DateTime),
            bindparam("version", value=new_version, type_=sqlalchemy.types.Integer),
        )
        with self.connector._connect() as conn, conn.begin():
            conn.execute(query)


__all__ = ["SQLSink", "SQLConnector"]
