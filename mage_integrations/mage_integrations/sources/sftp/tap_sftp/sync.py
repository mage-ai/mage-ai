import singer
from singer import Transformer, metadata, utils

from mage_integrations.sources.base import write_state
from mage_integrations.sources.sftp.tap_sftp import stats
from mage_integrations.sources.sftp.tap_sftp.aws_ssm import AWS_SSM
from mage_integrations.sources.sftp.tap_sftp.singer_encodings import csv_handler

LOGGER = singer.get_logger()


def sync_stream(config, state, stream, sftp_client, logger=LOGGER):
    table_name = stream.tap_stream_id
    modified_since = utils.strptime_to_utc(singer.get_bookmark(state,
                                           table_name, 'modified_since') or
                                           config['start_date'])

    logger.info(f'Syncing table "{table_name}".')
    logger.info(f'Getting files modified since {modified_since}.')

    table_spec = [table_config for table_config in config["tables"] if table_config["table_name"] == table_name] # noqa

    if len(table_spec) == 0:
        logger.info(f'No table configuration found for "{table_name}"')
        return 0
    if len(table_spec) > 1:
        logger.info(f'Multiple table configurations found for "{table_name}", \
                    skipping stream')
        return 0
    table_spec = table_spec[0]

    files = sftp_client.get_files(
        table_spec["search_prefix"],
        table_spec["search_pattern"],
        modified_since
    )
    # sftp_client.close()

    logger.info(f'Found {len(files)} files to be synced.')

    records_streamed = 0
    if not files:
        return records_streamed

    for sftp_file in files:
        records_streamed += sync_file(sftp_file,
                                      stream,
                                      table_spec,
                                      config,
                                      sftp_client,
                                      logger=logger)

        state = singer.write_bookmark(state,
                                      table_name,
                                      'modified_since',
                                      sftp_file['last_modified'].isoformat())
        write_state(state)

    logger.info(f'Wrote {records_streamed} records for table "{table_name}".')

    return records_streamed


def sync_file(sftp_file_spec, stream, table_spec, config, sftp_client,
              logger=LOGGER):
    logger.info(f'Syncing file "{sftp_file_spec["filepath"]}".')
    decryption_configs = config.get('decryption_configs')
    if decryption_configs:
        decryption_configs['key'] = AWS_SSM.get_decryption_key(
            decryption_configs.get('SSM_key_name'))
        file_handle, decrypted_name = sftp_client.get_file_handle(
            sftp_file_spec, decryption_configs)
        sftp_file_spec['filepath'] = decrypted_name
    else:
        file_handle = sftp_client.get_file_handle(sftp_file_spec)

    # Add file_name to opts and flag infer_compression to support gzipped files
    opts = {'key_properties': table_spec.get('key_properties',
            ['_sdc_source_file', '_sdc_source_lineno', '_sdc_source_last_modified']),
            'delimiter': table_spec.get('delimiter', ','),
            'file_name': sftp_file_spec['filepath'],
            'encoding': table_spec.get('encoding', 'utf-8'),
            'sanitize_header': table_spec.get('sanitize_header', False),
            'skip_rows': table_spec.get('skip_rows', False)}

    readers = csv_handler.get_row_iterators(file_handle,
                                            options=opts,
                                            infer_compression=True)

    records_synced = 0

    for reader in readers:
        logger.info('Synced Record Count: 0')
        with Transformer() as transformer:
            for row in reader:
                custom_columns = {
                    '_sdc_source_file': sftp_file_spec["filepath"],

                    # index zero, +1 for header row
                    '_sdc_source_lineno': records_synced + 2,

                    '_sdc_source_last_modified': sftp_file_spec["last_modified"].isoformat()
                }
                rec = {**row, **custom_columns}
                logger.info(custom_columns)
                to_write = transformer.transform(rec,
                                                 stream.schema.to_dict(),
                                                 metadata.to_map(
                                                     stream.metadata))

                singer.write_record(stream.tap_stream_id, to_write)
                records_synced += 1
                if records_synced % 100000 == 0:
                    logger.info(f'Synced Record Count: {records_synced}')
        logger.info(f'Sync Complete - Records Synced: {records_synced}')

    stats.add_file_data(table_spec,
                        sftp_file_spec['filepath'],
                        sftp_file_spec['last_modified'],
                        records_synced)

    return records_synced
