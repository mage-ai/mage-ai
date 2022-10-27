from datetime import timedelta
from mage_integrations.sources.google_search_console.transform import transform_json
from mage_integrations.sources.google_search_console.streams import STREAMS
from singer import metrics, metadata, Transformer, utils
from singer.utils import strptime_to_utc, strftime
from urllib.parse import quote
import json
import singer


LOGGER = singer.get_logger()
BASE_URL = 'https://www.googleapis.com/webmasters/v3'
# Google Search Console is generally delayed 2-3 days
# However, delays up to 10 days have occurred in the past 6 months (late 2019, early 2020)
# Reference: https://support.google.com/webmasters/answer/96568?hl=en
ATTRIBUTION_DAYS = 14
DATE_WINDOW_SIZE = 30


def write_schema(catalog, stream_name):
    stream = catalog.get_stream(stream_name)
    schema = stream.schema.to_dict()
    try:
        singer.write_schema(stream_name, schema, stream.key_properties)
    except OSError as err:
        LOGGER.error('OS Error writing schema for: {}'.format(stream_name))
        LOGGER.error('Error: {}'.format(err))
        raise err


def write_record(stream_name, record, time_extracted):
    try:
        singer.messages.write_record(stream_name, record, time_extracted=time_extracted)
    except OSError as err:
        LOGGER.error('OS Error writing record for: {}'.format(stream_name))
        LOGGER.error('Error: {}'.format(err))
        raise err


def get_bookmark(state, stream, site, sub_type, default):
    if (state is None) or ('bookmarks' not in state):
        return default
    return (
        state
        .get('bookmarks', {})
        .get(stream, {})
        .get(site, {})
        .get(sub_type, default)
    )


def write_bookmark(state, stream, site, sub_type, value):
    if 'bookmarks' not in state:
        state['bookmarks'] = {}
    if stream not in state['bookmarks']:
        state['bookmarks'][stream] = {}
    if site not in state['bookmarks'][stream]:
        state['bookmarks'][stream][site] = {}
    state['bookmarks'][stream][site][sub_type] = value
    LOGGER.info('Write state for Stream: {}, Site: {}, Type: {}, value: {}'.format(
        stream, site, sub_type, value))
    singer.write_state(state)


def process_records(catalog, #pylint: disable=too-many-branches
                    stream_name,
                    records,
                    time_extracted,
                    bookmark_field=None,
                    max_bookmark_value=None,
                    last_datetime=None):
    stream = catalog.get_stream(stream_name)
    schema = stream.schema.to_dict()
    stream_metadata = metadata.to_map(stream.metadata)

    with metrics.record_counter(stream_name) as counter:
        for record in records:
            # Transform record for Singer.io
            with Transformer() as transformer:
                transformed_record = transformer.transform(
                    record,
                    schema,
                    stream_metadata)

                # Reset max_bookmark_value to new value if higher
                if bookmark_field and (bookmark_field in transformed_record):
                    bookmark_date = transformed_record.get(bookmark_field)
                    bookmark_dttm = strptime_to_utc(bookmark_date)
                    last_dttm = strptime_to_utc(last_datetime)

                    if not max_bookmark_value:
                        max_bookmark_value = last_datetime

                    max_bookmark_dttm = strptime_to_utc(max_bookmark_value)

                    if bookmark_dttm > max_bookmark_dttm:
                        max_bookmark_value = strftime(bookmark_dttm)

                    # Keep only records whose bookmark is after the last_datetime
                    if bookmark_dttm >= last_dttm:
                        write_record(stream_name, transformed_record, \
                            time_extracted=time_extracted)
                        counter.increment()
                else:
                    write_record(stream_name, transformed_record, time_extracted=time_extracted)
                    counter.increment()

        LOGGER.info('Stream: {}, Processed {} records'.format(stream_name, counter.value))
        return max_bookmark_value


