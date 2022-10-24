from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.constants import (
    INCLUSION_AUTOMATIC,
    INCLUSION_AVAILABLE,
    INCLUSION_UNSUPPORTED,
    METADATA_KEY_INCLUSION,
    METADATA_KEY_SELECTED,
)
from mage_integrations.utils.array import find
from singer.metadata import to_list, write
from singer.utils import check_config, load_json
from typing import Dict, List
import argparse
import json
import os
import yaml


def get_standard_metadata(
    key_properties: List[str] = None,
    replication_method: str = None,
    schema: Dict = None,
    stream_id: str = None,
    valid_replication_keys: List[str] = None,
) -> List[Dict]:
    mdata = {}

    if key_properties is not None:
        mdata = write(mdata, (), 'table-key-properties', key_properties)
    if replication_method:
        mdata = write(mdata, (), 'forced-replication-method', replication_method)
    if valid_replication_keys is not None:
        mdata = write(mdata, (), 'valid-replication-keys', valid_replication_keys)
    if schema:
        mdata = write(mdata, (), 'inclusion', 'available')

        if stream_id:
            mdata = write(mdata, (), 'schema-name', stream_id)
        for field_name in schema['properties'].keys():
            if (key_properties and field_name in key_properties) or (valid_replication_keys and field_name in valid_replication_keys):
                mdata = write(mdata, ('properties', field_name), 'inclusion', 'automatic')
            else:
                mdata = write(mdata, ('properties', field_name), 'inclusion', 'available')

    return to_list(mdata)


def update_catalog_dict(
    catalog: Dict,
    stream_id: str,
    key_properties: List[str],
    replication_method: str,
    bookmark_properties: List[str] = [],
    deselected_columns: List[str] = [],
    select_all: bool = False,
    select_stream: bool = False,
    selected_columns: List[str] = None,
    unique_conflict_method: str = None,
    unique_constraints: List[str] = [],
) -> Dict:
    stream = find(lambda x: x['tap_stream_id'] == stream_id, catalog['streams'])

    stream['key_properties'] = key_properties
    stream['bookmark_properties'] = bookmark_properties
    stream['replication_method'] = replication_method
    stream['unique_conflict_method'] = unique_conflict_method
    stream['unique_constraints'] = unique_constraints

    for d in stream['metadata']:
        breadcrumb = d.get('breadcrumb')
        metadata = d.get('metadata')

        if len(breadcrumb) == 0:
            d['metadata'][METADATA_KEY_SELECTED] = select_stream
        elif breadcrumb and \
           metadata and \
           len(breadcrumb) == 2 and \
           breadcrumb[0] == 'properties':
            column = breadcrumb[1]

            inclusion = metadata.get(METADATA_KEY_INCLUSION, INCLUSION_UNSUPPORTED)

            if select_all:
                selected = True
            elif INCLUSION_AUTOMATIC == inclusion:
                selected = True
            elif INCLUSION_UNSUPPORTED == inclusion:
                selected = False
            elif selected_columns is None:
                selected = True
            else:
                selected = column in selected_columns and column not in deselected_columns

            d['metadata'][METADATA_KEY_SELECTED] = selected

    streams = [stream]
    for s in catalog['streams']:
        if s['tap_stream_id'] != stream_id:
            streams.append(s)

    return dict(streams=streams)

def update_catalog(
    absolute_path_to_catalog: str,
    **kwargs,
) -> None:
    with open(absolute_path_to_catalog, 'r') as f:
        catalog = json.loads(f.read())

    with open(absolute_path_to_catalog, 'w') as f:
        f.write(json.dumps(update_catalog_dict(catalog.copy(), **kwargs), indent=2))


def update_source_state_from_destination_state(
    absolute_path_to_source_state: str,
    absolute_path_to_destination_state: str,
) -> None:
    """
        absolute_path_to_source_state:
            must be path to JSON file
        absolute_path_to_source_state:
            must be path to text-like file
    """
    destination_state = None
    if os.path.isfile(absolute_path_to_destination_state):
        with open(absolute_path_to_destination_state, 'r') as f:
            destination_state = f.read().splitlines()
    else:
        with open(absolute_path_to_destination_state, 'w') as f:
            f.write('')

    with open(absolute_path_to_source_state, 'w') as f:
        line = '{}'
        if destination_state and len(destination_state) >= 1:
            line = destination_state[len(destination_state) - 1]
        f.write(json.dumps(dict(bookmarks=json.loads(line))))


def parse_args(required_config_keys):
    '''Parse standard command-line args.

    Parses the command-line arguments mentioned in the SPEC and the
    BEST_PRACTICES documents:

    -c,--config     Config file
    -s,--state      State file
    -d,--discover   Run in discover mode
    -p,--properties Properties file: DEPRECATED, please use --catalog instead
    --catalog       Catalog file

    Returns the parsed args object from argparse. For each argument that
    point to JSON files (config, state, properties), we will automatically
    load and parse the JSON file.
    '''
    parser = argparse.ArgumentParser()

    # This can be included in the settings file or in the config_json
    parser.add_argument(
        '-c', '--config',
        help='Config file',
        required=False)

    parser.add_argument(
        '--config_json',
        help='JSON string containing config values.',
    )

    parser.add_argument(
        '-s', '--state',
        help='State file',
    )

    parser.add_argument(
        '-p', '--properties',
        help='Property selections: DEPRECATED, Please use --catalog instead',
    )

    # This can be included in the settings file
    parser.add_argument(
        '--catalog',
        help='Catalog file',
    )

    parser.add_argument(
        '-d', '--discover',
        action='store_true',
        help='Do schema discovery',
    )

    parser.add_argument(
        '--discover_streams',
        action='store_true',
        help='Do schema discovery but only return the schema names.',
    )

    parser.add_argument(
        '--query',
        help='File containing query parameters for source’s load_data method.',
    )

    parser.add_argument(
        '--query_json',
        help='JSON string containing query parameters for source’s load_data method.',
    )

    parser.add_argument(
        '--selected_streams_json',
        help='JSON string containing query parameters for source’s load_data method.',
    )

    parser.add_argument(
        '--settings',
        help='YAML file containing config and catalog information.',
    )

    parser.add_argument(
        '--log_to_stdout',
        help='Sources will log using Singer logger by default. Set his flag to True to log to sys.stdout.',
    )

    args = parser.parse_args()

    if args.state:
        setattr(args, 'state_path', args.state)
        args.state = load_json(args.state)
    else:
        args.state = {}

    if args.properties:
        setattr(args, 'properties_path', args.properties)
        args.properties = load_json(args.properties)

    if args.catalog:
        setattr(args, 'catalog_path', args.catalog)
        args.catalog = Catalog.load(args.catalog)

    query = dict()
    if args.query_json:
        query.update(json.loads(args.query_json))
    if args.query:
        query.update(json.loads(args.query))
    args.query = query

    args.selected_streams = []
    if args.selected_streams_json:
        args.selected_streams = json.loads(args.selected_streams_json)

    config = dict()
    if args.settings:
        with open(args.settings) as f:
            args.settings = yaml.safe_load(f.read())
            if args.settings.get('config') and not args.config:
                config.update(args.settings['config'])

            if args.settings.get('catalog'):
                args.catalog = Catalog.from_dict(args.settings['catalog'])

    if args.config:
        setattr(args, 'config_path', args.config)
        config.update(load_json(args.config))
    if args.config_json:
        config.update(json.loads(args.config_json))
    args.config = config

    check_config(args.config, required_config_keys)

    return args
