import json
import os

import singer
from tap_zendesk.streams import STREAMS


def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def load_shared_schema_refs():
    ref_sub_path = 'shared'
    shared_schemas_path = get_abs_path('schemas/' + ref_sub_path)

    shared_file_names = [f for f in os.listdir(shared_schemas_path)
                         if os.path.isfile(os.path.join(shared_schemas_path, f))]

    shared_schema_refs = {}
    for shared_file in shared_file_names:
        with open(os.path.join(shared_schemas_path, shared_file)) as data_file:
            shared_schema_refs[ref_sub_path + '/' + shared_file] = json.load(data_file)

    return shared_schema_refs


def discover_streams(client):
    streams = []
    refs = load_shared_schema_refs()

    for s in STREAMS.values():
        s = s(client)
        schema = singer.resolve_schema_references(s.load_schema(), refs)
        streams.append({'stream': s.name, 'tap_stream_id': s.name,
                        'schema': schema, 'metadata': s.load_metadata()})
    return streams
