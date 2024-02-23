"""Sink classes load data to a target."""

from __future__ import annotations

import abc
import datetime
import json
import time
import typing as t
import uuid
from gzip import GzipFile
from gzip import open as gzip_open
from types import MappingProxyType

from dateutil import parser
from jsonschema import Draft7Validator, FormatChecker
from singer_sdk.helpers._batch import (
    BaseBatchFileEncoding,
    BatchConfig,
    BatchFileFormat,
    StorageTarget,
)
from singer_sdk.helpers._compat import final
from singer_sdk.helpers._typing import (
    DatetimeErrorTreatmentEnum,
    get_datelike_property_type,
    handle_invalid_timestamp_in_record,
)

if t.TYPE_CHECKING:
    from singer_sdk.plugin_base import PluginBase

JSONSchemaValidator = Draft7Validator


class Sink(metaclass=abc.ABCMeta):
    """Abstract base class for target sinks."""

    # max timestamp/datetime supported, used to reset invalid dates

    MAX_SIZE_DEFAULT = 10000

    def __init__(
        self,
        target: PluginBase,
        stream_name: str,
        schema: dict,
        key_properties: list[str] | None,
    ) -> None:
        """Initialize target sink.

        Args:
            target: Target instance.
            stream_name: Name of the stream to sink.
            schema: Schema of the stream to sink.
            key_properties: Primary key of the stream to sink.
        """
        self.logger = target.logger
        self._config = dict(target.config)
        self._pending_batch: dict | None = None
        self.stream_name = stream_name
        self.logger.info(
            f"Initializing target sink for stream {stream_name} ..."
        )
        self.schema = schema
        if self.include_sdc_metadata_properties:
            self._add_sdc_metadata_to_schema()
        else:
            self._remove_sdc_metadata_from_schema()
        self.records_to_drain: list[dict] | t.Any = []
        self._context_draining: dict | None = None
        self.latest_state: dict | None = None
        self._draining_state: dict | None = None
        self.drained_state: dict | None = None
        self._key_properties = key_properties or []

        # Tally counters
        self._total_records_written: int = 0
        self._total_dupe_records_merged: int = 0
        self._total_records_read: int = 0
        self._batch_records_read: int = 0
        self._batch_dupe_records_merged: int = 0

        self._validator = Draft7Validator(schema, format_checker=FormatChecker())

    def _get_context(self, record: dict) -> dict:  # noqa: ARG002
        """Return an empty dictionary by default.

        NOTE: Future versions of the SDK may expand the available context attributes.

        Args:
            record: Individual record in the stream.

        Returns:
            TODO
        """
        return {}

    # Size properties

    @property
    def max_size(self) -> int:
        """Get max batch size.

        Returns:
            Max number of records to batch before `is_full=True`
        """
        return self.MAX_SIZE_DEFAULT

    @property
    def current_size(self) -> int:
        """Get current batch size.

        Returns:
            The number of records to drain.
        """
        return self._batch_records_read

    @property
    def is_full(self) -> bool:
        """Check against size limit.

        Returns:
            True if the sink needs to be drained.
        """
        return self.current_size >= self.max_size

    # Tally methods

    @final
    def tally_record_read(self, count: int = 1) -> None:
        """Increment the records read tally.

        This method is called automatically by the SDK when records are read.

        Args:
            count: Number to increase record count by.
        """
        self._total_records_read += count
        self._batch_records_read += count

    @final
    def tally_record_written(self, count: int = 1) -> None:
        """Increment the records written tally.

        This method is called automatically by the SDK after
        :meth:`~singer_sdk.Sink.process_record()`
        or :meth:`~singer_sdk.Sink.process_batch()`.

        Args:
            count: Number to increase record count by.
        """
        self._total_records_written += count

    @final
    def tally_duplicate_merged(self, count: int = 1) -> None:
        """Increment the records merged tally.

        This method should be called directly by the Target implementation.

        Args:
            count: Number to increase record count by.
        """
        self._total_dupe_records_merged += count
        self._batch_dupe_records_merged += count

    # Properties

    @property
    def config(self) -> t.Mapping[str, t.Any]:
        """Get plugin configuration.

        Returns:
            A frozen (read-only) config dictionary map.
        """
        return MappingProxyType(self._config)

    @property
    def batch_config(self) -> BatchConfig | None:
        """Get batch configuration.

        Returns:
            A frozen (read-only) config dictionary map.
        """
        raw = self.config.get("batch_config")
        return BatchConfig.from_dict(raw) if raw else None

    @property
    def include_sdc_metadata_properties(self) -> bool:
        """Check if metadata columns should be added.

        Returns:
            True if metadata columns should be added.
        """
        return self.config.get("add_record_metadata", False)

    @property
    def datetime_error_treatment(self) -> DatetimeErrorTreatmentEnum:
        """Return a treatment to use for datetime parse errors: ERROR. MAX, or NULL.

        Returns:
            TODO
        """
        return DatetimeErrorTreatmentEnum.ERROR

    @property
    def key_properties(self) -> list[str]:
        """Return key properties.

        Returns:
            A list of stream key properties.
        """
        return self._key_properties

    # Record processing

    def _add_sdc_metadata_to_record(
        self,
        record: dict,
        message: dict,
        context: dict,
    ) -> None:
        """Populate metadata _sdc columns from incoming record message.

        Record metadata specs documented at:
        https://sdk.meltano.com/en/latest/implementation/record_metadata.md

        Args:
            record: Individual record in the stream.
            message: TODO
            context: Stream partition or context dictionary.
        """
        record["_sdc_extracted_at"] = message.get("time_extracted")
        record["_sdc_received_at"] = datetime.datetime.now(
            tz=datetime.timezone.utc,
        ).isoformat()
        record["_sdc_batched_at"] = (
            context.get("batch_start_time", None)
            or datetime.datetime.now(tz=datetime.timezone.utc)
        ).isoformat()
        record["_sdc_deleted_at"] = record.get("_sdc_deleted_at")
        record["_sdc_sequence"] = int(round(time.time() * 1000))
        record["_sdc_table_version"] = message.get("version")

    def _add_sdc_metadata_to_schema(self) -> None:
        """Add _sdc metadata columns.

        Record metadata specs documented at:
        https://sdk.meltano.com/en/latest/implementation/record_metadata.md
        """
        properties_dict = self.schema["properties"]
        for col in {
            "_sdc_extracted_at",
            "_sdc_received_at",
            "_sdc_batched_at",
            "_sdc_deleted_at",
        }:
            properties_dict[col] = {
                "type": ["null", "string"],
                "format": "date-time",
            }
        for col in {"_sdc_sequence", "_sdc_table_version"}:
            properties_dict[col] = {"type": ["null", "integer"]}

    def _remove_sdc_metadata_from_schema(self) -> None:
        """Remove _sdc metadata columns.

        Record metadata specs documented at:
        https://sdk.meltano.com/en/latest/implementation/record_metadata.md
        """
        properties_dict = self.schema["properties"]
        for col in {
            "_sdc_extracted_at",
            "_sdc_received_at",
            "_sdc_batched_at",
            "_sdc_deleted_at",
            "_sdc_sequence",
            "_sdc_table_version",
        }:
            properties_dict.pop(col, None)

    def _remove_sdc_metadata_from_record(self, record: dict) -> None:
        """Remove metadata _sdc columns from incoming record message.

        Record metadata specs documented at:
        https://sdk.meltano.com/en/latest/implementation/record_metadata.md

        Args:
            record: Individual record in the stream.
        """
        record.pop("_sdc_extracted_at", None)
        record.pop("_sdc_received_at", None)
        record.pop("_sdc_batched_at", None)
        record.pop("_sdc_deleted_at", None)
        record.pop("_sdc_sequence", None)
        record.pop("_sdc_table_version", None)

    # Record validation

    def _validate_and_parse(self, record: dict) -> dict:
        """Validate or repair the record, parsing to python-native types as needed.

        Args:
            record: Individual record in the stream.

        Returns:
            TODO
        """
        self._validator.validate(record)
        self._parse_timestamps_in_record(
            record=record,
            schema=self.schema,
            treatment=self.datetime_error_treatment,
        )
        return record

    def _parse_timestamps_in_record(
        self,
        record: dict,
        schema: dict,
        treatment: DatetimeErrorTreatmentEnum,
    ) -> None:
        """Parse strings to datetime.datetime values, repairing or erroring on failure.

        Attempts to parse every field that is of type date/datetime/time. If its value
        is out of range, repair logic will be driven by the `treatment` input arg:
        MAX, NULL, or ERROR.

        Args:
            record: Individual record in the stream.
            schema: TODO
            treatment: TODO
        """
        for key in record:
            datelike_type = get_datelike_property_type(schema["properties"][key])
            if datelike_type:
                date_val = record[key]
                try:
                    if record[key] is not None:
                        date_val = parser.parse(date_val)
                except parser.ParserError as ex:
                    date_val = handle_invalid_timestamp_in_record(
                        record,
                        [key],
                        date_val,
                        datelike_type,
                        ex,
                        treatment,
                        self.logger,
                    )
                record[key] = date_val

    def _after_process_record(self, context: dict) -> None:
        """Perform post-processing and record keeping. Internal hook.

        Args:
            context: Stream partition or context dictionary.
        """
        self.logger.debug(f"Processed record: {context}")

    # SDK developer overrides:

    def preprocess_record(self, record: dict, context: dict) -> dict:  # noqa: ARG002
        """Process incoming record and return a modified result.

        Args:
            record: Individual record in the stream.
            context: Stream partition or context dictionary.

        Returns:
            A new, processed record.
        """
        return record

    @abc.abstractmethod
    def process_record(self, record: dict, context: dict) -> None:
        """Load the latest record from the stream.

        Implementations may either load to the `context` dict for staging (the
        default behavior for Batch types), or permanently write out to the target.

        Anything appended to :attr:`singer_sdk.Sink.records_to_drain` will be
        automatically passed to
        :meth:`~singer_sdk.Sink.process_batch()` to be permanently written during the
        process_batch operation.

        If duplicates are merged, these can be tracked via
        :meth:`~singer_sdk.Sink.tally_duplicate_merged()`.

        Args:
            record: Individual record in the stream.
            context: Stream partition or context dictionary.
        """

    def start_drain(self) -> dict:
        """Set and return `self._context_draining`.

        Returns:
            TODO
        """
        self._context_draining = self._pending_batch or {}
        self._pending_batch = None
        return self._context_draining

    @abc.abstractmethod
    def process_batch(self, context: dict) -> None:
        """Process all records per the batch's `context` dictionary.

        If duplicates are merged, these can optionally be tracked via
        `tally_duplicate_merged()`.

        Args:
            context: Stream partition or context dictionary.

        Raises:
            NotImplementedError: If derived class does not override this method.
        """
        msg = "No handling exists for process_batch()."
        raise NotImplementedError(msg)

    def mark_drained(self) -> None:
        """Reset `records_to_drain` and any other tracking."""
        self.drained_state = self._draining_state
        self._draining_state = None
        self._context_draining = None
        if self._batch_records_read:
            self.tally_record_written(
                self._batch_records_read - self._batch_dupe_records_merged,
            )
        self._batch_records_read = 0

    def activate_version(self, new_version: int) -> None:
        """Bump the active version of the target table.

        This method should be overridden by developers if a custom implementation is
        expected.

        Args:
            new_version: The version number to activate.
        """
        _ = new_version
        self.logger.info(
            "ACTIVATE_VERSION message received but not implemented by this target. "
            "Ignoring.",
        )

    def setup(self) -> None:
        """Perform any setup actions at the beginning of a Stream.

        Setup is executed once per Sink instance, after instantiation. If a Schema
        change is detected, a new Sink is instantiated and this method is called again.
        """
        self.logger.info(f"Setting up {self.stream_name}")

    def clean_up(self) -> None:
        """Perform any clean up actions required at end of a stream.

        Implementations should ensure that clean up does not affect resources
        that may be in use from other instances of the same sink. Stream name alone
        should not be relied on, it's recommended to use a uuid as well.
        """
        self.logger.info(f"Cleaning up {self.stream_name}")

    def process_batch_files(
        self,
        encoding: BaseBatchFileEncoding,
        files: t.Sequence[str],
    ) -> None:
        """Process a batch file with the given batch context.

        Args:
            encoding: The batch file encoding.
            files: The batch files to process.

        Raises:
            NotImplementedError: If the batch file encoding is not supported.
        """
        file: GzipFile | t.IO
        storage: StorageTarget | None = None

        for path in files:
            head, tail = StorageTarget.split_url(path)

            if self.batch_config:
                storage = self.batch_config.storage
            else:
                storage = StorageTarget.from_url(head)

            if encoding.format == BatchFileFormat.JSONL:
                with storage.fs(create=False) as batch_fs, batch_fs.open(
                    tail,
                    mode="rb",
                ) as file:
                    open_file = (
                        gzip_open(file) if encoding.compression == "gzip" else file
                    )
                    context = {
                        "records": [
                            json.loads(line)
                            for line in open_file  # type: ignore[attr-defined]
                        ],
                    }
                    self.process_batch(context)
            else:
                msg = f"Unsupported batch encoding format: {encoding.format}"
                raise NotImplementedError(msg)


