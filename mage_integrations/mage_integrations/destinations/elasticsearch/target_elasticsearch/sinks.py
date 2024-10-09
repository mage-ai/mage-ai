import datetime
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import elasticsearch
import jinja2
import jsonpath_ng
import singer_sdk.io_base
from elasticsearch.helpers import bulk, parallel_bulk
from singer_sdk import PluginBase

from mage_integrations.destinations.elasticsearch.target_elasticsearch.common import (
    API_KEY,
    API_KEY_ID,
    BEARER_TOKEN,
    ELASTIC_DAILY_FORMAT,
    ELASTIC_MONTHLY_FORMAT,
    ELASTIC_YEARLY_FORMAT,
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
    to_daily,
    to_monthly,
    to_yearly,
)
from mage_integrations.destinations.sink import BatchSink

DEFAULT_CHUNK_SIZE = 500


def template_index(stream_name: str, index_format: str, schemas: Dict) -> str:
    """
    _index templates the input index config to be used for elasticsearch indexing
    currently it operates using current time as index.
    this may not be optimal and additional support can be
    added to parse @timestamp out and use it in index
    templating depending on how your elastic instance is configured.
    @param stream_name:
    @param index_format:
    @param schemas:
    @return: str
    """
    today = datetime.date.today()
    arguments = {
        **{
            "stream_name": stream_name,
        },
        **schemas,
    }
    environment = jinja2.Environment()
    template = environment.from_string(index_format)
    return template.render(**arguments).replace("_", "-")


def build_fields(
    stream_name: str,
    mapping: Dict,
    record: Dict[str, Union[str, Dict[str, str], int]],
    logger: singer_sdk.io_base.logger,
) -> Dict:
    """
    build_fields parses records for supplied mapping to be used later in index
    templating and ecs metadata field formulation
    @param logger:
    @param stream_name:
    @param mapping: dict
    @param record:  str
    @return: dict
    """
    schemas = {}
    if stream_name in mapping:
        for k, v in mapping[stream_name].items():
            match = jsonpath_ng.parse(v).find(record)
            if len(match) == 0:
                logger.warning(
                    f"schema key {k} with json path {v} could not be found in record: {record}"
                )
                schemas[k] = v
            else:
                if len(match) > 1:
                    logger.warning(
                        f"schema key {k} with json path {v} has multiple \
                        associated fields, may cause side effects"
                    )
                schemas[k] = match[0].value
    return schemas


