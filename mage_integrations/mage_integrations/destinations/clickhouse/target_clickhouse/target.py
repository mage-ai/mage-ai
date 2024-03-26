from __future__ import annotations

import json
import logging
import sys
import typing as t
from collections import Counter, defaultdict

from singer_sdk import typing as th
from singer_sdk.io_base import SingerMessageType

from mage_integrations.destinations.clickhouse.target_clickhouse.sinks import (
    ClickhouseSink,
)
from mage_integrations.destinations.target import SQLTarget

LOGGER = logging.getLogger(__name__)


class TargetClickhouse(SQLTarget):
    """SQL-based target for Clickhouse."""

    name = "target-clickhouse"

    config_jsonschema = th.PropertiesList(
        th.Property(
            "sqlalchemy_url",
            th.StringType,
            description="SQLAlchemy connection string",
        ),
        th.Property(
            "table_name",
            th.StringType,
            description="The name of the table to write to. Defaults to stream name.",
        ),
    ).to_dict()

    default_sink_class = ClickhouseSink

    def __init__(self, *, config=None, parse_env_config: bool = False,
                 validate_config: bool = True, logger=None) -> None:

        self._logger = logger if logger is not None else LOGGER

        super().__init__(config=config, parse_env_config=parse_env_config,
                         validate_config=validate_config)

    @property
    def logger(self):
        """Get logger.

        Returns:
            Plugin logger.
        """

        logger = self._logger

        return logger

    def listen_override(self, file_input: t.IO[str] | None = None) -> None:
        if not file_input:
            file_input = sys.stdin

        self._process_lines_override(file_input)
        self._process_endofpipe()

    def _process_lines_override(self, file_input: t.IO[str]) -> t.Counter[str]:
        """Internal method to process jsonl lines from a Singer tap.

        Args:
            file_input: Readable stream of messages, each on a separate line.

        Returns:
            A counter object for the processed lines.
        """
        self.logger.info(
            f"Target {self.name} is listening for input from tap.")
        counter = self._process_lines_internal(file_input)

        line_count = sum(counter.values())

        self.logger.info(
            f"Target {self.name} completed reading {line_count} lines of input"
            f"({counter[SingerMessageType.RECORD]} records"
            f"{counter[SingerMessageType.BATCH]} batch manifests"
            f"{counter[SingerMessageType.STATE]} state messages)."
        )

        return counter

    def _process_lines_internal(self, file_input: t.IO[str]) -> t.Counter[str]:
        """Internal method to process jsonl lines from a Singer tap.

        Args:
            file_input: Readable stream of messages, each on a separate line.

        Returns:
            A counter object for the processed lines.

        Raises:
            json.decoder.JSONDecodeError: raised if any lines are not valid
        """
        stats: dict[str, int] = defaultdict(int)
        for line in file_input.readlines():
            row = None
            try:
                row = json.loads(line)
            except json.decoder.JSONDecodeError:
                self.logger.info(f'Unable to parse: {line}')
                continue

            if not row:
                self.logger.info(f'No valid row data {row} for line: {line}')
                continue

            record_type: SingerMessageType = row.get('type')
            if record_type == SingerMessageType.SCHEMA:
                self._process_schema_message(row)

            elif record_type == SingerMessageType.RECORD:
                self._process_record_message(row)

            elif record_type == SingerMessageType.ACTIVATE_VERSION:
                self._process_activate_version_message(row)

            elif record_type == SingerMessageType.STATE:
                self._process_state_message(row)

            elif record_type == SingerMessageType.BATCH:
                self._process_batch_message(row)

            else:
                continue

            stats[record_type] += 1

        return Counter(**stats)
