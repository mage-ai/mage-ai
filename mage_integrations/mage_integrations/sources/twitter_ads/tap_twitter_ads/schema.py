import json
import os

import singer
from singer import metadata

from mage_integrations.sources.twitter_ads.tap_twitter_ads.streams import STREAMS

LOGGER = singer.get_logger()

GRANULARITIES = [
    'HOUR',
    'DAY',
    'TOTAL'
]

ENTITY_TYPES = [
    'ACCOUNT',
    'CAMPAIGN',
    'FUNDING_INSTRUMENT',
    'LINE_ITEM',
    'MEDIA_CREATIVE',
    'ORGANIC_TWEET',
    'PROMOTED_TWEET',
    'PROMOTED_ACCOUNT'
]

SEGMENTS = [
    'NO_SEGMENT',
    'AGE',
    'AMPLIFY_MARKETPLACE_PREROLL_VIDEOS',
    'AMPLIFY_PUBLISHER_TWEETS',
    'APP_STORE_CATEGORY',
    'AUDIENCES',
    'CONVERSATIONS',
    'CONVERSION_TAGS',
    'DEVICES',
    'EVENTS',
    'GENDER',
    'INTERESTS',
    'KEYWORDS',
    'LANGUAGES',
    'LOCATIONS',
    'METROS',
    'PLATFORM_VERSIONS',
    'PLATFORMS',
    'POSTAL_CODES',
    'REGIONS',
    'SIMILAR_TO_FOLLOWERS_OF_USER',
    'SWIPEABLE_MEDIA',
    'TV_ADS',
    'TV_SHOWS'
]


# Reference:
# https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md#Metadata

def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def load_shared_schema_refs():
    shared_schemas_path = get_abs_path('schemas/shared')

    shared_file_names = [f for f in os.listdir(shared_schemas_path)
                         if os.path.isfile(os.path.join(shared_schemas_path, f))]

    shared_schema_refs = {}
    for shared_file in shared_file_names:
        with open(os.path.join(shared_schemas_path, shared_file)) as data_file:
            shared_schema_refs[shared_file] = json.load(data_file)

    return shared_schema_refs


def make_replication_key_automatic(mdata, schema, replication_keys):
    # Make all replication keys as inclusion of automatic.
    mdata = metadata.to_map(mdata)

    # Loop through all keys and if keys found in replication_keys then make it automatic inclusion
    for field_name in schema['properties'].keys():

        if replication_keys and field_name in replication_keys:
            mdata = metadata.write(mdata, ('properties', field_name), 'inclusion', 'automatic')

    return metadata.to_list(mdata)


