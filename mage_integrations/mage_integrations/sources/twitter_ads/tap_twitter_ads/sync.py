# pylint: disable=too-many-lines
import singer

from mage_integrations.sources.twitter_ads.tap_twitter_ads.streams import (
    STREAMS,
    Reports,
    update_currently_syncing,
)

LOGGER = singer.get_logger()


# Sync - main function to loop through select streams to sync_endpoints and sync_reports
def sync(client, config, catalog, state, logger=LOGGER):
    # Get config parameters
    account_list = config.get('account_ids').replace(' ', '').split(',')
    country_code_list = config.get('country_codes', 'US').replace(' ', '').split(',')
    start_date = config.get('start_date')
    reports = config.get('reports', [])

    # Get selected_streams from catalog, based on state last_stream
    #   last_stream = Previous currently synced stream, if the load was interrupted
    last_stream = singer.get_currently_syncing(state)
    logger.info('Last/Currently Syncing Stream: {}'.format(last_stream))

    # Get ALL selected streams from catalog
    selected_streams = []
    for stream in catalog.get_selected_streams(state):
        selected_streams.append(stream.stream)
    logger.info('Sync Selected Streams: {}'.format(selected_streams))
    if not selected_streams:
        return

    # Get lists of parent and child streams to sync (from streams.py and catalog)
    # For children, ensure that dependent parent_stream is included
    parent_streams = []
    child_streams = []
    # Get all streams (parent + child) from streams.py
    # Loop thru all streams

    for stream_name, stream_obj in STREAMS.items():
        # If stream has a parent_stream, then it is a child stream
        parent_stream = hasattr(stream_obj, 'parent_stream') and stream_obj.parent_stream
        # Append selected parent streams
        if not parent_stream and stream_name in selected_streams:
            parent_streams.append(stream_name)
        # Append selected child streams
        elif parent_stream and stream_name in selected_streams:
            child_streams.append(stream_name)
            # Append un-selected parent streams of selected children
            if parent_stream not in selected_streams:
                parent_streams.append(parent_stream)
    logger.info('Sync Parent Streams: {}'.format(parent_streams))
    logger.info('Sync Child Streams: {}'.format(child_streams))

    # Get list of report streams to sync (from config and catalog)
    report_streams = []
    for report in reports:
        report_name = report.get('name')
        if report_name in selected_streams:
            report_streams.append(report_name)
    logger.info('Sync Report Streams: {}'.format(report_streams))

    # ACCOUNT_ID OUTER LOOP
    for account_id in account_list:
        logger.info('Account ID: {} - START Syncing'.format(account_id))

        # PARENT STREAM LOOP
        for stream_name in parent_streams:
            update_currently_syncing(state, stream_name)
            endpoint_config = STREAMS[stream_name]
            stream_obj = STREAMS[stream_name]()

            logger.info('Stream: {} - START Syncing, Account ID: {}'.format(
                stream_name, account_id))

            # Write schema and log selected fields for stream
            stream_obj.write_schema(catalog, stream_name)

            selected_fields = stream_obj.get_selected_fields(catalog, stream_name)
            logger.info('Stream: {} - selected_fields: {}'.format(stream_name, selected_fields))

            total_records = stream_obj.sync_endpoint(
                client=client,
                catalog=catalog,
                state=state,
                start_date=start_date,
                stream_name=stream_name,
                endpoint_config=endpoint_config,
                tap_config=config,
                account_id=account_id,
                child_streams=child_streams,
                selected_streams=selected_streams,
            )

            logger.info('Stream: {} - FINISHED Syncing, Account ID: {}, Total Records: {}'.format(
                stream_name, account_id, total_records))

            update_currently_syncing(state, None)

        # GET country_ids and platform_ids (targeting values) - only if reports exist
        if report_streams != []:
            # GET country_ids (targeting_values) based on config country_codes
            country_ids = []
            reports_obj = Reports()
            country_path = 'targeting_criteria/locations'
            for country_code in country_code_list:
                country_params = {
                    'count': 1000,
                    'cursor': None,
                    'location_type': 'COUNTRIES',
                    'country_code': country_code
                }
                country_cursor = reports_obj.get_resource('countries',
                                                          client,
                                                          country_path,
                                                          country_params)
                for country in country_cursor:
                    country_id = country['targeting_value']
                    country_ids.append(country_id)
            logger.info('Countries - Country Codes: {}, Country Targeting IDs: {}'.format(
                country_code_list, country_ids))

            # GET platform_ids (targeting_values)
            platform_ids = []
            platforms_path = 'targeting_criteria/platforms'
            platforms_params = {
                'count': 1000,
                'cursor': None
            }
            platforms_cursor = reports_obj.get_resource('platforms',
                                                        client,
                                                        platforms_path,
                                                        platforms_params)
            for platform in platforms_cursor:
                platform_id = platform['targeting_value']
                platform_ids.append(platform_id)
            logger.info('Platforms - Platform Targeting IDs: {}'.format(platform_ids))

        # REPORT STREAMS LOOP
        for report in reports:
            report_name = report.get('name')
            if report_name in report_streams:
                update_currently_syncing(state, report_name)

                logger.info('Report: {} - START Syncing for Account ID: {}'.format(
                    report_name, account_id))

                # Write schema and log selected fields for stream
                reports_obj.write_schema(catalog, report_name)

                selected_fields = reports_obj.get_selected_fields(catalog, report_name)
                logger.info('Report: {} - selected_fields: {}'.format(
                    report_name, selected_fields))

                total_records = reports_obj.sync_report(
                    client=client,
                    catalog=catalog,
                    state=state,
                    start_date=start_date,
                    report_name=report_name,
                    report_config=report,
                    tap_config=config,
                    account_id=account_id,
                    country_ids=country_ids,
                    platform_ids=platform_ids,
                )

                # pylint: disable=line-too-long
                logger.info(
                    'Report: {} - FINISHED Syncing for Account ID: {}, Total Records: {}'.format(
                     report_name, account_id, total_records))
                # pylint: enable=line-too-long
                update_currently_syncing(state, None)

        logger.info('Account ID: {} - FINISHED Syncing'.format(account_id))