# Sync a specific endpoint
# For performance reports, this is for: reprot, site, sub_type, date window
def sync_endpoint(client, #pylint: disable=too-many-branches
                  catalog,
                  state,
                  start_date,
                  stream_name,
                  site,
                  sub_type,
                  dimensions_list,
                  path,
                  endpoint_config,
                  api_method,
                  pagination,
                  static_params,
                  bookmark_field=None,
                  data_key=None,
                  body_params=None,
                  id_fields=None):

    # Get the latest bookmark for the stream and set the last_datetime
    last_datetime = None
    max_bookmark_value = None

    last_datetime = get_bookmark(state, stream_name, site, sub_type, start_date)
    max_bookmark_value = last_datetime

    # Pagination: loop thru all pages of data
    # Pagination types: none, body, params
    # Each page has an offset (starting value) and a limit (batch size, number of records)
    # Increase the "offset" by the "limit" for each batch.
    # Continue until the "offset" exceeds the total_records.
    offset = 0 # Starting offset value for each batch API call
    limit = endpoint_config.get('row_limit', 1000) # Batch size; Number of records per API call
    total_records = 0
    batch_count = limit
    page = 1

    while limit == batch_count:
        if pagination == 'body':
            body = {
                'startRow': offset,
                'rowLimit': limit,
                **body_params # adds in endpoint specific, sort, filter body params
            }
            params = static_params
        elif pagination == 'params':
            params = {
                'startRow': offset,
                'rowLimit': limit,
                **static_params # adds in endpoint specific, sort, filter body params
            }
            body = body_params
        else:
            params = static_params
            body = body_params

        LOGGER.info('Stream: {}, Site: {}, Type: {} - Batch Sync start, Offset: {}'.format(
            stream_name,
            site,
            sub_type,
            offset))

        # Squash params to query-string params
        querystring = None
        if params.items():
            querystring = '&'.join(['%s=%s' % (key, value) for (key, value) in params.items()])
        LOGGER.info('URL for Stream: {}, Site: {} ({}): {}/{}{}'.format(
            stream_name,
            site,
            api_method,
            BASE_URL,
            path,
            '?{}'.format(querystring) if querystring else ''))
        if body and not body == {}:
            LOGGER.info('body = {}'.format(body))

        # API request data, endpoint = stream_name passed to client for metrics logging
        data = {}
        if api_method == 'GET':
            data = client.get(
                path=path,
                params=querystring,
                endpoint=stream_name)
        elif api_method == 'POST':
            data = client.post(
                path=path,
                params=querystring,
                endpoint=stream_name,
                data=json.dumps(body))

        # time_extracted: datetime when the data was extracted from the API
        time_extracted = utils.now()
        if not data or data is None or data == {}:
            LOGGER.info('xxx NO DATA xxx')

            if bookmark_field:
                write_bookmark(state, stream_name, site, sub_type, max_bookmark_value)
            return 0 # No data results

        # Transform data with transform_json from transform.py
        transformed_data = [] # initialize the record list

        # Sites endpoint returns a single record dictionary (not a list)
        if stream_name == 'sites':
            data_list = []
            data_list.append(data)
            data_dict = {}
            data_dict[data_key] = data_list
            data = data_dict
        if data_key in data:
            transformed_data = transform_json(
                data,
                stream_name,
                data_key,
                site,
                sub_type,
                dimensions_list)[data_key]
        else:
            LOGGER.info('Number of raw data records: 0')
        if not transformed_data or transformed_data is None:
            LOGGER.info('xxx NO TRANSFORMED DATA xxx')

            if bookmark_field:
                write_bookmark(state, stream_name, site, sub_type, max_bookmark_value)
            return 0 # No data results
        for record in transformed_data:
            for key in id_fields:
                if not record.get(key):
                    primary_keys_only = { id_field: record.get(id_field) for id_field in id_fields }
                    raise ValueError('Missing key {} in record with primary keys {}'.format(key, primary_keys_only))
        batch_count = len(transformed_data)

        # Process records and get the max_bookmark_value and record_count for the set of records
        max_bookmark_value = process_records(
            catalog=catalog,
            stream_name=stream_name,
            records=transformed_data,
            time_extracted=time_extracted,
            bookmark_field=bookmark_field,
            max_bookmark_value=max_bookmark_value,
            last_datetime=last_datetime)

        # to_rec: to record; ending record for the batch
        to_rec = offset + limit
        if to_rec > total_records:
            to_rec = total_records

        LOGGER.info('Stream: {}, Site: {}, Type: {}, Page: {}, Batch records: {} to {}'.format(
            stream_name,
            site,
            sub_type,
            page,
            offset,
            to_rec))
        # Pagination: increment the offset by the limit (batch-size)
        offset = offset + limit
        total_records = total_records + batch_count
        page = page + 1

    # Update the state with the max_bookmark_value for the stream, site, sub_type
    # Reference: https://developers.google.com/webmaster-tools/search-console-api-original/v3/searchanalytics/query
    # NOTE: Results are sorted by click count descending.
    #       If two rows have the same click count, they are sorted in an arbitrary way.
    #       Records are NOT sorted in DATE order.
    # THEREFOR: State is updated after ALL pages of data for stream, site, sub_type, date window
    if bookmark_field:
        write_bookmark(state,
                       stream_name,
                       site,
                       sub_type,
                       max_bookmark_value)

    # Return total_records across all batches
    return total_records


