import hashlib
import json
from collections import defaultdict
from datetime import timedelta

import backoff
import singer
from google.ads.googleads.errors import GoogleAdsException
from google.api_core.exceptions import ServerError, TooManyRequests
from google.protobuf.json_format import MessageToJson
from requests.exceptions import ReadTimeout
from singer import Transformer, metrics, utils

from . import report_definitions

LOGGER = singer.get_logger()

API_VERSION = "v15"

API_PARAMETERS = {
    "omit_unselected_resource_names": "true"
}

REPORTS_WITH_90_DAY_MAX = frozenset(
    [
        "click_performance_report",
    ]
)

DEFAULT_CONVERSION_WINDOW = 30
DEFAULT_REQUEST_TIMEOUT = 900 # in seconds


def get_conversion_window(config):
    """Fetch the conversion window from the config and error on invalid values"""
    conversion_window = config.get("conversion_window") or DEFAULT_CONVERSION_WINDOW

    try:
        conversion_window = int(conversion_window)
    except (ValueError, TypeError) as err:
        raise RuntimeError("Conversion Window must be an int or string") from err

    if conversion_window in set(range(1,31)) or conversion_window in {60, 90}:
        return conversion_window

    raise RuntimeError("Conversion Window must be between 1 - 30 inclusive, 60, or 90")


def get_request_timeout(config):
    """Get `request_timeout` value from config and error on invalid values"""
    request_timeout = config.get("request_timeout") or DEFAULT_REQUEST_TIMEOUT

    try:
        request_timeout = int(request_timeout)
    except (ValueError, TypeError):
        LOGGER.warning(f"The provided request_timeout {request_timeout} is invalid; it will be set to the default request timeout of {DEFAULT_REQUEST_TIMEOUT}.")
        request_timeout = DEFAULT_REQUEST_TIMEOUT
    return request_timeout

def create_nested_resource_schema(resource_schema, fields):
    new_schema = {
        "type": ["null", "object"],
        "properties": {}
    }

    for field in fields:
        walker = new_schema["properties"]
        paths = field.split(".")
        last_path = paths[-1]
        for path in paths[:-1]:
            if path not in walker:
                walker[path] = {
                    "type": ["null", "object"],
                    "properties": {}
                }
            walker = walker[path]["properties"]
        if last_path not in walker:
            json_schema = resource_schema[field]["json_schema"]
            walker[last_path] = json_schema
    return new_schema


def get_selected_fields(stream_mdata):
    selected_fields = set()
    for mdata in stream_mdata:
        if mdata["breadcrumb"]:
            inclusion = mdata["metadata"].get("inclusion")
            selected = mdata["metadata"].get("selected")
            if utils.should_sync_field(inclusion, selected) and mdata["breadcrumb"][1] != "_sdc_record_hash":
                selected_fields.update(mdata["metadata"]["tap-google-ads.api-field-names"])

    return selected_fields


def build_parameters():
    param_str = ",".join(f"{k}={v}" for k, v in API_PARAMETERS.items())
    return f"PARAMETERS {param_str}"

def generate_where_and_orderby_clause(last_pk_fetched, filter_param, composite_pks):
    """
    Generates a WHERE clause and a ORDER BY clause based on filter parameter(`key_properties`), and
    `last_pk_fetched`.

    Example:

    Single PK Case:

    filter_param = 'id'
    last_pk_fetched = 1
    composite_pks = False
    Returns:
    WHERE id > 1 ORDER BY id ASC

    Composite PK Case:

    composite_pks = True
    filter_param = 'id'
    last_pk_fetched = 1
    Returns:
    WHERE id >= 1 ORDER BY id ASC
    """
    where_clause = ""
    order_by_clause = ""

    # Even If the stream has a composite primary key, we are storing only a single pk value in the bookmark.
    # So, there might be possible that records with the same single pk value exist with different pk value combinations.
    # That's why for composite_pks we are using a greater than or equal operator.
    comparison_operator = ">="

    if not composite_pks:
        # Exclude equality for the stream which do not have a composite primary key.
        # Because in single pk case we are sure that no other record will have the same pk.
        # So, we do not want to fetch the last record again.
        comparison_operator = ">"

    if filter_param:
        # Create ORDER BY clause for the stream which support filter parameter.
        order_by_clause = f"ORDER BY {filter_param} ASC"

    if last_pk_fetched:
        # Create WHERE clause based on last_pk_fetched.
        where_clause = f'WHERE {filter_param} {comparison_operator} {last_pk_fetched} '

    return f'{where_clause}{order_by_clause}'

def create_core_stream_query(resource_name, selected_fields, last_pk_fetched, filter_param, composite_pks, limit=None):

    # Generate a query using WHERE and ORDER BY parameters.
    where_order_by_clause = generate_where_and_orderby_clause(last_pk_fetched, filter_param, composite_pks)

    if limit:
        # Add a LIMIT clause in the query of core streams.
        core_query = f"SELECT {','.join(selected_fields)} FROM {resource_name} {where_order_by_clause} LIMIT {limit} {build_parameters()}"
    else:
        core_query = f"SELECT {','.join(selected_fields)} FROM {resource_name} {where_order_by_clause} {build_parameters()}"

    return core_query


