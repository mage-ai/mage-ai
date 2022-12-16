import json
import os.path
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import (
    TYPE_CHECKING,
    Any,
    Dict,
    Iterable,
    Iterator,
    List,
    Mapping,
    Optional,
    Tuple,
    Union,
)

from deltalake.fs import DeltaStorageHandler as DeltaStorageHandlerParent

if TYPE_CHECKING:
    import pandas as pd

import sys

if sys.version_info >= (3, 8):
    from typing import Literal
else:
    from typing_extensions import Literal

import pyarrow as pa
import pyarrow.dataset as ds
import pyarrow.fs as pa_fs
from pyarrow.lib import RecordBatchReader

from mage_integrations.destinations.delta_lake.schema import delta_arrow_schema_from_pandas

from deltalake._internal import DeltaDataChecker as _DeltaDataChecker
from deltalake._internal import PyDeltaTableError
from deltalake._internal import write_new_deltalake as _write_new_deltalake
from deltalake.table import MAX_SUPPORTED_WRITER_VERSION, DeltaTable, DeltaTableProtocolError

try:
    import pandas as pd
except ModuleNotFoundError:
    _has_pandas = False
else:
    _has_pandas = True

PYARROW_MAJOR_VERSION = int(pa.__version__.split(".", maxsplit=1)[0])


class DeltaStorageHandler(DeltaStorageHandlerParent):
    def delete_dir_contents(self, path: str, *args, **kwargs) -> None:
        super().delete_dir_contents(path)


@dataclass
class AddAction:
    path: str
    size: int
    partition_values: Mapping[str, Optional[str]]
    modification_time: int
    data_change: bool
    stats: str


