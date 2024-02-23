"""Salesforce target class."""
import json
import logging
import sys
import typing as t
from collections import Counter, defaultdict

from singer_sdk import typing as th
from singer_sdk.io_base import SingerMessageType

from mage_integrations.destinations.salesforce.target_salesforce.sinks import (
    SalesforceSink,
)
from mage_integrations.destinations.target import Target

LOGGER = logging.getLogger(__name__)


class TargetSalesforce(Target):
    """Sample target for Salesforce."""

    name = "target-salesforce"
    config_jsonschema = th.PropertiesList(
        th.Property(
            "client_id",
            th.StringType,
            description="OAuth client_id",
        ),
        th.Property(
            "client_secret",
            th.StringType,
            secret=True,
            description="OAuth client_secret",
        ),
        th.Property(
            "refresh_token",
            th.StringType,
            secret=True,
            description="OAuth refresh_token",
        ),
        th.Property(
            "username",
            th.StringType,
            description="User/password username",
        ),
        th.Property(
            "password",
            th.StringType,
            secret=True,
            description="User/password username",
        ),
        th.Property(
            "security_token",
            th.StringType,
            secret=True,
            description="User/password generated security token. Reset under your Account Settings",
        ),
        th.Property(
            "domain",
            th.StringType,
            default="login",
            description="Your Salesforce instance domain. Use 'login' (default) \
                         or 'test' (sandbox), or Salesforce My domain."
        ),
        th.Property(
            "action",
            th.StringType,
            default="update",
            allowed_values=SalesforceSink.valid_actions,
            description="How to handle incomming records by default\
                        (insert/update/upsert/delete/hard_delete)",
        ),
        th.Property(
            "allow_failures",
            th.BooleanType,
            default=False,
            description="Allows the target to continue persisting if a record fails to commit",
        ),
    ).to_dict()
    default_sink_class = SalesforceSink

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
        self.logger.info(f"Target {self.name} is listening for input from tap.")
        counter = self._process_lines_internal(file_input)

        line_count = sum(counter.values())

        self.logger.info(
            f"Target {self.name} completed reading {line_count} lines of input "
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
            json.decoder.JSONDecodeError: raised if any lines are not valid json
        """
        stats: dict[str, int] = defaultdict(int)
        for line in file_input.readlines():

            if line.startswith('{') is False:
                continue
            try:
                line_dict = json.loads(line)
            except:
                continue

            if line_dict.get('stream') is not None and \
               self.config['table_name'] is not None:

                line_dict['stream'] = self.config['table_name']

            self._assert_line_requires(line_dict, requires={"type"})

            record_type: SingerMessageType = line_dict["type"]
            if record_type == SingerMessageType.SCHEMA:
                self._process_schema_message(line_dict)

            elif record_type == SingerMessageType.RECORD:
                self._process_record_message(line_dict)

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