def create_report_query(resource_name, selected_fields, query_date):

    format_str = "%Y-%m-%d"
    query_date = utils.strftime(query_date, format_str=format_str)
    report_query = f"SELECT {','.join(selected_fields)} FROM {resource_name} WHERE segments.date = '{query_date}' {build_parameters()}"

    return report_query


def generate_hash(record, metadata):
    metadata = singer.metadata.to_map(metadata)
    fields_to_hash = []
    for key, val in record.items():
        if metadata[("properties", key)]["behavior"] != "METRIC":
            fields_to_hash.append((key, val))

    hash_source_data = sorted(fields_to_hash, key=lambda x: x[0])
    hash_bytes = json.dumps(hash_source_data).encode("utf-8")
    return hashlib.sha256(hash_bytes).hexdigest()


class TimeoutException(Exception):
    pass


retryable_errors = [
    "QuotaError.RESOURCE_EXHAUSTED",
    "QuotaError.RESOURCE_TEMPORARILY_EXHAUSTED",
    "InternalError.INTERNAL_ERROR",
    "InternalError.TRANSIENT_ERROR",
    "InternalError.DEADLINE_EXCEEDED",
]

timeout_errors = [
    "RequestError.RPC_DEADLINE_TOO_SHORT",
]


def should_give_up(ex):

    # ServerError is the parent class of InternalServerError, MethodNotImplemented, BadGateway,
    # ServiceUnavailable, GatewayTimeout, DataLoss and Unknown classes.
    # Return False for all above errors and ReadTimeout error.
    if isinstance(ex, (ServerError, TooManyRequests, ReadTimeout)):
        return False

    if isinstance(ex, AttributeError):
        if str(ex) == "'NoneType' object has no attribute 'Call'":
            LOGGER.info('Retrying request due to AttributeError')
            return False
        return True

    for googleads_error in ex.failure.errors:
        quota_error = str(googleads_error.error_code.quota_error)
        internal_error = str(googleads_error.error_code.internal_error)
        request_error = str(googleads_error.error_code.request_error)
        for err in [quota_error, internal_error, request_error]:
            if err in retryable_errors:
                LOGGER.info(f'Retrying request due to {err}')
                return False
            if err in timeout_errors:
                raise TimeoutException('Request was not able to complete within allotted timeout. Try reducing the amount of data being requested before increasing timeout.')
        return True


def on_giveup_func(err):
    """This function lets us know that backoff ran, but it does not print
    Google's verbose message and stack trace"""
    LOGGER.warning("Giving up request after %s tries", err.get("tries"))


@backoff.on_exception(backoff.expo,
                      (GoogleAdsException,
                       ServerError, TooManyRequests,
                       ReadTimeout,
                       AttributeError),
                      max_tries=5,
                      jitter=None,
                      giveup=should_give_up,
                      on_giveup=on_giveup_func,
                      logger=None)
def make_request(gas, query, customer_id, config=None):
    if config is None:
        config = {}
    request_timeout = get_request_timeout(config)
    response = gas.search(query=query, customer_id=customer_id, timeout=request_timeout)
    return response


def google_message_to_json(message):
    """
    The proto field name for `type` is `type_` which will
    get stripped by the Transformer. So we replace all
    instances of the key `"type_"` before `json.loads`ing it
    """

    json_string = MessageToJson(message, preserving_proto_field_name=True)
    json_string = json_string.replace('"type_":', '"type":')
    return json.loads(json_string)


def filter_out_non_attribute_fields(fields):
    return {field_name: field_data
            for field_name, field_data in fields.items()
            if field_data["field_details"]["category"] == "ATTRIBUTE"}

def write_bookmark_for_core_streams(state, stream, customer_id, last_pk_fetched):
    # Write bookmark for core streams.
    singer.write_bookmark(state, stream, customer_id, {'last_pk_fetched': last_pk_fetched})

    singer.write_state(state)
    LOGGER.info("Write state for stream: %s, value: %s", stream, last_pk_fetched)

