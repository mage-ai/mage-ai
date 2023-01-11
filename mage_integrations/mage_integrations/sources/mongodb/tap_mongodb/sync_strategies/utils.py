from singer import metadata
from typing import Dict
import mage_integrations.sources.mongodb.tap_mongodb.sync_strategies.common as common


def build_find_filter(stream: Dict, state: Dict = {}) -> Dict:
    tap_stream_id = stream['tap_stream_id']

    stream_metadata = metadata.to_map(stream['metadata']).get(())

    # get replication key, and bookmarked value/type
    stream_state = state.get('bookmarks', {}).get(tap_stream_id, {})

    replication_key_name = get_replication_key_name(stream)
    replication_key_value_bookmark = stream_state.get('replication_key_value')

    find_filter = {}
    if replication_key_value_bookmark:
        find_filter[replication_key_name] = {}
        find_filter[replication_key_name]['$gte'] = \
            common.string_to_class(
                replication_key_value_bookmark,
                stream_state.get('replication_key_type'),
            )

    return find_filter


def get_replication_key_name(stream: Dict) -> str:
    stream_metadata = metadata.to_map(stream['metadata']).get(())

    replication_key_name = stream.get(
        'bookmark_properties',
        stream_metadata.get('replication-key'),
    )
    if type(replication_key_name) is list and len(replication_key_name) >= 1:
        replication_key_name = replication_key_name[0]

    return replication_key_name