class BatchSink(Sink):
    """Base class for batched record writers."""

    def _get_context(self, record: dict) -> dict:  # noqa: ARG002
        """Return a batch context. If no batch is active, return a new batch context.

        The SDK-generated context will contain `batch_id` (GUID string) and
        `batch_start_time` (datetime).

        NOTE: Future versions of the SDK may expand the available context attributes.

        Args:
            record: Individual record in the stream.

        Returns:
            TODO
        """
        if self._pending_batch is None:
            new_context = {
                "batch_id": str(uuid.uuid4()),
                "batch_start_time": datetime.datetime.now(tz=datetime.timezone.utc),
            }
            self.start_batch(new_context)
            self._pending_batch = new_context

        return self._pending_batch

    def start_batch(self, context: dict) -> None:
        """Start a new batch with the given context.

        The SDK-generated context will contain `batch_id` (GUID string) and
        `batch_start_time` (datetime).

        Developers may optionally override this method to add custom markers to the
        `context` dict and/or to initialize batch resources - such as initializing a
        local temp file to hold batch records before uploading.

        Args:
            context: Stream partition or context dictionary.
        """

    def process_record(self, record: dict, context: dict) -> None:
        """Load the latest record from the stream.

        Developers may either load to the `context` dict for staging (the
        default behavior for Batch types), or permanently write out to the target.

        If this method is not overridden, the default implementation will create a
        `context["records"]` list and append all records for processing during
        :meth:`~singer_sdk.BatchSink.process_batch()`.

        If duplicates are merged, these can be tracked via
        :meth:`~singer_sdk.Sink.tally_duplicate_merged()`.

        Args:
            record: Individual record in the stream.
            context: Stream partition or context dictionary.
        """
        if "records" not in context:
            context["records"] = []

        context["records"].append(record)

    @abc.abstractmethod
    def process_batch(self, context: dict) -> None:
        """Process a batch with the given batch context.

        This method must be overridden.

        If :meth:`~singer_sdk.BatchSink.process_record()` is not overridden,
        the `context["records"]` list will contain all records from the given batch
        context.

        If duplicates are merged, these can be tracked via
        :meth:`~singer_sdk.Sink.tally_duplicate_merged()`.

        Args:
            context: Stream partition or context dictionary.
        """