class BaseStream:  # pylint: disable=too-many-instance-attributes

    def __init__(self, fields, google_ads_resource_names, resource_schema, primary_keys, automatic_keys = None, filter_param = None):
        self.fields = fields
        self.google_ads_resource_names = google_ads_resource_names
        self.primary_keys = primary_keys
        self.automatic_keys = automatic_keys if automatic_keys else set()
        self.filter_param = filter_param
        self.extract_field_information(resource_schema)

        self.create_full_schema(resource_schema)
        self.set_stream_schema()
        self.format_field_names()

        self.build_stream_metadata()


    def extract_field_information(self, resource_schema):
        self.field_exclusions = defaultdict(set)
        self.schema = {}
        self.behavior = {}

        for resource_name in self.google_ads_resource_names:

            # field_exclusions step
            fields = resource_schema[resource_name]["fields"]
            for field_name, field in fields.items():
                if field_name in self.fields:
                    self.field_exclusions[field_name].update(
                        field["incompatible_fields"]
                    )

                    self.schema[field_name] = field["field_details"]["json_schema"]

                    self.behavior[field_name] = field["field_details"]["category"]

        self.field_exclusions = {k: list(v) for k, v in self.field_exclusions.items()}


    def create_full_schema(self, resource_schema):
        google_ads_name = self.google_ads_resource_names[0]
        self.resource_object = resource_schema[google_ads_name]
        self.resource_fields = filter_out_non_attribute_fields(self.resource_object["fields"])
        self.full_schema = create_nested_resource_schema(resource_schema, self.resource_fields)

    def set_stream_schema(self):
        google_ads_name = self.google_ads_resource_names[0]
        self.stream_schema = self.full_schema["properties"][google_ads_name]

    def format_field_names(self):
        """This function does two things:
        1. Appends a `resource_name` to an id field if it is the id of an attributed resource
        2. Lifts subfields of `ad_group_ad.ad` into `ad_group_ad`
        """
        for resource_name, schema in self.full_schema["properties"].items():
            # ads stream is special since all of the ad fields are nested under ad_group_ad.ad
            # we need to bump the fields up a level so they are selectable
            if resource_name == "ad_group_ad":
                for ad_field_name, ad_field_schema in self.full_schema["properties"]["ad_group_ad"]["properties"]["ad"]["properties"].items():
                    self.stream_schema["properties"][ad_field_name] = ad_field_schema
                self.stream_schema["properties"].pop("ad")

            if (
                resource_name not in {"metrics", "segments"}
                and resource_name not in self.google_ads_resource_names
                and "id" in schema["properties"]
            ):
                self.stream_schema["properties"][resource_name + "_id"] = schema["properties"]["id"]

    def build_stream_metadata(self):
        self.stream_metadata = {
            (): {
                "inclusion": "available",
                "forced-replication-method": "FULL_TABLE",
                "table-key-properties": self.primary_keys,
            }
        }

        for field, props in self.resource_fields.items():
            resource_matches = field.startswith(self.resource_object["name"] + ".")
            is_attribute = props["field_details"]["category"] == "ATTRIBUTE"
            is_id_field = field.endswith(".id")

            if is_id_field or (is_attribute and resource_matches):
                # Transform the field name to match the schema
                # Special case for ads since they are nested under ad_group_ad and
                # we have to bump them up a level
                if field.startswith("ad_group_ad.ad."):
                    field = field.split(".")[2]
                else:
                    if resource_matches:
                        field = field.split(".")[1]
                    elif is_id_field:
                        field = field.replace(".", "_")

                if ("properties", field) not in self.stream_metadata:
                    # Base metadata for every field
                    self.stream_metadata[("properties", field)] = {
                        "fieldExclusions": props["incompatible_fields"],
                        "behavior": props["field_details"]["category"],
                    }

                    # Add inclusion metadata
                    # Foreign keys are automatically included and they are all id fields
                    if field in self.primary_keys or field in self.automatic_keys:
                        inclusion = "automatic"
                    elif props["field_details"]["selectable"]:
                        inclusion = "available"
                    else:
                        # inclusion = "unsupported"
                        continue
                    self.stream_metadata[("properties", field)]["inclusion"] = inclusion

                # Save the full field name for sync code to use
                full_name = props["field_details"]["name"]
                if "tap-google-ads.api-field-names" not in self.stream_metadata[("properties", field)]:
                    self.stream_metadata[("properties", field)]["tap-google-ads.api-field-names"] = []

                if props["field_details"]["selectable"]:
                    self.stream_metadata[("properties", field)]["tap-google-ads.api-field-names"].append(full_name)

    def transform_keys(self, json_message):
        """This function does a few things with Google's response for sync queries:
        1) checks a json_message's fields to see if they're for  the current resource
        2) if they are, keep the fields in transformed_json with no modifications
        3) if they are not, append a foreign key to the transformed_message using the id value
        4) if the resource is ad_group_ad, pops ad fields up to the ad_group_ad level

        We've seen API responses where Google returns `type_` when the
        field we ask for is `type`, so we transfrom the key-value pair
        `"type_": X` to `"type": X`
        """
        target_resource_name = self.google_ads_resource_names[0]
        transformed_message = {}

        for resource_name, value in json_message.items():
            resource_matches = target_resource_name == resource_name

            if resource_matches:
                transformed_message.update(value)
            else:
                transformed_message[f"{resource_name}_id"] = value["id"]

            if resource_name == "ad_group_ad":
                transformed_message.update(value["ad"])
                transformed_message.pop("ad")

        if "type_" in transformed_message:
            transformed_message["type"] = transformed_message.pop("type_")

        return transformed_message

    def sync(self, sdk_client, customer, stream, config, state, query_limit): # pylint: disable=unused-argument
        gas = sdk_client.get_service("GoogleAdsService", version=API_VERSION)
        resource_name = self.google_ads_resource_names[0]
        stream_name = stream["stream"]
        stream_mdata = stream["metadata"]
        selected_fields = get_selected_fields(stream_mdata)
        state = singer.set_currently_syncing(state, [stream_name, customer["customerId"]])
        singer.write_state(state)

        # last run was interrupted if there is a bookmark available for core streams.
        last_pk_fetched = singer.get_bookmark(state,
                                              stream["tap_stream_id"],
                                              customer["customerId"]) or {}

        # Assign True if the primary key is composite.
        composite_pks = len(self.primary_keys) > 1

        # LIMIT clause in the `ad_group_criterion` and `campaign_criterion`(stream which has composite primary keys) may result in the infinite loop.
        # For example, the limit is 10. campaign_criterion stream have total 20 records with campaign_id = 1.
        # So, in the first call, the tap retrieves 10 records and the next time query would look like the below,
        # WHERE campaign_id >= 1
        # Now, the tap will again fetch records with campaign_id = 1.
        # That's why we should not pass the LIMIT clause in the query of these streams.
        limit_not_possible = ["ad_group_criterion", "campaign_criterion"]

        # Set limit for the stream which supports filter parameter(WHERE clause) and do not belong to limit_not_possible category.
        if self.filter_param and stream_name not in limit_not_possible:
            limit = query_limit
        else:
            limit = None

        is_more_records = True
        record = None
        # Retrieve the last saved state. If last_pk_fetched is not found in the state, then the WHERE clause will not be added to the state.
        last_pk_fetched_value = last_pk_fetched.get('last_pk_fetched')

        with metrics.record_counter(stream_name) as counter:

            # Loop until the last page.
            while is_more_records:
                query = create_core_stream_query(resource_name, selected_fields, last_pk_fetched_value, self.filter_param, composite_pks, limit=limit)
                try:
                    response = make_request(gas, query, customer["customerId"], config)
                except GoogleAdsException as err:
                    LOGGER.warning("Failed query: %s", query)
                    raise err
                num_rows = 0

                with Transformer() as transformer:
                    # Pages are fetched automatically while iterating through the response
                    for message in response:
                        json_message = google_message_to_json(message)
                        transformed_message = self.transform_keys(json_message)
                        record = transformer.transform(transformed_message, stream["schema"], singer.metadata.to_map(stream_mdata))
                        singer.write_record(stream_name, record)
                        counter.increment()
                        num_rows = num_rows + 1
                        if stream_name in limit_not_possible:
                            # Write state(last_pk_fetched) using primary key(id) value for core streams after query_limit records
                            if counter.value % query_limit == 0 and self.filter_param:
                                write_bookmark_for_core_streams(state, stream["tap_stream_id"], customer["customerId"], record[self.primary_keys[0]])

                if record and self.filter_param and stream_name not in limit_not_possible:
                    # Write the id of the last record for the stream, which supports the filter parameter(WHERE clause) and do not belong to limit_not_possible category.
                    write_bookmark_for_core_streams(state, stream["tap_stream_id"], customer["customerId"], record[self.primary_keys[0]])
                    last_pk_fetched_value = record[self.primary_keys[0]]
                    # Fetch the next page of records
                    if num_rows >= limit:
                        continue

                # Break the loop if no more records are available or the LIMIT clause is not possible.
                is_more_records = False


        # Flush the state for core streams if sync is completed
        if stream["tap_stream_id"] in state.get('bookmarks', {}):
            state['bookmarks'].pop(stream["tap_stream_id"])
            singer.write_state(state)

