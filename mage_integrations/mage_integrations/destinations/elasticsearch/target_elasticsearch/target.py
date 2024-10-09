import json
import logging
import sys
import typing as t
from collections import Counter, defaultdict

from singer_sdk import typing as th
from singer_sdk.io_base import SingerMessageType

from mage_integrations.destinations.elasticsearch.target_elasticsearch import sinks
from mage_integrations.destinations.elasticsearch.target_elasticsearch.common import (
    API_KEY,
    API_KEY_ID,
    BEARER_TOKEN,
    HOST,
    INDEX_FORMAT,
    INDEX_OP_TYPE,
    INDEX_TEMPLATE_FIELDS,
    METADATA_FIELDS,
    PASSWORD,
    PORT,
    SCHEME,
    SSL_CA_FILE,
    USERNAME,
    VERIFY_CERTS,
)
from mage_integrations.destinations.target import Target

LOGGER = logging.getLogger(__name__)


class TargetElasticsearch(Target):
    """Sample target for parquet."""

    name = "target-elasticsearch"
    config_jsonschema = th.PropertiesList(
        th.Property(
            SCHEME,
            th.StringType,
            description="http scheme used for connecting to elasticsearch",
            default="http",
            required=True,
        ),
        th.Property(
            HOST,
            th.StringType,
            description="host used to connect to elasticsearch",
            default="localhost",
            required=True,
        ),
        th.Property(
            PORT,
            th.NumberType,
            description="port use to connect to elasticsearch",
            default=9200,
            required=True,
        ),
        th.Property(
            USERNAME,
            th.StringType,
            description="basic auth username",
            default=None,
        ),
        th.Property(
            PASSWORD,
            th.StringType,
            description="basic auth password",
            default=None,
        ),
        th.Property(
            BEARER_TOKEN,
            th.StringType,
            description="bearer token for bearer authorization",
            default=None,
        ),
        th.Property(
            API_KEY_ID,
            th.StringType,
            description="api key id for auth key authorization",
            default=None,
        ),
        th.Property(
            API_KEY,
            th.StringType,
            description="api key for auth key authorization",
            default=None,
        ),
        th.Property(
            SSL_CA_FILE,
            th.StringType,
            description="location of the the SSL certificate for cert verification = `/some/path`",
            default=None,
        ),
        th.Property(
            VERIFY_CERTS,
            th.BooleanType,
            description="disable the SSL certificate verification",
            default=True,
        ),
        th.Property(
            INDEX_FORMAT,
            th.StringType,
            description="""Index Format is used to handle custom
            index formatting such as specifying `-latest` index.
    ie. the default index string defined as:
    `ecs-{{ stream_name }}-{{ current_timestamp_daily}}`
    -> `ecs-animals-2022-12-25` where the stream name was animals

    Default options:
    Daily `{{ current_timestamp_daily }}` -> 2022-12-25,
    Monthly `{{ current_timestamp_monthly }}`->  2022-12,
    Yearly `{{ current_timestamp_yearly }}` -> 2022.
    You can also use fields mapped in `index_schema_fields` such as
    `{{ x }}` or `{{ timestamp }}`.

    There are also helper functions such as:
    to daily `{{ to_daily(timestamp) }}`,
    to monthly `{{ to_monthly(timestamp) }}`,
    to yearly `{{ to_yearly(timestamp) }}`
            """,
            default="{{ stream_name }}",
        ),
        th.Property(
            INDEX_OP_TYPE,
            th.StringType,
            description="""Elasticsearch Data Streams support only the `create` action
            within the _op_type field, for other index modes refer to the documentation:

    https://www.elastic.co/guide/en/elasticsearch/client/python-api/current/client-helpers.html
            """,
            default="index",
        ),
        th.Property(
            INDEX_TEMPLATE_FIELDS,
            th.ObjectType(),
            description="""Index Schema Fields allows you to specify specific
            record values via jsonpath
    from the stream to be used in index formulation.
    ie. if the stream record looks like
    `{"id": "1", "created_at": "12-13-202000:01:43Z"}`
    and we want to index the record via create time.
    we could specify a mapping like `index_timestamp: created_at`
    in the `index_format` we could use a template like
    `ecs-animals-{{ to_daily(index_timestamp) }}`
    this would put this record onto the index  `ecs-animals-2020-12-13`""",
            default=None,
        ),
        th.Property(
            METADATA_FIELDS,
            th.ObjectType(),
            description="""Metadata Fields can be used to pull out specific
            fields via jsonpath to be
    used on for ecs metadata patters
    This would best be used for data that has a primary key.
    ie. `{"guid": 102, "foo": "bar"}`
    then create a mapping of `_id: guid""",
            default=None,
        ),
    ).to_dict()
    default_sink_class = sinks.ElasticSink

    def __init__(
        self,
        *,
        config=None,
        parse_env_config: bool = False,
        validate_config: bool = True,
        logger=None,
    ) -> None:

        self._logger = logger if logger is not None else LOGGER

        super().__init__(
            config=config,
            parse_env_config=parse_env_config,
            validate_config=validate_config,
        )

    @property
    def logger(self):
        """Get logger.

        Returns:
            Plugin logger.
        """

        logger = self._logger

        return logger

    def listen_override(self, file_input: t.IO[str] = None) -> None:
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
            json.decoder.JSONDecodeError: raised if any lines are not valid json
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