def write_deltalake(
    table_or_uri: Union[str, DeltaTable],
    data: Union[
        "pd.DataFrame",
        pa.Table,
        pa.RecordBatch,
        Iterable[pa.RecordBatch],
        RecordBatchReader,
    ],
    *,
    schema: Optional[pa.Schema] = None,
    partition_by: Optional[List[str]] = None,
    filesystem: Optional[pa_fs.FileSystem] = None,
    mode: Literal["error", "append", "overwrite", "ignore"] = "error",
    file_options: Optional[ds.ParquetFileWriteOptions] = None,
    max_open_files: int = 1024,
    max_rows_per_file: int = 10 * 1024 * 1024,
    min_rows_per_group: int = 64 * 1024,
    max_rows_per_group: int = 128 * 1024,
    name: Optional[str] = None,
    description: Optional[str] = None,
    configuration: Optional[Mapping[str, Optional[str]]] = None,
    overwrite_schema: bool = False,
    storage_options: Optional[Dict[str, str]] = None,
) -> None:
    """Write to a Delta Lake table (Experimental)

    If the table does not already exist, it will be created.

    This function only supports protocol version 1 currently. If an attempting
    to write to an existing table with a higher min_writer_version, this
    function will throw DeltaTableProtocolError.

    Note that this function does NOT register this table in a data catalog.

    :param table_or_uri: URI of a table or a DeltaTable object.
    :param data: Data to write. If passing iterable, the schema must also be given.
    :param schema: Optional schema to write.
    :param partition_by: List of columns to partition the table by. Only required
        when creating a new table.
    :param filesystem: Optional filesystem to pass to PyArrow. If not provided will
        be inferred from uri. The file system has to be rooted in the table root.
        Use the pyarrow.fs.SubTreeFileSystem, to adopt the root of pyarrow file systems.
    :param mode: How to handle existing data. Default is to error if table already exists.
        If 'append', will add new data.
        If 'overwrite', will replace table with new data.
        If 'ignore', will not write anything if table already exists.
    :param file_options: Optional write options for Parquet (ParquetFileWriteOptions).
        Can be provided with defaults using ParquetFileWriteOptions().make_write_options().
        Please refer to https://github.com/apache/arrow/blob/master/python/pyarrow/_dataset_parquet.pyx#L492-L533
        for the list of available options
    :param max_open_files: Limits the maximum number of
        files that can be left open while writing. If an attempt is made to open
        too many files then the least recently used file will be closed.
        If this setting is set too low you may end up fragmenting your
        data into many small files.
    :param max_rows_per_file: Maximum number of rows per file.
        If greater than 0 then this will limit how many rows are placed in any single file.
        Otherwise there will be no limit and one file will be created in each output directory
        unless files need to be closed to respect max_open_files
    :param min_rows_per_group: Minimum number of rows per group. When the value is set,
        the dataset writer will batch incoming data and only write the row groups to the disk
        when sufficient rows have accumulated.
    :param max_rows_per_group: Maximum number of rows per group.
        If the value is set, then the dataset writer may split up large incoming batches into multiple row groups.
        If this value is set, then min_rows_per_group should also be set.
    :param name: User-provided identifier for this table.
    :param description: User-provided description for this table.
    :param configuration: A map containing configuration options for the metadata action.
    :param overwrite_schema: If True, allows updating the schema of the table.
    :param storage_options: options passed to the native delta filesystem. Unused if 'filesystem' is defined.
    """

    if _has_pandas and isinstance(data, pd.DataFrame):
        if schema is not None:
            data = pa.Table.from_pandas(data, schema=schema)
        else:
            data, schema = delta_arrow_schema_from_pandas(data)

    if schema is None:
        if isinstance(data, RecordBatchReader):
            schema = data.schema
        elif isinstance(data, Iterable):
            raise ValueError("You must provide schema if data is Iterable")
        else:
            schema = data.schema

    if filesystem is not None:
        raise NotImplementedError("Filesystem support is not yet implemented.  #570")

    if isinstance(table_or_uri, str):
        if "://" in table_or_uri:
            table_uri = table_or_uri
        else:
            # Non-existant local paths are only accepted as fully-qualified URIs
            table_uri = "file://" + str(Path(table_or_uri).absolute())
        table = try_get_deltatable(table_or_uri, storage_options)
    else:
        table = table_or_uri
        table_uri = table._table.table_uri()

    __enforce_append_only(table=table, configuration=configuration, mode=mode)

    if filesystem is None:
        if table is not None:
            storage_options = table._storage_options or {}
            storage_options.update(storage_options or {})

        filesystem = pa_fs.PyFileSystem(DeltaStorageHandler(table_uri, storage_options))

    if table:  # already exists
        if schema != table.schema().to_pyarrow() and not (
            mode == "overwrite" and overwrite_schema
        ):
            raise ValueError(
                "Schema of data does not match table schema\n"
                f"Table schema:\n{schema}\nData Schema:\n{table.schema().to_pyarrow()}"
            )

        if mode == "error":
            raise AssertionError("DeltaTable already exists.")
        elif mode == "ignore":
            return

        current_version = table.version()

        if partition_by:
            assert partition_by == table.metadata().partition_columns

        if table.protocol().min_writer_version > MAX_SUPPORTED_WRITER_VERSION:
            raise DeltaTableProtocolError(
                "This table's min_writer_version is "
                f"{table.protocol().min_writer_version}, "
                "but this method only supports version 2."
            )
    else:  # creating a new table
        current_version = -1

    if partition_by:
        partition_schema = pa.schema([schema.field(name) for name in partition_by])
        partitioning = ds.partitioning(partition_schema, flavor="hive")
    else:
        partitioning = None

    add_actions: List[AddAction] = []

    def visitor(written_file: Any) -> None:
        path, partition_values = get_partitions_from_path(written_file.path)
        stats = get_file_stats_from_metadata(written_file.metadata)

        # PyArrow added support for written_file.size in 9.0.0
        if PYARROW_MAJOR_VERSION >= 9:
            size = written_file.size
        else:
            size = filesystem.get_file_info([path])[0].size  # type: ignore

        add_actions.append(
            AddAction(
                path,
                size,
                partition_values,
                int(datetime.now().timestamp()),
                True,
                json.dumps(stats, cls=DeltaJSONEncoder),
            )
        )

    if table is not None:
        # We don't currently provide a way to set invariants
        # (and maybe never will), so only enforce if already exist.
        invariants = table.schema().invariants
        checker = _DeltaDataChecker(invariants)

        def validate_batch(batch: pa.RecordBatch) -> pa.RecordBatch:
            checker.check_batch(batch)
            return batch

        if isinstance(data, RecordBatchReader):
            batch_iter = data
        elif isinstance(data, pa.RecordBatch):
            batch_iter = [data]
        elif isinstance(data, pa.Table):
            batch_iter = data.to_batches()
        else:
            batch_iter = data

        data = RecordBatchReader.from_batches(
            schema, (validate_batch(batch) for batch in batch_iter)
        )

    ds.write_dataset(
        data,
        base_dir="/",
        basename_template=f"{current_version + 1}-{uuid.uuid4()}-{{i}}.parquet",
        format="parquet",
        partitioning=partitioning,
        # It will not accept a schema if using a RBR
        schema=schema if not isinstance(data, RecordBatchReader) else None,
        file_visitor=visitor,
        existing_data_behavior="overwrite_or_ignore",
        file_options=file_options,
        max_open_files=max_open_files,
        max_rows_per_file=max_rows_per_file,
        min_rows_per_group=min_rows_per_group,
        max_rows_per_group=max_rows_per_group,
        filesystem=filesystem,
    )

    if table is None:
        _write_new_deltalake(
            table_uri,
            schema,
            add_actions,
            mode,
            partition_by or [],
            name,
            description,
            configuration,
            storage_options,
        )
    else:
        table._table.create_write_transaction(
            add_actions,
            mode,
            partition_by or [],
            schema,
        )