def get_query_date(start_date, bookmark, conversion_window_date):
    """Return a date within the conversion window and after start date

    All inputs are datetime strings.
    NOTE: `bookmark` may be None"""
    if not bookmark:
        return singer.utils.strptime_to_utc(start_date)
    else:
        query_date = min(bookmark, max(start_date, conversion_window_date))
        return singer.utils.strptime_to_utc(query_date)


class UserInterestStream(BaseStream):
    """
    user_interest stream has `user_interest.user_interest_id` instead of a `user_interest.id`
    this class sets it to id for the user_interest core stream
    """
    def format_field_names(self):

        schema = self.full_schema["properties"]["user_interest"]
        self.stream_schema["properties"]["id"] = schema["properties"]["user_interest_id"]
        self.stream_schema["properties"].pop("user_interest_id")

    def build_stream_metadata(self):
        self.stream_metadata = {
            (): {
                "inclusion": "available",
                "forced-replication-method": "FULL_TABLE",
                "table-key-properties": self.primary_keys,
            }
        }

        for field, props in self.resource_fields.items():

            field = field.split(".")[1]
            if field == "user_interest_id":
                field = "id"

            if ("properties", field) not in self.stream_metadata:
                # Base metadata for every field
                self.stream_metadata[("properties", field)] = {
                    "fieldExclusions": props["incompatible_fields"],
                    "behavior": props["field_details"]["category"],
                }

                # Add inclusion metadata
                # Foreign keys are automatically included and they are all id fields
                if field in self.primary_keys or field in self.automatic_keys:
                    inclusion = "automatic"
                elif props["field_details"]["selectable"]:
                    inclusion = "available"
                else:
                    # inclusion = "unsupported"
                    continue
                self.stream_metadata[("properties", field)]["inclusion"] = inclusion

            # Save the full field name for sync code to use
            full_name = props["field_details"]["name"]
            if "tap-google-ads.api-field-names" not in self.stream_metadata[("properties", field)]:
                self.stream_metadata[("properties", field)]["tap-google-ads.api-field-names"] = []

            if props["field_details"]["selectable"]:
                self.stream_metadata[("properties", field)]["tap-google-ads.api-field-names"].append(full_name)

    def transform_keys(self, json_message):
        """
        This function does a few things with Google's response for sync queries for the user_interest stream:
        1) clone json_message to transformed_message
        2) create id field with user_interest_id's value
        3) pop user_interest_id field off the message

        """
        transformed_message = {}
        resource_message = json_message[self.google_ads_resource_names[0]]

        transformed_message.update(resource_message)
        transformed_message["id"] = resource_message["user_interest_id"]
        transformed_message.pop("user_interest_id")

        return transformed_message


