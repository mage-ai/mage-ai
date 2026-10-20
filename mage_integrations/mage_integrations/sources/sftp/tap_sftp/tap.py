
import singer
from singer import metadata
from terminaltables import AsciiTable

from mage_integrations.sources.base import write_schema, write_state
from mage_integrations.sources.sftp.tap_sftp import client
from mage_integrations.sources.sftp.tap_sftp.discover import discover_streams
from mage_integrations.sources.sftp.tap_sftp.stats import STATS
from mage_integrations.sources.sftp.tap_sftp.sync import sync_stream

REQUIRED_CONFIG_KEYS = ["username", "port", "host", "tables", "start_date"]
REQUIRED_DECRYPT_CONFIG_KEYS = ['SSM_key_name', 'gnupghome', 'passphrase']
REQUIRED_TABLE_SPEC_CONFIG_KEYS = ["delimiter", "table_name", "search_prefix",
                                   "search_pattern"]
LOGGER = singer.get_logger()


def do_discover(config, logger=LOGGER):
    logger.info("Starting discover")
    streams = discover_streams(config)
    catalog = {"streams": streams}
    logger.info("Finished discover")
    return catalog


def stream_is_selected(mdata):
    return mdata.get((), {}).get('selected', False)


def do_sync(config, catalog, state, logger=LOGGER):
    logger.info('Starting sync.')
    sftp_client = client.connection(config)

    for stream in catalog.streams:
        stream_name = stream.tap_stream_id
        mdata = metadata.to_map(stream.metadata)

        if not stream_is_selected(mdata):
            continue

        write_state(state)
        key_properties = metadata.get(metadata.to_map(stream.metadata),
                                      (),
                                      "table-key-properties")
        replication_method = stream.replication_method
        write_schema(stream_name,
                     stream.schema.to_dict(),
                     key_properties,
                     replication_method=replication_method)

        logger.info(f"{stream_name}: Starting sync")
        counter_value = sync_stream(config, state, stream, sftp_client, logger=logger)
        logger.info(f"{stream_name}: Completed sync ({counter_value} rows)")

    headers = [['table_name',
                'search prefix',
                'search pattern',
                'file path',
                'row count',
                'last_modified']]

    rows = []

    for table_name, table_data in STATS.items():
        for filepath, file_data in table_data['files'].items():
            rows.append([table_name,
                         table_data['search_prefix'],
                         table_data['search_pattern'],
                         filepath,
                         file_data['row_count'],
                         file_data['last_modified']])

    data = headers + rows
    table = AsciiTable(data, title='Extraction Summary')

    sftp_client.close()
    logger.info(f"\n\n{table.table}")
    logger.info('Done syncing.')


# @singer.utils.handle_top_exception(LOGGER)
# def main():
#     args = utils.parse_args(REQUIRED_CONFIG_KEYS)
#     # validate tables config
#     for table in args.config.get('tables'):
#         utils.check_config(table, REQUIRED_TABLE_SPEC_CONFIG_KEYS)

#     decrypt_configs = args.config.get('decryption_configs')
#     if decrypt_configs:
#         # validate decryption configs
#         utils.check_config(decrypt_configs, REQUIRED_DECRYPT_CONFIG_KEYS)

#     if args.discover:
#         do_discover(args.config)
#     elif args.catalog or args.properties:
#         do_sync(args.config, args.catalog, args.state)