class ElasticSink(BatchSink):
    """ElasticSink target sink class."""

    def __init__(
        self,
        target: PluginBase,
        stream_name: str,
        schema: Dict,
        key_properties: Optional[List[str]],
    ):
        super().__init__(target, stream_name, schema, key_properties)
        self.client = self.authenticated_client()

    @property
    def max_size(self) -> int:
        if self.config:
            bulk_kwargs = self.config.get('bulk_kwargs', {})
            return bulk_kwargs.get('chunk_size', DEFAULT_CHUNK_SIZE)
        else:
            return DEFAULT_CHUNK_SIZE

    def build_request_body_and_distinct_indices(
        self, records: List[Dict[str, Union[str, Dict[str, str], int]]]
    ) -> Tuple[List[Dict[Union[str, Any], Union[str, Any]]], Set[str]]:
        """
        build_request_body_and_distinct_indices builds the bulk request body
        and collects all distinct indices that will be used to create indices before bulk upload.
        @param records:
        @return:
        """
        updated_records = []
        index_mapping = {}
        metadata_fields = {}
        distinct_indices = set()
        if INDEX_TEMPLATE_FIELDS in self.config:
            index_mapping = self.config[INDEX_TEMPLATE_FIELDS]
        if METADATA_FIELDS in self.config:
            metadata_fields = self.config[METADATA_FIELDS]

        for r in records:
            index = template_index(
                self.config['table'],
                self.config[INDEX_FORMAT],
                build_fields(self.stream_name, index_mapping, r, self.logger),
            )
            distinct_indices.add(index)
            updated_records.append(
                {
                    **{"_op_type": self.config.get(INDEX_OP_TYPE, "index"), "_index": index,
                       "_source": r},
                    **build_fields(self.stream_name, metadata_fields, r, self.logger),
                }
            )

        return updated_records, distinct_indices

    def create_indices(self, indices: Set[str]) -> None:
        """
        create_indices creates elastic indices using cluster defaults
        @param indices: set
        """
        for index in indices:
            try:
                self.client.indices.create(index=index)
            except elasticsearch.exceptions.RequestError as e:
                if e.error == "resource_already_exists_exception":
                    self.logger.debug("index already created skipping creation")
                else:  # Other exception - raise it
                    raise e

    def build_body(
        self, records: List[Dict[str, Union[str, Dict[str, str], int]]]
    ) -> List[Dict[Union[str, Any], Union[str, Any]]]:
        """
        build_body constructs the bulk message body and creates all necessary indices if needed
        @param records: str
        @return: list[dict[Union[str, Any], Union[str, Any]]]
        """
        updated_records, distinct_indices = self.build_request_body_and_distinct_indices(records)
        self.create_indices(distinct_indices)
        return updated_records

    def authenticated_client(self) -> elasticsearch.Elasticsearch:
        """
        _authenticated_client generates a newly authenticated elasticsearch client
        attempting to support all auth permutations and ssl concerns
        https://www.elastic.co/guide/en/elasticsearch/client/python-api/current/connecting.html
        @return: elasticsearch.Elasticsearch
        """
        config = {}
        scheme = self.config[SCHEME]
        if SSL_CA_FILE in self.config:
            scheme = "https"
            config["ca_certs"] = self.config[SSL_CA_FILE]

        config[VERIFY_CERTS] = self.config.get(VERIFY_CERTS, True)

        config["hosts"] = [f"{scheme}://{self.config[HOST]}:{self.config[PORT]}"]

        if USERNAME in self.config and PASSWORD in self.config:
            config["basic_auth"] = (self.config[USERNAME], self.config[PASSWORD])
        elif API_KEY in self.config and API_KEY_ID in self.config:
            config["api_key"] = (self.config[API_KEY_ID], self.config[API_KEY])
        elif BEARER_TOKEN in self.config:
            config["bearer_auth"] = self.config[BEARER_TOKEN]
        else:
            self.logger.info("using default elastic search connection config")

        return elasticsearch.Elasticsearch(timeout=30, **config)

    def write_output(self, records):
        """
        write_output creates indices, builds batch request body, and writing
        to elastic via bulk helper function
        # https://elasticsearch-py.readthedocs.io/en/master/helpers.html#bulk-helpers
        # https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html
        @param records:
        """
        records = self.build_body(records)
        self.logger.debug(f'Number of records to write: {len(records)}')
        bulk_kwargs = self.config.get('bulk_kwargs', {}).copy()
        use_parallel = bulk_kwargs.pop('use_parallel', False)
        try:
            if use_parallel:
                success = 0
                fail = []
                for ok, item in parallel_bulk(
                    self.client,
                    records,
                    **bulk_kwargs,
                ):
                    if ok:
                        success += 1
                    else:
                        fail.append(item)
            else:
                success, fail = bulk(
                    self.client,
                    records,
                    request_timeout=60,
                    **bulk_kwargs,
                )
            self.logger.info(f'Bulk success: {success}/{len(records)}')
            if fail:
                self.logger.info(f'Bulk fail: {fail}')
        except elasticsearch.helpers.BulkIndexError as e:
            self.logger.error('ES bulk index failed with errors:', e.errors)

    def process_batch(self, context: Dict[str, Any]) -> None:
        """
        process_batch handles batch records and overrides the default sink implementation
        @param context: dict
        """
        records = context["records"]
        self.write_output(records)
        self.tally_record_written(len(records))

    def clean_up(self) -> None:
        """
        clean_up closes the elasticsearch client
        """
        self.logger.debug(f"Cleaning up sink for {self.stream_name}")
        self.client.close()