class ReportStream(BaseStream):

    def create_full_schema(self, resource_schema):
        google_ads_name = self.google_ads_resource_names[0]
        self.resource_object = resource_schema[google_ads_name]
        self.resource_fields = self.resource_object["fields"]
        self.full_schema = create_nested_resource_schema(resource_schema, self.fields)

    def set_stream_schema(self):
        self.stream_schema = {
            "type": ["null", "object"],
            "is_report": True,
            "properties": {
                "_sdc_record_hash": {"type": ["string"]}
            },
        }

    def format_field_names(self):
        """This function does two things right now:
        1. Appends a `resource_name` to a field name if the field is in an attributed resource
        2. Lifts subfields of `ad_group_ad.ad` into `ad_group_ad`
        """
        for resource_name, schema in self.full_schema["properties"].items():
            for field_name, data_type in schema["properties"].items():
                # Move ad_group_ad.ad.x fields up a level in the schema (ad_group_ad.ad.x -> ad_group_ad.x)
                if resource_name == "ad_group_ad" and field_name == "ad":
                    for ad_field_name, ad_field_schema in data_type["properties"].items():
                        self.stream_schema["properties"][ad_field_name] = ad_field_schema
                elif resource_name not in {"metrics", "segments"}:
                    self.stream_schema["properties"][f"{resource_name}_{field_name}"] = data_type
                else:
                    self.stream_schema["properties"][field_name] = data_type

    def build_stream_metadata(self):
        self.stream_metadata = {
            (): {
                "inclusion": "available",
                "table-key-properties": ["_sdc_record_hash"],
                "forced-replication-method": "INCREMENTAL",
                "valid-replication-keys": ["date"]
            },
            ("properties", "_sdc_record_hash"): {
                "inclusion": "automatic",
                "behavior": "PRIMARY KEY"
            },
        }
        for report_field in self.fields:
            # Transform the field name to match the schema
            is_metric_or_segment = report_field.startswith("metrics.") or report_field.startswith("segments.")
            # Transform ad_group_ad.ad.x fields to just x to reflect ad_group_ads schema
            if report_field.startswith("ad_group_ad.ad."):
                transformed_field_name = report_field.split(".")[2]
            elif not is_metric_or_segment:
                transformed_field_name = "_".join(report_field.split(".")[:2])
            else:
                transformed_field_name = report_field.split(".")[1]
            # TODO: Maybe refactor this
            # metadata_key = ("properties", transformed_field_name)
            # Base metadata for every field
            if ("properties", transformed_field_name) not in self.stream_metadata:
                self.stream_metadata[("properties", transformed_field_name)] = {
                    "fieldExclusions": [],
                    "behavior": self.behavior[report_field],
                }

                # Transform field exclusion names so they match the schema
                for field_name in self.field_exclusions[report_field]:
                    is_metric_or_segment = field_name.startswith("metrics.") or field_name.startswith("segments.")
                    if not is_metric_or_segment:
                        new_field_name = field_name.replace(".", "_")
                    else:
                        new_field_name = field_name.split(".")[1]

                    self.stream_metadata[("properties", transformed_field_name)]["fieldExclusions"].append(new_field_name)

            # Add inclusion metadata
            if self.behavior[report_field]:
                inclusion = "available"
                if transformed_field_name in ({"date"} | self.automatic_keys):
                    inclusion = "automatic"
            else:
                inclusion = "unsupported"
            self.stream_metadata[("properties", transformed_field_name)]["inclusion"] = inclusion

            # Save the full field name for sync code to use
            if "tap-google-ads.api-field-names" not in self.stream_metadata[("properties", transformed_field_name)]:
                self.stream_metadata[("properties", transformed_field_name)]["tap-google-ads.api-field-names"] = []

            self.stream_metadata[("properties", transformed_field_name)]["tap-google-ads.api-field-names"].append(report_field)

    def transform_keys(self, json_message):
        transformed_message = {}

        for resource_name, value in json_message.items():
            if resource_name in {"metrics", "segments"}:
                transformed_message.update(value)
            elif resource_name == "ad_group_ad":
                for key, sub_value in value.items():
                    if key == 'ad':
                        transformed_message.update(sub_value)
                    else:
                        transformed_message.update({f"{resource_name}_{key}": sub_value})
            else:
                # value = {"a": 1, "b":2}
                # turns into
                # {"resource_a": 1, "resource_b": 2}
                transformed_message.update(
                    {f"{resource_name}_{key}": sub_value
                     for key, sub_value in value.items()}
                )

        return transformed_message

    def sync(self, sdk_client, customer, stream, config, state, query_limit):
        gas = sdk_client.get_service("GoogleAdsService", version=API_VERSION)
        resource_name = self.google_ads_resource_names[0]
        stream_name = stream["stream"]
        stream_mdata = stream["metadata"]
        selected_fields = get_selected_fields(stream_mdata)
        replication_key = "date"
        state = singer.set_currently_syncing(state, [stream_name, customer["customerId"]])
        singer.write_state(state)

        conversion_window = timedelta(
            days=get_conversion_window(config)
        )
        conversion_window_date = utils.now().replace(hour=0, minute=0, second=0, microsecond=0) - conversion_window

        bookmark_object = singer.get_bookmark(state, stream["tap_stream_id"], customer["customerId"], default={})

        bookmark_value = bookmark_object.get(replication_key)

        query_date = get_query_date(
            start_date=config["start_date"],
            bookmark=bookmark_value,
            conversion_window_date=singer.utils.strftime(conversion_window_date)
        )

        end_date = config.get("end_date")
        if end_date:
            end_date = utils.strptime_to_utc(end_date)
        else:
            end_date = utils.now()

        if stream_name in REPORTS_WITH_90_DAY_MAX:
            cutoff = end_date.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=90)
            query_date = max(query_date, cutoff)
            if query_date == cutoff:
                LOGGER.info(f"Stream: {stream_name} supports only 90 days of data. Setting query date to {utils.strftime(query_date, '%Y-%m-%d')}.")

        if selected_fields == {'segments.date'}:
            raise Exception(f"Selected fields is currently limited to {', '.join(selected_fields)}. Please select at least one attribute and metric in order to replicate {stream_name}.")

        while query_date <= end_date:
            query = create_report_query(resource_name, selected_fields, query_date)
            LOGGER.info(f"Requesting {stream_name} data for {utils.strftime(query_date, '%Y-%m-%d')}.")

            try:
                response = make_request(gas, query, customer["customerId"], config)
            except GoogleAdsException as err:
                LOGGER.warning("Failed query: %s", query)
                LOGGER.critical(str(err.failure.errors[0].message))
                raise RuntimeError from None


            with Transformer() as transformer:
                # Pages are fetched automatically while iterating through the response
                for message in response:
                    json_message = google_message_to_json(message)
                    transformed_message = self.transform_keys(json_message)
                    record = transformer.transform(transformed_message, stream["schema"])
                    record["_sdc_record_hash"] = generate_hash(record, stream_mdata)

                    singer.write_record(stream_name, record)

            new_bookmark_value = {replication_key: utils.strftime(query_date)}
            singer.write_bookmark(state, stream["tap_stream_id"], customer["customerId"], new_bookmark_value)

            singer.write_state(state)

            query_date += timedelta(days=1)