def __enforce_append_only(
    table: Optional[DeltaTable],
    configuration: Optional[Mapping[str, Optional[str]]],
    mode: str,
) -> None:
    """Throw ValueError if table configuration contains delta.appendOnly and mode is not append"""
    if table:
        configuration = table.metadata().configuration
    config_delta_append_only = (
        configuration and configuration.get("delta.appendOnly", "false") == "true"
    )
    if config_delta_append_only and mode != "append":
        raise ValueError(
            f"If configuration has delta.appendOnly = 'true', mode must be 'append'. Mode is currently {mode}"
        )


class DeltaJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, bytes):
            return obj.decode("unicode_escape")
        elif isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return str(obj)
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)


def try_get_deltatable(
    table_uri: str, storage_options: Optional[Dict[str, str]]
) -> Optional[DeltaTable]:
    try:
        return DeltaTable(table_uri, storage_options=storage_options)
    except PyDeltaTableError as err:
        # TODO: There has got to be a better way...
        if "Not a Delta table" in str(err):
            return None
        elif "cannot find" in str(err):
            return None
        elif "No such file or directory" in str(err):
            return None
        else:
            raise


def get_partitions_from_path(path: str) -> Tuple[str, Dict[str, Optional[str]]]:
    if path[0] == "/":
        path = path[1:]
    parts = path.split("/")
    parts.pop()  # remove filename
    out: Dict[str, Optional[str]] = {}
    for part in parts:
        if part == "":
            continue
        key, value = part.split("=", maxsplit=1)
        if value == "__HIVE_DEFAULT_PARTITION__":
            out[key] = None
        else:
            out[key] = value
    return path, out


def get_file_stats_from_metadata(
    metadata: Any,
) -> Dict[str, Union[int, Dict[str, Any]]]:
    stats = {
        "numRecords": metadata.num_rows,
        "minValues": {},
        "maxValues": {},
        "nullCount": {},
    }

    def iter_groups(metadata: Any) -> Iterator[Any]:
        for i in range(metadata.num_row_groups):
            yield metadata.row_group(i)

    for column_idx in range(metadata.num_columns):
        name = metadata.row_group(0).column(column_idx).path_in_schema
        # If stats missing, then we can't know aggregate stats
        if all(
            group.column(column_idx).is_stats_set for group in iter_groups(metadata)
        ):
            stats["nullCount"][name] = sum(
                group.column(column_idx).statistics.null_count
                for group in iter_groups(metadata)
            )

            # Min / max may not exist for some column types, or if all values are null
            if any(
                group.column(column_idx).statistics.has_min_max
                for group in iter_groups(metadata)
            ):
                # Min and Max are recorded in physical type, not logical type
                # https://stackoverflow.com/questions/66753485/decoding-parquet-min-max-statistics-for-decimal-type
                # TODO: Add logic to decode physical type for DATE, DECIMAL
                logical_type = (
                    metadata.row_group(0)
                    .column(column_idx)
                    .statistics.logical_type.type
                )

                if PYARROW_MAJOR_VERSION < 8 and logical_type not in [
                    "STRING",
                    "INT",
                    "TIMESTAMP",
                    "NONE",
                ]:
                    continue

                minimums = (
                    group.column(column_idx).statistics.min
                    for group in iter_groups(metadata)
                )
                # If some row groups have all null values, their min and max will be null too.
                stats["minValues"][name] = min(
                    minimum for minimum in minimums if minimum is not None
                )
                maximums = (
                    group.column(column_idx).statistics.max
                    for group in iter_groups(metadata)
                )
                stats["maxValues"][name] = max(
                    maximum for maximum in maximums if maximum is not None
                )
    return stats