def get_schemas(reports, logger=LOGGER):
    schemas = {}
    field_metadata = {}

    refs = load_shared_schema_refs()

    # JSON schemas for each stream endpoint
    for stream_name, stream_metadata in STREAMS.items():
        schema_path = get_abs_path('schemas/{}.json'.format(stream_name))

        with open(schema_path) as file:
            schema = json.load(file)

        schemas[stream_name] = schema
        schema = singer.resolve_schema_references(schema, refs)
        mdata = metadata.new()

        # Documentation:
        # https://github.com/singer-io/getting-started/blob/master/docs/DISCOVERY_MODE.md#singer-python-helper-functions
        # Reference:
        # https://github.com/singer-io/singer-python/blob/master/singer/metadata.py#L25-L44
        mdata = metadata.get_standard_metadata(
            schema=schema,
            key_properties=(hasattr(stream_metadata, 'key_properties')
                            or None) and stream_metadata.key_properties,

            valid_replication_keys=(hasattr(stream_metadata, 'replication_keys')
                                    or None) and stream_metadata.replication_keys,

            replication_method=(hasattr(stream_metadata, 'replication_method')
                                or None) and stream_metadata.replication_method
        )
        # Make replication keys of automatic inclusion
        mdata = make_replication_key_automatic(mdata, schema,
                                               (hasattr(stream_metadata, 'replication_keys')
                                                or None) and stream_metadata.replication_keys)

        field_metadata[stream_name] = mdata

    # JSON schemas for each report
    for report in reports:
        report_name = report.get('name')
        report_entity = report.get('entity')
        report_segment = report.get('segment')
        report_granularity = report.get('granularity')

        # Metrics & Segmentation:
        # https://developer.twitter.com/en/docs/ads/analytics/overview/metrics-and-segmentation
        # Google Sheet summary:
        # https://docs.google.com/spreadsheets/d/1Cn3B1TPZOjg9QhnnF44Myrs3W8hNOSyFRH6qn8SCc7E/edit?usp=sharing
        err = None
        running_error = ''
        if report_entity not in ENTITY_TYPES:
            err = 'Report: {}, Entity: {}: INVALID ENTITY'.format(report_name, report_entity)
            running_error = '{}; {}'.format(running_error, err)
        if report_segment not in SEGMENTS:
            err = 'Report: {}, Segment: {}: INVALID SEGMENT'.format(report_name, report_segment)
            running_error = '{}; {}'.format(running_error, err)
        if report_granularity not in GRANULARITIES:
            err = 'Report: {}, Granularity: {}: INVALID GRANULARITY'.format(
                report_name, report_granularity)
            running_error = '{}; {}'.format(running_error, err)

        if report_entity in ('MEDIA_CREATIVE', 'ORGANIC_TWEET') and \
                not report_segment == 'NO_SEGMENT':
            err = 'Report: {}, Segment: {}, SEGMENTATION NOT ALLOWED for Entity: {}'.format(
                report_name, report_segment, report_entity)
            running_error = '{}; {}'.format(running_error, err)

        # Undocumented rule: CONVERSION_TAGS report segment only allowed for certain entities
        if report_segment == 'CONVERSION_TAGS' and report_entity in \
                ['FUNDING_INSTRUMENT', 'PROMOTED_ACCOUNT']:  # 'ACCOUNT',
            err = 'Report: {}, Entity: {}, Segment: CONVERSION_TAGS, INVALID COMBINATION'.format(
                report_name, report_entity)
            running_error = '{}; {}'.format(running_error, err)

        # Undocumented rule: LANGUAGES report segment only allowed for certain report_entities
        if report_segment == 'LANGUAGES' and report_entity in \
                ['ACCOUNT', 'FUNDING_INSTRUMENT', 'MEDIA_CREATIVE']:
            err = 'Report: {}, Entity: {}, Segment: LANGUAGES, INVALID COMBINATION'.format(
                report_name, report_entity)
            running_error = '{}; {}'.format(running_error, err)
        if err:
            logger.error('ERROR: {}'.format(running_error))
            raise RuntimeError(running_error)

        # Undocumented rule: CONVERSION_TAGS report segment ONLY allows WEB_CONVERSION metric group
        if report_segment == 'CONVERSION_TAGS' and report_entity in \
                ['ACCOUNT', 'CAMPAIGN', 'LINE_ITEM', 'PROMOTED_TWEET']:
            report_path = get_abs_path('schemas/shared/report_web_conversion.json')

        # ACCOUNT, FUNDING_INSTRUMENT, ORGANIC_TWEET only permit a subset of METRIC_GROUPS
        elif report_entity in ('ACCOUNT', 'FUNDING_INSTRUMENT', 'ORGANIC_TWEET'):
            report_path = get_abs_path('schemas/shared/report_{}.json'.format(
                report_entity.lower()))
        else:
            report_path = get_abs_path('schemas/shared/report_other.json')

        with open(report_path) as file:
            schema = json.load(file)

        # Replace $ref nodes with reference nodes in schema
        schema = singer.resolve_schema_references(schema, refs)

        # If NO_SEGMENT, then remove Segment fields
        if report_segment == 'NO_SEGMENT':
            schema['properties']['dimensions'].pop('segmentation_type', None)
            schema['properties']['dimensions'].pop('segment_name', None)
            schema['properties']['dimensions'].pop('segment_value', None)

        # Web Conversion ONLY valid for NO_SEGMENT, PLATFORM, and CONVERSION_TAGS segment
        # Reference:
        # https://developer.twitter.com/en/docs/ads/analytics/overview/metrics-and-segmentation#WEB_CONVERSION
        #   Docs ^^ say 'PLATFORMS Only' Segmentation;
        # but CONVERSION_TAGS segment only allow WEB_CONVERSION metrics
        if report_segment not in ('NO_SEGMENT', 'PLATFORMS', 'CONVERSION_TAGS'):
            schema['properties'].pop('web_conversion', None)

        schemas[report_name] = schema
        mdata = metadata.new()

        mdata = metadata.get_standard_metadata(
            schema=schema,
            key_properties=['__sdc_dimensions_hash_key'],
            valid_replication_keys=['end_time'],
            replication_method='INCREMENTAL'
        )

        # Make replication keys of automatic inclusion
        mdata = make_replication_key_automatic(mdata, schema, ['end_time'])

        field_metadata[report_name] = mdata

    return schemas, field_metadata