def initialize_core_streams(resource_schema):
    return {
        "accessible_bidding_strategies": BaseStream(
            report_definitions.ACCESSIBLE_BIDDING_STRATEGY_FIELDS,
            ["accessible_bidding_strategy"],
            resource_schema,
            ["id"],
            {"customer_id"},
            filter_param="accessible_bidding_strategy.id"
        ),
        "accounts": BaseStream(
            report_definitions.ACCOUNT_FIELDS,
            ["customer"],
            resource_schema,
            ["id"],
            filter_param="customer.id"
        ),
        "ad_groups": BaseStream(
            report_definitions.AD_GROUP_FIELDS,
            ["ad_group"],
            resource_schema,
            ["id"],
            {
                "campaign_id",
                "customer_id",
             },
            filter_param="ad_group.id"
        ),
        "ad_group_criterion": BaseStream(
            report_definitions.AD_GROUP_CRITERION_FIELDS,
            ["ad_group_criterion"],
            resource_schema,
            ["ad_group_id","criterion_id"],
            {
                "campaign_id",
                "customer_id",
            },
            filter_param="ad_group.id"
        ),
        "ads": BaseStream(
            report_definitions.AD_GROUP_AD_FIELDS,
            ["ad_group_ad"],
            resource_schema,
            ["id"],
            {
                "ad_group_id",
                "campaign_id",
                "customer_id",
             },
            filter_param = "ad_group_ad.ad.id"
        ),
        "bidding_strategies": BaseStream(
            report_definitions.BIDDING_STRATEGY_FIELDS,
            ["bidding_strategy"],
            resource_schema,
            ["id"],
            {"customer_id"},
            filter_param="bidding_strategy.id"
        ),
        "call_details": BaseStream(
            report_definitions.CALL_VIEW_FIELDS,
            ["call_view"],
            resource_schema,
            ["resource_name"],
            {
                "ad_group_id",
                "campaign_id",
                "customer_id",
             },
        ),
        "campaigns": BaseStream(
            report_definitions.CAMPAIGN_FIELDS,
            ["campaign"],
            resource_schema,
            ["id"],
            {"customer_id"},
            filter_param="campaign.id"
        ),
        "campaign_budgets": BaseStream(
            report_definitions.CAMPAIGN_BUDGET_FIELDS,
            ["campaign_budget"],
            resource_schema,
            ["id"],
            {"customer_id"},
            filter_param="campaign_budget.id"
        ),
        "campaign_criterion": BaseStream(
            report_definitions.CAMPAIGN_CRITERION_FIELDS,
            ["campaign_criterion"],
            resource_schema,
            ["campaign_id","criterion_id"],
            {"customer_id"},
            filter_param="campaign.id"
        ),
        "campaign_labels": BaseStream(
            report_definitions.CAMPAIGN_LABEL_FIELDS,
            ["campaign_label"],
            resource_schema,
            ["resource_name"],
            {
                "campaign_id",
                "customer_id",
                "label_id",
            },
        ),
        "carrier_constant": BaseStream(
            report_definitions.CARRIER_CONSTANT_FIELDS,
            ["carrier_constant"],
            resource_schema,
            ["id"],
           filter_param="carrier_constant.id"
        ),
        "feed": BaseStream(
            report_definitions.FEED_FIELDS,
            ["feed"],
            resource_schema,
            ["id"],
            {"customer_id"},
            filter_param="feed.id"
        ),
        "feed_item": BaseStream(
            report_definitions.FEED_ITEM_FIELDS,
            ["feed_item"],
            resource_schema,
            ["id"],
            {
                "customer_id",
                "feed_id",
            },
            filter_param="feed_item.id"
        ),
        "labels": BaseStream(
            report_definitions.LABEL_FIELDS,
            ["label"],
            resource_schema,
            ["id"],
            {"customer_id"},
            filter_param="label.id"
        ),
        "language_constant": BaseStream(
            report_definitions.LANGUAGE_CONSTANT_FIELDS,
            ["language_constant"],
            resource_schema,
            ["id"],
            filter_param="language_constant.id"
        ),
        "mobile_app_category_constant": BaseStream(
            report_definitions.MOBILE_APP_CATEGORY_CONSTANT_FIELDS,
            ["mobile_app_category_constant"],
            resource_schema,
            ["id"],
            filter_param="mobile_app_category_constant.id"
        ),
        "mobile_device_constant": BaseStream(
            report_definitions.MOBILE_DEVICE_CONSTANT_FIELDS,
            ["mobile_device_constant"],
            resource_schema,
            ["id"],
            filter_param="mobile_device_constant.id"
        ),
        "operating_system_version_constant": BaseStream(
            report_definitions.OPERATING_SYSTEM_VERSION_CONSTANT_FIELDS,
            ["operating_system_version_constant"],
            resource_schema,
            ["id"],
            filter_param="operating_system_version_constant.id"
        ),
        "topic_constant": BaseStream(
            report_definitions.TOPIC_CONSTANT_FIELDS,
            ["topic_constant"],
            resource_schema,
            ["id"],
            filter_param="topic_constant.id"
        ),
        "user_interest": UserInterestStream(
            report_definitions.USER_INTEREST_FIELDS,
            ["user_interest"],
            resource_schema,
            ["id"],
            filter_param="user_interest.user_interest_id"
        ),
        "user_list": BaseStream(
            report_definitions.USER_LIST_FIELDS,
            ["user_list"],
            resource_schema,
            ["id"],
            {"customer_id"},
            filter_param="user_list.id"
        ),
    }


