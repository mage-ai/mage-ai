import os
import json
from singer import metadata

# Reference:
#   https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md#Metadata

STREAMS = {
    'accounts': {
        'key_properties': ['id'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['last_modified_time']
    },
    'video_ads': {
        'key_properties': ['content_reference'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['last_modified_time']
    },
    'account_users': {
        'key_properties': ['account_id', 'user_person_id'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['last_modified_time']
    },
    'campaign_groups': {
        'key_properties': ['id'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['last_modified_time']
    },
    'campaigns': {
        'key_properties': ['id'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['last_modified_time']
    },
    'creatives': {
        'key_properties': ['id'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['last_modified_time']
    },
    'ad_analytics_by_campaign': {
        'key_properties': ['campaign_id', 'start_at'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['end_at']
    },
    'ad_analytics_by_creative': {
        'key_properties': ['creative_id', 'start_at'],
        'replication_method': 'INCREMENTAL',
        'replication_keys': ['end_at']
    }
}


def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)

def get_schemas():
    schemas = {}
    field_metadata = {}

    for stream_name, stream_metadata in STREAMS.items():
        schema_path = get_abs_path('schemas/{}.json'.format(stream_name))
        with open(schema_path) as file:
            schema = json.load(file)
        schemas[stream_name] = schema
        mdata = metadata.new()

        # Documentation:
        #   https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md
        # Reference:
        #   https://github.com/singer-io/singer-python/blob/master/singer/metadata.py#L25-L44
        mdata = metadata.get_standard_metadata(
            schema=schema,
            key_properties=stream_metadata.get('key_properties', None),
            valid_replication_keys=stream_metadata.get('replication_keys', None),
            replication_method=stream_metadata.get('replication_method', None)
        )

        # Add additional metadata
        mdata_map = metadata.to_map(mdata)
        if stream_name in ('ad_analytics_by_campaign', 'ad_analytics_by_creative'):
            mdata_map[('properties', 'date_range')]['inclusion'] = 'automatic'
            mdata_map[('properties', 'pivot')]['inclusion'] = 'automatic'
            mdata_map[('properties', 'pivot_value')]['inclusion'] = 'automatic'

        for replication_key in stream_metadata.get('replication_keys'):
            mdata_map[('properties', replication_key)]['inclusion'] = 'automatic'

        mdata = metadata.to_list(mdata_map)

        field_metadata[stream_name] = mdata

    return schemas, field_metadata