# Currently syncing sets the stream currently being delivered in the state.
# If the integration is interrupted, this state property is used to identify
#  the starting point to continue from.
# Reference: https://github.com/singer-io/singer-python/blob/master/singer/bookmarks.py#L41-L46
def update_currently_syncing(state, stream_name):
    if (stream_name is None) and ('currently_syncing' in state):
        del state['currently_syncing']
    else:
        singer.set_currently_syncing(state, stream_name)
    singer.write_state(state)


def sync(client, config, catalog, state):
    start_date = config.get('start_date')

    # Get selected_streams from catalog, based on state last_stream
    #   last_stream = Previous currently synced stream, if the load was interrupted
    last_stream = singer.get_currently_syncing(state)
    LOGGER.info('last/currently syncing stream: {}'.format(last_stream))
    selected_streams = []
    for stream in catalog.get_selected_streams(state):
        selected_streams.append(stream.stream)
    LOGGER.info('selected_streams: {}'.format(selected_streams))

    if not selected_streams or selected_streams == []:
        return

    # Get current datetime (now_dt_str) for query parameters
    now_dttm = utils.now()
    now_dt_str = strftime(now_dttm)[0:10]
    # Reference: https://support.google.com/webmasters/answer/96568?hl=en
    # There is some delay/lag in Google Search Console results reconcilliation
    attribution_start_dttm = now_dttm - timedelta(days=ATTRIBUTION_DAYS)

    # Loop through selected_streams
    for stream_name in selected_streams:
        LOGGER.info('STARTED Syncing: {}'.format(stream_name))
        update_currently_syncing(state, stream_name)
        write_schema(catalog, stream_name)
        endpoint_config = STREAMS[stream_name]
        bookmark_field = next(iter(endpoint_config.get('replication_keys', [])), None)
        body_params = endpoint_config.get('body', {})
        endpoint_total = 0
        # Initialize body
        body = endpoint_config.get('body', {})
        # Loop through sites from config site_urls
        site_list = []
        if 'site_urls' in config:
            site_list = config['site_urls'].replace(" ", "").split(",")
        for site in site_list:
            # Skip/ignore sitemaps for domain property sites
            # Reference issue: https://github.com/googleapis/google-api-php-client/issues/1607
            #   "...sitemaps API does not support domain property urls at this time."
            if stream_name == 'sitemaps' and site[0:9] == 'sc-domain':
                LOGGER.info('Skipping Site: {}'.format(site))
                LOGGER.info('  Sitemaps API does not support domain property urls at this time.')

            else: # Not sitemaps and sites = sc-domain
                LOGGER.info('STARTED Syncing: {}, Site: {}'.format(stream_name, site))
                site_total = 0
                site_encoded = quote(site, safe='')
                path = endpoint_config.get('path').format(site_encoded)

                # Set dimension_list for performance_reports
                if stream_name == 'performance_report_custom':
                    dimensions_list = []
                    # Create dimensions_list from catalog breadcrumb
                    stream = catalog.get_stream(stream_name)
                    mdata = metadata.to_map(stream.metadata)
                    dimensions_all = ['date', 'country', 'device', 'page', 'query']
                    for dim in dimensions_all:
                        if singer.should_sync_field(singer.metadata.get(mdata, ('properties', dim), 'inclusion'),
                                                    singer.metadata.get(mdata, ('properties', dim), 'selected')):
                            # metadata is selected for the dimension
                            dimensions_list.append(dim)
                    body_params['dimensions'] = dimensions_list
                dimensions_list = body_params.get('dimensions')
                LOGGER.info('stream: {}, dimensions_list: {}'.format(stream_name, dimensions_list))

                # loop through each sub type
                sub_types = endpoint_config.get('sub_types', ['self'])
                for sub_type in sub_types:
                    sub_type_total = 0

                    # Initialize date window
                    if stream_name.startswith('performance_report'):
                        reports_dttm_str = get_bookmark(
                            state,
                            stream_name,
                            site,
                            sub_type,
                            start_date)

                        reports_dttm = strptime_to_utc(reports_dttm_str)
                        if reports_dttm < attribution_start_dttm:
                            start_dttm = reports_dttm
                        else:
                            start_dttm = attribution_start_dttm
                        end_dttm = start_dttm + timedelta(days=DATE_WINDOW_SIZE)
                        if end_dttm > now_dttm:
                            end_dttm = now_dttm

                    else:
                        start_dttm = strptime_to_utc(start_date)
                        end_dttm = now_dttm

                    # Date window loop
                    while start_dttm < now_dttm:
                        start_str = strftime(start_dttm)[0:10]
                        end_str = strftime(end_dttm)[0:10]
                        if stream_name.startswith('performance_report'):
                            body = {
                                'searchType': sub_type,
                                'startDate': start_str,
                                'endDate': end_str,
                                **body_params
                            }
                        else:
                            body = None

                        LOGGER.info('START Syncing Stream: {}, Site: {}, Type: {}, {} to {}'.format(
                            stream_name, site, sub_type, start_str, end_str))
                        total_records = sync_endpoint(
                            client=client,
                            catalog=catalog,
                            state=state,
                            start_date=start_date,
                            stream_name=stream_name,
                            site=site,
                            sub_type=sub_type,
                            dimensions_list=dimensions_list,
                            path=path,
                            endpoint_config=endpoint_config,
                            api_method=endpoint_config.get('api_method', 'GET'),
                            pagination=endpoint_config.get('pagination', 'none'),
                            static_params=endpoint_config.get('params', {}),
                            bookmark_field=bookmark_field,
                            data_key=endpoint_config.get('data_key', None),
                            body_params=body,
                            id_fields=endpoint_config.get('key_properties'))

                        # Increment totals
                        endpoint_total = endpoint_total + total_records
                        site_total = site_total + total_records
                        sub_type_total = sub_type_total + total_records

                        LOGGER.info('FINISHED Syncing Stream: {}, Site: {}, Type: {}, {} to {}'.format(
                            stream_name, site, sub_type, start_str, end_str))
                        LOGGER.info('  Records Synced for Date Window: {}'.format(total_records))

                        # Set next date window
                        start_dttm = end_dttm
                        end_dttm = start_dttm + timedelta(days=DATE_WINDOW_SIZE)
                        if end_dttm > now_dttm:
                            end_dttm = now_dttm
                        # End date window loop

                    LOGGER.info('FINISHED Syncing Stream: {}, Site: {}, Type: {}'.format(
                        stream_name, site, sub_type))
                    LOGGER.info('  Records Synced for Type: {}'.format(sub_type_total))
                    # End sub-type loop
                # End else: Not sitemaps and sites = sc-domain

                LOGGER.info('FINISHED Syncing Stream: {}, Site: {}'.format(stream_name, site))
                LOGGER.info('  Records Synced for Site: {}'.format(site_total))
                # End site loop

        LOGGER.info('FINISHED Syncing Stream: {}'.format(stream_name))
        LOGGER.info('  Records Synced for Stream: {}'.format(endpoint_total))
        update_currently_syncing(state, None)
        # End stream loop
