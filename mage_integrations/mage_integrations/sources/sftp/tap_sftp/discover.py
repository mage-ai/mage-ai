import singer
from singer import metadata

from mage_integrations.sources.sftp.tap_sftp import client
from mage_integrations.sources.sftp.tap_sftp.singer_encodings import json_schema

LOGGER = singer.get_logger()


def discover_streams(config):
    streams = []

    conn = client.connection(config)

    tables = config.get('tables', [])
    for table_spec in tables:
        LOGGER.info('Sampling records to determine table JSON schema "%s".',
                    table_spec['table_name'])
        schema = json_schema.get_schema_for_table(conn, table_spec, config)
        stream_md = metadata.get_standard_metadata(schema,
                                                   key_properties=table_spec.get('key_properties', ['_sdc_source_file', '_sdc_source_lineno', '_sdc_source_last_modified']),  # noqa
                                                   replication_method='INCREMENTAL')
        streams.append(
            {
                'stream': table_spec['table_name'],
                'tap_stream_id': table_spec['table_name'],
                'schema': schema,
                'metadata': stream_md
            }
        )

    return streams
