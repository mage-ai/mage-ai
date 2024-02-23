"""MongoDB target class."""
import copy
import json
import logging
import sys
import typing as t
from collections import Counter, defaultdict

from singer_sdk import typing as th
from singer_sdk.io_base import SingerMessageType

from mage_integrations.destinations.mongodb.target_mongodb.sinks import MongoDbSink
from mage_integrations.destinations.target import Target

LOGGER = logging.getLogger(__name__)


class TargetMongoDb(Target):
    """Sample target for MongoDB."""

    name = "target-mongodb"
    config_jsonschema = th.PropertiesList(
        th.Property("connection_string", th.StringType, required=True),
        th.Property("db_name", th.StringType, required=True),
        th.Property("table_name", th.StringType, required=False),
    ).to_dict()
    default_sink_class = MongoDbSink

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

    def listen_override(self, file_input: t.Optional[str] = None) -> None:
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

            if line.startswith('{') is False:
                continue
            try:
                line_dict = json.loads(line)
            except:
                continue

            self._assert_line_requires(line_dict, requires={"type"})

            record_type: SingerMessageType = line_dict["type"]
            if record_type == SingerMessageType.SCHEMA:
                self._process_schema_message(line_dict)

            elif record_type == SingerMessageType.RECORD:
                self._process_record_message_mongo(line_dict)

            elif record_type == SingerMessageType.ACTIVATE_VERSION:
                self._process_activate_version_message(line_dict)

            elif record_type == SingerMessageType.STATE:
                self._process_state_message(line_dict)

            elif record_type == SingerMessageType.BATCH:
                self._process_batch_message(line_dict)

            else:
                continue

            stats[record_type] += 1

        return Counter(**stats)

    def _process_record_message_mongo(self, message_dict: dict) -> None:
        """Process a RECORD message.

        Args:
            message_dict (dict): JSONL Singer RECORD message
        """
        self._assert_line_requires(message_dict, requires={"stream", "record"})

        stream_name = message_dict["stream"]
        for stream_map in self.mapper.stream_maps[stream_name]:
            raw_record = copy.copy(message_dict["record"])
            transformed_record = stream_map.transform(raw_record)
            if transformed_record is None:
                # Record was filtered out by the map transform
                continue

            sink = self.get_sink(stream_map.stream_alias, record=transformed_record)
            context = sink._get_context(transformed_record)
            if sink.include_sdc_metadata_properties:
                sink._add_sdc_metadata_to_record(
                    transformed_record,
                    message_dict,
                    context,
                )
            else:
                sink._remove_sdc_metadata_from_record(transformed_record)

            transformed_record = sink.preprocess_record(transformed_record, context)
            sink._validate_and_parse(transformed_record)

            sink.tally_record_read()
            sink.process_record(transformed_record, context)
            sink._after_process_record(context)

            if sink.is_full:
                self.logger.info(
                    "Target sink for '%s' is full. Draining...",
                    sink.stream_name,
                )
                self.drain_one(sink)

        self._handle_max_record_age()
