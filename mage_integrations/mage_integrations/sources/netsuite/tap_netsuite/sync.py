import time
import datetime
import singer
import singer.utils as singer_utils
from singer import Transformer, metadata, metrics
from requests.exceptions import RequestException
import json
from zeep.helpers import serialize_object
import types

LOGGER = singer.get_logger()


def get_internal_name_by_name(ns, stream):
    to_return = {}
    object_definition = ns.describe(stream)
    for element in object_definition:
        to_return[element.get('displayName')] = element.get('name')

    return to_return


def transform_data_hook(ns, stream):
    def pre_hook(data, typ, schema):
        internal_name_by_property = get_internal_name_by_name(ns, stream)
        result = data
        if isinstance(data, dict):
            result = {}
            schema_properties = schema.get('properties', {})
            for _property in schema_properties:
                prop = internal_name_by_property[_property]
                data_property = data.get(prop, None)
                if isinstance(data_property, datetime.datetime) is True:
                    data_property = data_property.isoformat()
                result[_property] = data_property

            if not typ == 'object':
                result = json.dumps(data, default=str)

        # NetSuite can return the value '0.0' for integer typed fields. This
        # causes a schema violation. Convert it to '0' if schema['type'] has
        # integer.
        if data == '0.0' and 'integer' in schema.get('type', []):
            result = '0'

        # NetSuite Bulk API returns CSV's with empty strings for text fields.
        # When the text field is nillable and the data value is an empty string,
        # change the data so that it is None.
        if data == "" and "null" in schema['type']:
            result = None

        return result

    return pre_hook


def get_stream_version(catalog_entry, state):
    tap_stream_id = catalog_entry['tap_stream_id']
    catalog_metadata = metadata.to_map(catalog_entry['metadata'])
    replication_key = catalog_metadata.get((), {}).get('replication-key')

    if singer.get_bookmark(state, tap_stream_id, 'version') is None:
        stream_version = int(time.time() * 1000)
    else:
        stream_version = singer.get_bookmark(state, tap_stream_id, 'version')

    if replication_key:
        return stream_version
    return int(time.time() * 1000)


def sync_stream(ns, catalog_entry, state):
    stream = catalog_entry['stream']

    with metrics.record_counter(stream) as counter:
        try:
            sync_records(ns, catalog_entry, state, counter)
            singer.write_state(state)
        except RequestException as ex:
            raise Exception("Error syncing {}: {} Response: {}".format(
                stream, ex, ex.response.text))
        except Exception as ex:
            raise Exception("Error syncing {}: {}".format(
                stream, ex)) from ex

        return counter


def sync_records(ns, catalog_entry, state, counter):
    chunked_bookmark = singer_utils.strptime_with_tz(ns.get_start_date(state, catalog_entry))
    stream = catalog_entry['stream']
    schema = catalog_entry['schema']
    stream_alias = catalog_entry.get('stream_alias')
    catalog_metadata = metadata.to_map(catalog_entry['metadata'])
    replication_key = catalog_metadata.get((), {}).get('replication-key')
    stream_version = get_stream_version(catalog_entry, state)
    activate_version_message = singer.ActivateVersionMessage(stream=(stream_alias or stream),
                                                             version=stream_version)

    start_time = singer_utils.now()

    LOGGER.info('Syncing NetSuite data for stream %s', stream)

    previous_max_replication_key = None

    query_func = ns.query
    query_result = query_func(ns, catalog_entry, state)

    if not isinstance(query_result, types.GeneratorType):
        if query_result is not None:
            query_result = [query_result]
        else:
            query_result = []

    for page in query_result:
        for rec in page:
            counter.increment()
            with Transformer(pre_hook=transform_data_hook(ns, stream)) as transformer:
                rec = transformer.transform(serialize_object(rec), schema)

            singer.write_message(
                singer.RecordMessage(
                    stream=(
                            stream_alias or stream),
                    record=rec,
                    version=stream_version,
                    time_extracted=start_time))

            if replication_key:
                _rec = rec.get(replication_key, None)
                original_replication_key_value = ""
                replication_key_value = None
                if replication_key and _rec is not None:
                    original_replication_key_value = _rec
                    replication_key_value = singer_utils.strptime_with_tz(original_replication_key_value)

                if previous_max_replication_key is None or (
                        replication_key_value and replication_key_value <= start_time and replication_key_value > previous_max_replication_key
                ):
                    state = singer.write_bookmark(
                        state,
                        catalog_entry['tap_stream_id'],
                        replication_key,
                        original_replication_key_value)
                    previous_max_replication_key = replication_key_value


    if not replication_key:
        singer.write_message(activate_version_message)
        state = singer.write_bookmark(
            state, catalog_entry['tap_stream_id'], 'version', None)