def initialize_reports(resource_schema):
    return {
        "account_performance_report": ReportStream(
            report_definitions.ACCOUNT_PERFORMANCE_REPORT_FIELDS,
            ["customer"],
            resource_schema,
            ["_sdc_record_hash"],
            {"customer_id"},
        ),
        "ad_group_audience_performance_report": ReportStream(
            report_definitions.AD_GROUP_AUDIENCE_PERFORMANCE_REPORT_FIELDS,
            ["ad_group_audience_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_criterion_criterion_id",
                "ad_group_id",
             },
        ),
        "ad_group_performance_report": ReportStream(
            report_definitions.AD_GROUP_PERFORMANCE_REPORT_FIELDS,
            ["ad_group"],
            resource_schema,
            ["_sdc_record_hash"],
            {"ad_group_id"},
        ),
        "ad_performance_report": ReportStream(
            report_definitions.AD_PERFORMANCE_REPORT_FIELDS,
            ["ad_group_ad"],
            resource_schema,
            ["_sdc_record_hash"],
            {"id"},
        ),
        "age_range_performance_report": ReportStream(
            report_definitions.AGE_RANGE_PERFORMANCE_REPORT_FIELDS,
            ["age_range_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_criterion_age_range",
                "ad_group_criterion_criterion_id",
                "ad_group_id",
             },
        ),
        "campaign_performance_report": ReportStream(
            report_definitions.CAMPAIGN_PERFORMANCE_REPORT_FIELDS,
            ["campaign"],
            resource_schema,
            ["_sdc_record_hash"],
            {"campaign_id"},
        ),
        "campaign_audience_performance_report": ReportStream(
            report_definitions.CAMPAIGN_AUDIENCE_PERFORMANCE_REPORT_FIELDS,
            ["campaign_audience_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "campaign_id",
                "campaign_criterion_criterion_id",
            },
        ),
        "click_performance_report": ReportStream(
            report_definitions.CLICK_PERFORMANCE_REPORT_FIELDS,
            ["click_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "clicks",
                "click_view_gclid",
            },
        ),
        "display_keyword_performance_report": ReportStream(
            report_definitions.DISPLAY_KEYWORD_PERFORMANCE_REPORT_FIELDS,
            ["display_keyword_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_criterion_criterion_id",
                "ad_group_id",
            },
        ),
        "display_topics_performance_report": ReportStream(
            report_definitions.DISPLAY_TOPICS_PERFORMANCE_REPORT_FIELDS,
            ["topic_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_criterion_criterion_id",
                "ad_group_id",
            },
        ),
        "expanded_landing_page_report": ReportStream(
            report_definitions.EXPANDED_LANDING_PAGE_REPORT_FIELDS,
            ["expanded_landing_page_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {"expanded_landing_page_view_expanded_final_url"},
        ),
        "gender_performance_report": ReportStream(
            report_definitions.GENDER_PERFORMANCE_REPORT_FIELDS,
            ["gender_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_criterion_criterion_id",
                "ad_group_id",
            },
        ),
        "geo_performance_report": ReportStream(
            report_definitions.GEO_PERFORMANCE_REPORT_FIELDS,
            ["geographic_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "geographic_view_country_criterion_id",
                "geographic_view_location_type",
            },
        ),
        "keywordless_query_report": ReportStream(
            report_definitions.KEYWORDLESS_QUERY_REPORT_FIELDS,
            ["dynamic_search_ads_search_term_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_id",
                "dynamic_search_ads_search_term_view_headline",
                "dynamic_search_ads_search_term_view_landing_page",
                "dynamic_search_ads_search_term_view_page_url",
                "dynamic_search_ads_search_term_view_search_term",
            },
        ),
        "keywords_performance_report": ReportStream(
            report_definitions.KEYWORDS_PERFORMANCE_REPORT_FIELDS,
            ["keyword_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_criterion_criterion_id",
                "ad_group_id",
            },
        ),
        "landing_page_report": ReportStream(
            report_definitions.LANDING_PAGE_REPORT_FIELDS,
            ["landing_page_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {"landing_page_view_unexpanded_final_url"},
        ),
        "placeholder_feed_item_report": ReportStream(
            report_definitions.PLACEHOLDER_FEED_ITEM_REPORT_FIELDS,
            ["feed_item"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "feed_id",
                "feed_item_id",
             }
        ),
        "placeholder_report": ReportStream(
            report_definitions.PLACEHOLDER_REPORT_FIELDS,
            ["feed_placeholder_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {"feed_placeholder_view_placeholder_type"},
        ),
        "placement_performance_report": ReportStream(
            report_definitions.PLACEMENT_PERFORMANCE_REPORT_FIELDS,
            ["managed_placement_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_criterion_criterion_id",
                "ad_group_id",
            },
        ),
        "search_query_performance_report": ReportStream(
            report_definitions.SEARCH_QUERY_PERFORMANCE_REPORT_FIELDS,
            ["search_term_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "ad_group_id",
                "campaign_id",
                "search_term_view_search_term",
            },
        ),
        "shopping_performance_report": ReportStream(
            report_definitions.SHOPPING_PERFORMANCE_REPORT_FIELDS,
            ["shopping_performance_view"],
            resource_schema,
            ["_sdc_record_hash"],
        ),
        "user_location_performance_report": ReportStream(
            report_definitions.USER_LOCATION_PERFORMANCE_REPORT_FIELDS,
            ["user_location_view"],
            resource_schema,
            ["_sdc_record_hash"],
            {
                "user_location_view_country_criterion_id",
                "user_location_view_targeting_location",
            },
        ),
        "video_performance_report": ReportStream(
            report_definitions.VIDEO_PERFORMANCE_REPORT_FIELDS,
            ["video"],
            resource_schema,
            ["_sdc_record_hash"],
            {"video_id"},
        ),
    }
