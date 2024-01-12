"""Salesforce target sink class, which handles writing streams."""

from dataclasses import asdict
from typing import Dict, List, Optional

from simple_salesforce import Salesforce, bulk, exceptions
from singer_sdk.plugin_base import PluginBase

from mage_integrations.destinations.salesforce.target_salesforce.session_credentials import (
    SalesforceAuth,
    parse_credentials,
)
from mage_integrations.destinations.salesforce.target_salesforce.utils.exceptions import (
    InvalidStreamSchema,
    SalesforceApiError,
)
from mage_integrations.destinations.salesforce.target_salesforce.utils.transformation import (
    transform_record,
)
from mage_integrations.destinations.salesforce.target_salesforce.utils.validation import (
    ObjectField,
    validate_schema_field,
)
from mage_integrations.destinations.sink import BatchSink


class SalesforceSink(BatchSink):
    """Salesforce target sink class."""

    max_size = 5000
    valid_actions = ["insert", "update", "delete", "hard_delete", "upsert"]
    include_sdc_metadata_properties = False

    def __init__(
        self,
        target: PluginBase,
        stream_name: str,
        schema: Dict,
        key_properties: Optional[List[str]],
    ):
        super().__init__(target, stream_name, schema, key_properties)
        self.target = target
        self._sf_client = None
        self.batched_records: List[Dict]
        self._object_fields: Dict[str, ObjectField] = None
        self._validate_schema_against_object()

    @property
    def sf_client(self):
        if self._sf_client:
            return self._sf_client
        return self._new_session()

    @property
    def object_fields(self) -> Dict[str, ObjectField]:
        if self._object_fields:
            return self._object_fields
        object_fields = {}

        stream_object = getattr(self.sf_client, self.stream_name)
        for field in stream_object.describe().get("fields"):
            object_fields[field.get("name")] = ObjectField(
                field.get("type"),
                field.get("createable"),
                field.get("updateable"),
            )

        self._object_fields = object_fields
        return self._object_fields

    def _validate_schema_against_object(self):
        for field in self.schema.get("properties").items():
            try:
                validate_schema_field(
                    field, self.object_fields, self.config.get("action"), self.stream_name
                )
            except InvalidStreamSchema as e:
                raise InvalidStreamSchema(
                    f"The incomming schema is incompatable with your {self.stream_name} object"
                ) from e

    def _new_session(self):
        session_creds = SalesforceAuth.from_credentials(
            parse_credentials(self.target.config),
            domain=self.target.config["domain"],
            logger=self.logger
        ).login()
        self._sf_client = Salesforce(**asdict(session_creds))
        return self._sf_client

    def start_batch(self, context: dict) -> None:
        self.logger.info("Starting new batch")
        self._batched_records = []

    def process_record(self, record: dict, context: dict) -> None:
        """Transform and batch record"""

        processed_record = transform_record(record, self.object_fields)

        self._batched_records.append(processed_record)

    def process_batch(self, context: dict) -> None:
        """Write out any prepped records and return once fully written."""

        sf_object: bulk.SFBulkType = getattr(self.sf_client.bulk, self.stream_name)

        results = self._process_batch_by_action(
            sf_object, self.config.get("action"), self._batched_records
        )

        self._validate_batch_result(
            results, self.config.get("action"), self._batched_records
        )

        # Refresh session to avoid timeouts.
        self._new_session()

    def _process_batch_by_action(
        self, sf_object: bulk.SFBulkType, action, batched_data
    ):
        """Handle upsert records different method"""

        sf_object_action = getattr(sf_object, action)

        try:
            if action == "upsert":
                results = sf_object_action(batched_data,
                                           self.config.get('external_id_name', 'Id'))
            else:
                results = sf_object_action(batched_data)
        except exceptions.SalesforceMalformedRequest as e:
            self.logger.error(
                f"Data in {action} {self.stream_name}\
                    batch does not conform to target SF {self.stream_name} Object"
            )
            raise (e)

        return results

    def _validate_batch_result(self, results: List[Dict], action, batched_records):
        records_failed = 0
        records_processed = 0

        for i, result in enumerate(results):
            if result.get("success"):
                records_processed += 1
            else:
                records_failed += 1
                self.logger.error(
                    f"Failed {action} to to {self.stream_name}. Error: {result.get('errors')}.\
                        Record {batched_records[i]}"
                )

        self.logger.info(
            f"{action} {records_processed}/{len(results)} to {self.stream_name}."
        )

        if records_failed > 0 and not self.config.get("allow_failures"):
            raise SalesforceApiError(
                f"{records_failed} error(s) in {action} batch commit to {self.stream_name}."
            )
