from typing import Dict
from singer_sdk import typing as th
from singer_sdk.target_base import Target
from target_elasticsearch import sinks
from singer_sdk import typing as th
from singer_sdk.io_base import SingerMessageType
from singer_sdk.target_base import Target
import json
import sys
import typing as t
from collections import Counter, defaultdict
from target_elasticsearch.common import (
    INDEX_FORMAT,
    SCHEME,
    HOST,
    PORT,
    USERNAME,
    PASSWORD,
    BEARER_TOKEN,
    API_KEY_ID,
    API_KEY,
    SSL_CA_FILE,
    INDEX_TEMPLATE_FIELDS,
    METADATA_FIELDS,
)


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
            description="location of the the SSL certificate for cert verification ie. `/some/path`",
            default=None,
        ),
        th.Property(
            INDEX_FORMAT,
            th.StringType,
            description="""Index Format is used to handle custom index formatting such as specifying `-latest` index.
    ie. the default index string defined as:
    `ecs-{{ stream_name }}-{{ current_timestamp_daily}}` -> `ecs-animals-2022-12-25` where the stream name was animals

    Default options:
    Daily `{{ current_timestamp_daily }}` -> 2022-12-25,
    Monthly `{{ current_timestamp_monthly }}`->  2022-12,
    Yearly `{{ current_timestamp_yearly }}` -> 2022.
    You can also use fields mapped in `index_schema_fields` such as `{{ x }}` or `{{ timestamp }}`.

    There are also helper functions such as:
    to daily `{{ to_daily(timestamp) }}`,
    to monthly `{{ to_monthly(timestamp) }}`,
    to yearly `{{ to_yearly(timestamp) }}`
            """,
            default="ecs-{{ stream_name }}-{{ current_timestamp_daily}}",
        ),
        th.Property(
            INDEX_TEMPLATE_FIELDS,
            th.ObjectType(),
            description="""Index Schema Fields allows you to specify specific record values via jsonpath
    from the stream to be used in index formulation.
    ie. if the stream record looks like `{"id": "1", "created_at": "12-13-202000:01:43Z"}`
    and we want to index the record via create time.
    we could specify a mapping like `index_timestamp: created_at`
    in the `index_format` we could use a template like `ecs-animals-{{ to_daily(index_timestamp) }}`
    this would put this record onto the index  `ecs-animals-2020-12-13`""",
            default=None,
        ),
        th.Property(
            METADATA_FIELDS,
            th.ObjectType(),
            description="""Metadata Fields can be used to pull out specific fields via jsonpath to be
    used on for [ecs metadata patters](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-fields.html)
    This would best be used for data that has a primary key.
    ie. `{"guid": 102, "foo": "bar"}`
    then create a mapping of `_id: guid""",
            default=None,
        ),
    ).to_dict()
    default_sink_class = sinks.ElasticSink

    @property
    def state(self) -> Dict:
        return {}

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
        self.logger.info("Target '%s' is listening for input from tap.", "test")
        counter = self._process_lines_internal(file_input)

        line_count = sum(counter.values())

        self.logger.info(
            "Target '%s' completed reading %d lines of input "
            "(%d records, %d batch manifests, %d state messages).",
            self.name,
            line_count,
            counter[SingerMessageType.RECORD],
            counter[SingerMessageType.BATCH],
            counter[SingerMessageType.STATE],
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

            if line.startswith('INFO'):
                continue

            line_dict = json.loads(line)

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