import copy
import datetime
import urllib.parse
from datetime import timedelta

import singer
from singer import (
    UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING,
    Transformer,
    metadata,
    metrics,
    should_sync_field,
    utils,
)
from singer.utils import strftime, strptime_to_utc

from mage_integrations.sources.linkedin_ads.tap_linkedin_ads.schema import STREAMS
from mage_integrations.sources.linkedin_ads.tap_linkedin_ads.transform import (
    snake_case_to_camel_case,
    transform_json,
)
from mage_integrations.sources.messages import write_schema as write_schema_orig

LOGGER = singer.get_logger()

LOOKBACK_WINDOW = 7
DATE_WINDOW_SIZE = 30 # days
PAGE_SIZE = 100

FIELDS_AVAILABLE_FOR_AD_ANALYTICS_V2 = {
    'actionClicks',
    'adUnitClicks',
    'approximateUniqueImpressions',
    'cardClicks',
    'cardImpressions',
    'clicks',
    'commentLikes',
    'comments',
    'companyPageClicks',
    'conversionValueInLocalCurrency',
    'costInLocalCurrency',
    'costInUsd',
    'dateRange',
    'externalWebsiteConversions',
    'externalWebsitePostClickConversions',
    'externalWebsitePostViewConversions',
    'follows',
    'fullScreenPlays',
    'impressions',
    'landingPageClicks',
    'leadGenerationMailContactInfoShares',
    'leadGenerationMailInterestedClicks',
    'likes',
    'oneClickLeadFormOpens',
    'oneClickLeads',
    'opens',
    'otherEngagements',
    'pivot',
    'pivotValue',
    'pivotValues',
    'reactions',
    'sends',
    'shares',
    'textUrlClicks',
    'totalEngagements',
    'videoCompletions',
    'videoFirstQuartileCompletions',
    'videoMidpointCompletions',
    'videoStarts',
    'videoThirdQuartileCompletions',
    'videoViews',
    'viralCardClicks',
    'viralCardImpressions',
    'viralClicks',
    'viralCommentLikes',
    'viralComments',
    'viralCompanyPageClicks',
    'viralExternalWebsiteConversions',
    'viralExternalWebsitePostClickConversions',
    'viralExternalWebsitePostViewConversions',
    'viralFollows',
    'viralFullScreenPlays',
    'viralImpressions',
    'viralLandingPageClicks',
    'viralLikes',
    'viralOneClickLeadFormOpens',
    'viralOneClickLeads',
    'viralOtherEngagements',
    'viralReactions',
    'viralShares',
    'viralTotalEngagements',
    'viralVideoCompletions',
    'viralVideoFirstQuartileCompletions',
    'viralVideoMidpointCompletions',
    'viralVideoStarts',
    'viralVideoThirdQuartileCompletions',
    'viralVideoViews',
}

def write_schema(catalog, stream_name):
    stream = catalog.get_stream(stream_name)
    schema = stream.schema.to_dict()
    try:
        write_schema_orig(
            stream_name=stream_name,
            schema=schema,
            key_properties=stream.key_properties,
            bookmark_properties=stream.bookmark_properties,
            disable_column_type_check=stream.disable_column_type_check,
            partition_keys=stream.partition_keys,
            replication_method=stream.replication_method,
            stream_alias=stream.stream_alias,
            unique_conflict_method=stream.unique_conflict_method,
            unique_constraints=stream.unique_constraints,
        )
    except OSError as err:
        LOGGER.info('OS Error writing schema for: %s', stream_name)
        raise err


def write_record(stream_name, record, time_extracted):
    try:
        singer.write_record(stream_name, record, time_extracted=time_extracted)
    except OSError as err:
        LOGGER.info('OS Error writing record for: %s', stream_name)
        LOGGER.info('record: %s', record)
        raise err


def get_bookmark(state, stream, default):
    if (state is None) or ('bookmarks' not in state):
        return default

    data = (
        state
        .get('bookmarks', {})
        .get(stream, {})
    )

    if stream in STREAMS and 'replication_keys' in STREAMS[stream]:
        replication_keys = STREAMS[stream]['replication_keys']
        if len(replication_keys) >= 1:
            replication_key = replication_keys[0]
            if replication_key in data:
                return data[replication_key]

    return default



def write_bookmark(state, stream, value):
    if 'bookmarks' not in state:
        state['bookmarks'] = {}

    bookmark_properties = STREAMS.get(stream, {}).get('replication_keys', [])
    if len(bookmark_properties) >= 1:
        LOGGER.info('Write state for stream: %s, value: %s', stream, value)
        bookmark_key = bookmark_properties[0]
        state = singer.write_bookmark(state, stream, bookmark_key, value)
        singer.write_state(state)
    else:
        LOGGER.info('No bookmark property for stream: %s, value: %s', stream, value)


# pylint: disable=too-many-arguments,too-many-locals
def process_records(catalog,
                    stream_name,
                    records,
                    time_extracted,
                    bookmark_field=None,
                    max_bookmark_value=None,
                    last_datetime=None,
                    parent=None,
                    parent_id=None):
    stream = catalog.get_stream(stream_name)
    schema = stream.schema.to_dict()
    stream_metadata = metadata.to_map(stream.metadata)

    with metrics.record_counter(stream_name) as counter:
        for record in records:
            # If child object, add parent_id to record
            if parent_id and parent:
                record[parent + '_id'] = parent_id

            # Transform record for Singer.io
            with Transformer(integer_datetime_fmt=UNIX_MILLISECONDS_INTEGER_DATETIME_PARSING) \
                as transformer:
                transformed_record = transformer.transform(
                    record,
                    schema,
                    stream_metadata)

                # Reset max_bookmark_value to new value if higher
                if bookmark_field and (bookmark_field in transformed_record):
                    if max_bookmark_value is None or strptime_to_utc(transformed_record[bookmark_field]) > strptime_to_utc(max_bookmark_value):
                        max_bookmark_value = transformed_record[bookmark_field]

                if bookmark_field and (bookmark_field in transformed_record):
                    last_dttm = strptime_to_utc(last_datetime)
                    bookmark_dttm = strptime_to_utc(transformed_record[bookmark_field])
                    # Keep only records whose bookmark is after the last_datetime
                    if bookmark_dttm >= last_dttm:
                        write_record(stream_name, transformed_record, time_extracted=time_extracted)
                        counter.increment()
                else:
                    write_record(stream_name, transformed_record, time_extracted=time_extracted)
                    counter.increment()

        return max_bookmark_value, counter.value


# Sync a specific parent or child endpoint.
# pylint: disable=too-many-branches,too-many-statements,too-many-arguments,too-many-locals
def sync_endpoint(client,
                  catalog,
                  state,
                  start_date,
                  stream_name,
                  path,
                  endpoint_config,
                  data_key,
                  static_params,
                  bookmark_query_field=None,
                  bookmark_field=None,
                  id_fields=None,
                  parent=None,
                  parent_id=None):

    # Get the latest bookmark for the stream and set the last_datetime
    last_datetime = get_bookmark(state, stream_name, start_date)
    max_bookmark_value = last_datetime
    LOGGER.info('%s: bookmark last_datetime = %s', stream_name, max_bookmark_value)


    # Initialize child_max_bookmarks
    child_max_bookmarks = {}
    children = endpoint_config.get('children')
    if children:
        for child_stream_name, child_endpoint_config in children.items():
            should_stream, _ = should_sync_stream(get_selected_streams(catalog),
                                                  None,
                                                  child_stream_name)

            if should_stream:
                write_schema(catalog, child_stream_name)
                child_bookmark_field = child_endpoint_config.get('bookmark_field')
                if child_bookmark_field:
                    child_last_datetime = get_bookmark(state, stream_name, start_date)
                    child_max_bookmarks[child_stream_name] = child_last_datetime

    # Pagination reference:
    # https://docs.microsoft.com/en-us/linkedin/shared/api-guide/concepts/pagination?context=linkedin/marketing/context
    # Each page has a "start" (offset value) and a "count" (batch size, number of records)
    # Increase the "start" by the "count" for each batch.
    # Continue until the "start" exceeds the total_records.
    start = 0 # Starting offset value for each batch API call
    total_records = 0
    page = 1
    params = {
        'start': start,
        'count': PAGE_SIZE,
        **static_params # adds in endpoint specific, sort, filter params
    }
    if bookmark_query_field:
        params[bookmark_query_field] = last_datetime

    querystring = '&'.join(['%s=%s' % (key, value) for (key, value) in params.items()])
    next_url = 'https://api.linkedin.com/v2/{}?{}'.format(path, querystring)

    while next_url: #pylint: disable=too-many-nested-blocks
        LOGGER.info('URL for %s: %s', stream_name, next_url)

        # Get data, API request
        data = client.get(
            url=next_url,
            endpoint=stream_name)
        # time_extracted: datetime when the data was extracted from the API
        time_extracted = utils.now()

        # Transform data with transform_json from transform.py
        #  This function converts unix datetimes, de-nests audit fields,
        #  tranforms URNs to IDs, tranforms/abstracts variably named fields,
        #  converts camelCase to snake_case for fieldname keys.
        # For the Linkedin Ads API, 'elements' is always the root data_key for records.
        # The data_key identifies the collection of records below the <root> element
        transformed_data = [] # initialize the record list
        if data_key in data:
            transformed_data = transform_json(data, stream_name)[data_key]

        if not transformed_data or transformed_data is None:
            LOGGER.info('No transformed_data')
            break # No data results

        pre_singer_transformed_data = copy.deepcopy(transformed_data)

        # Process records and get the max_bookmark_value and record_count for the set of records
        max_bookmark_value, record_count = process_records(
            catalog=catalog,
            stream_name=stream_name,
            records=transformed_data,
            time_extracted=time_extracted,
            bookmark_field=bookmark_field,
            max_bookmark_value=max_bookmark_value,
            last_datetime=last_datetime,
            parent=parent,
            parent_id=parent_id)
        LOGGER.info('%s, records processed: %s', stream_name, record_count)
        total_records = total_records + record_count

        # Loop thru parent batch records for each children objects (if should stream)
        if children:
            for child_stream_name, child_endpoint_config in children.items():
                should_stream, _ = should_sync_stream(get_selected_streams(catalog),
                                                      None,
                                                      child_stream_name)
                if should_stream:
                    # For each parent record
                    for record in pre_singer_transformed_data:
                        i = 0
                        # Set parent_id
                        for id_field in id_fields:
                            if i == 0:
                                parent_id_field = id_field
                            if id_field == 'id':
                                parent_id_field = id_field
                            i = i + 1
                        parent_id = record.get(parent_id_field)
                        # Add children filter params based on parent IDs
                        if stream_name == 'accounts':
                            account = 'urn:li:sponsoredAccount:{}'.format(parent_id)
                            owner_id = record.get('reference_organization_id', None)
                            owner = 'urn:li:organization:{}'.format(owner_id)
                            if child_stream_name == 'video_ads' and owner_id is not None:
                                child_endpoint_config['params']['account'] = account
                                child_endpoint_config['params']['owner'] = owner
                            else:
                                LOGGER.warning("Skipping video_ads call for %s account as reference_organization_id is not found.", account)
                                continue
                        elif stream_name == 'campaigns':
                            campaign = 'urn:li:sponsoredCampaign:{}'.format(parent_id)
                            if child_stream_name == 'creatives':
                                child_endpoint_config['params']['search.campaign.values[0]'] = campaign
                            elif child_stream_name in ('ad_analytics_by_campaign', 'ad_analytics_by_creative'):
                                child_endpoint_config['params']['campaigns[0]'] = campaign

                        LOGGER.info('Syncing: %s, parent_stream: %s, parent_id: %s',
                                    child_stream_name,
                                    stream_name,
                                    parent_id)
                        child_path = child_endpoint_config.get('path')

                        if child_stream_name in {'ad_analytics_by_campaign', 'ad_analytics_by_creative'}:
                            child_total_records, child_batch_bookmark_value = sync_ad_analytics(
                                client=client,
                                catalog=catalog,
                                state=state,
                                last_datetime=last_datetime,
                                stream_name=child_stream_name,
                                path=child_path,
                                endpoint_config=child_endpoint_config,
                                data_key=child_endpoint_config.get('data_key', 'elements'),
                                static_params=child_endpoint_config.get('params', {}),
                                bookmark_query_field=child_endpoint_config.get('bookmark_query_field'),
                                bookmark_field=child_endpoint_config.get('bookmark_field'),
                                id_fields=child_endpoint_config.get('id_fields'),
                                parent=child_endpoint_config.get('parent'),
                                parent_id=parent_id)

                        else:

                            child_total_records, child_batch_bookmark_value = sync_endpoint(
                                client=client,
                                catalog=catalog,
                                state=state,
                                start_date=start_date,
                                stream_name=child_stream_name,
                                path=child_path,
                                endpoint_config=child_endpoint_config,
                                data_key=child_endpoint_config.get('data_key', 'elements'),
                                static_params=child_endpoint_config.get('params', {}),
                                bookmark_query_field=child_endpoint_config.get('bookmark_query_field'),
                                bookmark_field=child_endpoint_config.get('bookmark_field'),
                                id_fields=child_endpoint_config.get('id_fields'),
                                parent=child_endpoint_config.get('parent'),
                                parent_id=parent_id)

                        child_batch_bookmark_dttm = strptime_to_utc(child_batch_bookmark_value)
                        child_max_bookmark = child_max_bookmarks.get(child_stream_name)
                        child_max_bookmark_dttm = strptime_to_utc(child_max_bookmark)
                        if child_batch_bookmark_dttm > child_max_bookmark_dttm:
                            child_max_bookmarks[child_stream_name] = strftime(child_batch_bookmark_dttm)

                        LOGGER.info('Synced: %s, parent_id: %s, total_records: %s',
                                    child_stream_name,
                                    parent_id,
                                    child_total_records)

        # Pagination: Get next_url
        next_url = None
        links = data.get('paging', {}).get('links', [])
        for link in links:
            rel = link.get('rel')
            if rel == 'next':
                href = link.get('href')
                if href:
                    next_url = 'https://api.linkedin.com{}'.format(urllib.parse.unquote(href))

        LOGGER.info('%s: Synced page %s, this page: %s. Total records processed: %s',
                    stream_name,
                    page,
                    record_count,
                    total_records)
        page = page + 1

    # Write child bookmarks
    for key, val in list(child_max_bookmarks.items()):
        write_bookmark(state, key, val)

    return total_records, max_bookmark_value


# Review catalog and make a list of selected streams
def get_selected_streams(catalog):
    selected_streams = set()
    for stream in catalog.streams:
        mdata = metadata.to_map(stream.metadata)
        root_metadata = mdata.get(())
        if root_metadata and root_metadata.get('selected') is True:
            selected_streams.add(stream.tap_stream_id)
    return list(selected_streams)


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


# Review last_stream (last currently syncing stream), if any,
#  and continue where it left off in the selected streams.
# Or begin from the beginning, if no last_stream, and sync
#  all selected steams.
# Returns should_sync_stream (true/false) and last_stream.
def should_sync_stream(selected_streams, last_stream, stream_name):
    if last_stream == stream_name or last_stream is None:
        if last_stream is not None:
            last_stream = None
        if stream_name in selected_streams:
            return True, last_stream
    return False, last_stream


def sync(client, config, catalog, state):
    if 'start_date' in config:
        start_date = config['start_date']

    if config.get("page_size"):
        global PAGE_SIZE # pylint: disable=global-statement
        PAGE_SIZE = int(config.get("page_size"))

    if config.get('date_window_size'):
        LOGGER.info('Using non-standard date window size of %s', config.get('date_window_size'))
        global DATE_WINDOW_SIZE # pylint: disable=global-statement
        DATE_WINDOW_SIZE = config.get('date_window_size')
    else:
        LOGGER.info('Using standard date window size of %s', DATE_WINDOW_SIZE)

    # Get datetimes for endpoint parameters
    now = utils.now()
    # delta = 7 days to account for delays in ads data
    delta = 7
    analytics_campaign_dt_str = get_bookmark(state, 'ad_analytics_by_campaign', start_date)
    analytics_campaign_dt = strptime_to_utc(analytics_campaign_dt_str) - timedelta(days=delta)
    analytics_creative_dt_str = get_bookmark(state, 'ad_analytics_by_creative', start_date)
    analytics_creative_dt = strptime_to_utc(analytics_creative_dt_str) - timedelta(days=delta)

    selected_streams = get_selected_streams(catalog)
    LOGGER.info('selected_streams: %s', selected_streams)

    if not selected_streams:
        return

    # last_stream = Previous currently synced stream, if the load was interrupted
    last_stream = singer.get_currently_syncing(state)
    LOGGER.info('last/currently syncing stream: %s', last_stream)

    # endpoints: API URL endpoints to be called
    # properties:
    #   <root node>: Plural stream name for the endpoint
    #   path: API endpoint relative path, when added to the base URL, creates the full path
    #   account_filter: Method for Account filtering. Each uses a different query pattern/parameter:
    #        search_id_values_param, search_account_values_param, accounts_param
    #   params: Query, sort, and other endpoint specific parameters
    #   data_key: JSON element containing the records for the endpoint
    #   bookmark_query_field: Typically a date-time field used for filtering the query
    #   bookmark_field: Replication key field, typically a date-time, used for filtering the results
    #        and setting the state
    #   store_ids: Used for parents to create an id_bag collection of ids for children endpoints
    #   id_fields: Primary key (and other IDs) from the Parent stored when store_ids is true.
    #   children: A collection of child endpoints (where the endpoint path includes the parent id)
    #   parent: On each of the children, the singular stream name for parent element
    #       NOT NEEDED FOR THIS INTEGRATION (The Children all include a reference to the Parent)
    endpoints = {
        'accounts': {
            'path': 'adAccountsV2',
            'account_filter': 'search_id_values_param',
            'params': {
                'q': 'search',
                'sort.field': 'ID',
                'sort.order': 'ASCENDING'
            },
            'data_key': 'elements',
            'bookmark_field': 'last_modified_time',
            'id_fields': ['id', 'reference_organization_id'],
            'children': {
                'video_ads': {
                    'path': 'adDirectSponsoredContents',
                    'account_filter': None,
                    'params': {
                        'q': 'account'
                    },
                    'data_key': 'elements',
                    'bookmark_field': 'last_modified_time',
                    'id_fields': ['content_reference']
                }
            }
        },

        'account_users': {
            'path': 'adAccountUsersV2',
            'account_filter': 'accounts_param',
            'params': {
                'q': 'accounts'
            },
            'data_key': 'elements',
            'bookmark_field': 'last_modified_time',
            'id_fields': ['account_id', 'user_person_id']
        },

        'campaign_groups': {
            'path': 'adCampaignGroupsV2',
            'account_filter': 'search_account_values_param',
            'params': {
                'q': 'search',
                'sort.field': 'ID',
                'sort.order': 'ASCENDING'
            },
            'data_key': 'elements',
            'bookmark_field': 'last_modified_time',
            'id_fields': ['id']
        },

        'campaigns': {
            'path': 'adCampaignsV2',
            'account_filter': 'search_account_values_param',
            'params': {
                'q': 'search',
                'sort.field': 'ID',
                'sort.order': 'ASCENDING'
            },
            'data_key': 'elements',
            'bookmark_field': 'last_modified_time',
            'id_fields': ['id'],
            'children': {
                'ad_analytics_by_campaign': {
                    'path': 'adAnalyticsV2',
                    'account_filter': 'accounts_param',
                    'params': {
                        'q': 'analytics',
                        'pivot': 'CAMPAIGN',
                        'timeGranularity': 'DAILY',
                        'dateRange.start.day': analytics_campaign_dt.day,
                        'dateRange.start.month': analytics_campaign_dt.month,
                        'dateRange.start.year': analytics_campaign_dt.year,
                        'dateRange.end.day': now.day,
                        'dateRange.end.month': now.month,
                        'dateRange.end.year': now.year,
                        'count': 10000
                    },
                    'data_key': 'elements',
                    'bookmark_field': 'end_at',
                    'parent': 'campaign',
                },
                'creatives': {
                    'path': 'adCreativesV2',
                    'account_filter': None,
                    'params': {
                        'q': 'search',
                        'search.campaign.values[0]': 'urn:li:sponsoredCampaign:{}',
                        'sort.field': 'ID',
                        'sort.order': 'ASCENDING'
                    },
                    'data_key': 'elements',
                    'bookmark_field': 'last_modified_time',
                    'id_fields': ['id']
                },
                'ad_analytics_by_creative': {
                    'path': 'adAnalyticsV2',
                    'account_filter': 'accounts_param',
                    'params': {
                        'q': 'analytics',
                        'pivot': 'CREATIVE',
                        'timeGranularity': 'DAILY',
                        'dateRange.start.day': analytics_creative_dt.day,
                        'dateRange.start.month': analytics_creative_dt.month,
                        'dateRange.start.year': analytics_creative_dt.year,
                        'dateRange.end.day': now.day,
                        'dateRange.end.month': now.month,
                        'dateRange.end.year': now.year,
                        'count': 10000
                    },
                    'data_key': 'elements',
                    'bookmark_field': 'end_at',
                    'id_fields': ['creative_id', 'start_at']
                }
            }
        }
    }

    # For each endpoint (above), determine if the stream should be streamed
    #   (based on the catalog and last_stream), then sync those streams.
    for stream_name, endpoint_config in endpoints.items():
        should_stream, last_stream = should_sync_stream(selected_streams,
                                                        last_stream,
                                                        stream_name)
        if should_stream:
            # Add appropriate account_filter query parameters based on account_filter type
            account_filter = endpoint_config.get('account_filter', None)
            if config.get("accounts") and account_filter is not None:
                account_list = config['accounts'].replace(" ", "").split(",")
                for idx, account in enumerate(account_list):
                    if account_filter == 'search_id_values_param':
                        endpoint_config['params']['search.id.values[{}]'.format(idx)] = int(account)
                    elif account_filter == 'search_account_values_param':
                        endpoint_config['params']['search.account.values[{}]'.format(idx)] = \
                            'urn:li:sponsoredAccount:{}'.format(account)
                    elif account_filter == 'accounts_param':
                        endpoint_config['params']['accounts[{}]'.format(idx)] = \
                            'urn:li:sponsoredAccount:{}'.format(account)

            LOGGER.info('START Syncing: %s', stream_name)
            update_currently_syncing(state, stream_name)
            path = endpoint_config.get('path')
            bookmark_field = endpoint_config.get('bookmark_field')

            # Write schema for parent streams
            write_schema(catalog, stream_name)

            total_records, max_bookmark_value = sync_endpoint(
                client=client,
                catalog=catalog,
                state=state,
                start_date=start_date,
                stream_name=stream_name,
                path=path,
                endpoint_config=endpoint_config,
                data_key=endpoint_config.get('data_key', 'elements'),
                static_params=endpoint_config.get('params', {}),
                bookmark_query_field=endpoint_config.get('bookmark_query_field'),
                bookmark_field=bookmark_field,
                id_fields=endpoint_config.get('id_fields'))

            # Write parent bookmarks
            if bookmark_field:
                write_bookmark(state, stream_name, max_bookmark_value)

            update_currently_syncing(state, None)
            LOGGER.info('Synced: %s, total_records: %s',
                        stream_name,
                        total_records)
            LOGGER.info('FINISHED Syncing: %s', stream_name)

def selected_fields(catalog_for_stream):
    mdata = metadata.to_map(catalog_for_stream.metadata)
    fields = catalog_for_stream.schema.properties.keys()

    selected_fields_list = list()
    for field in fields:
        field_metadata = mdata.get(('properties', field))
        if should_sync_field(field_metadata.get('inclusion'), field_metadata.get('selected')):
            selected_fields_list.append(field)

    return selected_fields_list

def split_into_chunks(fields, chunk_length):
    return (fields[x:x+chunk_length] for x in range(0, len(fields), chunk_length))

def shift_sync_window(params, today, forced_window_size=None):
    current_end = datetime.date(
        year=params['dateRange.end.year'],
        month=params['dateRange.end.month'],
        day=params['dateRange.end.day'],
    )
    if forced_window_size:
        new_end = current_end + timedelta(days=forced_window_size)
    else:
        new_end = current_end + timedelta(days=DATE_WINDOW_SIZE)

    if new_end > today:
        new_end = today

    new_params = {**params,
                  'dateRange.start.day': current_end.day,
                  'dateRange.start.month': current_end.month,
                  'dateRange.start.year': current_end.year,

                  'dateRange.end.day': new_end.day,
                  'dateRange.end.month': new_end.month,
                  'dateRange.end.year': new_end.year,}
    return current_end, new_end, new_params

def merge_responses(data):
    full_records = dict()
    for page in data:
        for element in page:
            temp_start = element['dateRange']['start']
            temp_pivotValue = element['pivotValue']
            string_start = '{}-{}-{}'.format(temp_start['year'], temp_start['month'], temp_start['day'])
            primary_key = (temp_pivotValue, string_start)
            if primary_key in full_records:
                full_records[primary_key].update(element)
            else:
                full_records[primary_key] = element
    return full_records


def sync_ad_analytics(client, catalog, state, last_datetime, stream_name, path, endpoint_config, data_key, static_params,
                      bookmark_query_field=None, bookmark_field=None, id_fields=None, parent=None, parent_id=None):
    # pylint: disable=too-many-branches,too-many-statements,unused-argument

    # LinkedIn has a max of 20 fields per request. We cap the chunks at 17
    # to make sure there's always room for us to append `dateRange`,
    # `pivot`, and `pivotValue`
    MAX_CHUNK_LENGTH = 17

    max_bookmark_value = last_datetime
    last_datetime_dt = strptime_to_utc(last_datetime) - timedelta(days=7)

    window_start_date = last_datetime_dt.date()
    window_end_date = window_start_date + timedelta(days=DATE_WINDOW_SIZE)
    today = datetime.date.today()

    if window_end_date > today:
        window_end_date = today

    # Override the default start and end dates
    static_params = {**static_params,
                     'dateRange.start.day': window_start_date.day,
                     'dateRange.start.month': window_start_date.month,
                     'dateRange.start.year': window_start_date.year,

                     'dateRange.end.day': window_end_date.day,
                     'dateRange.end.month': window_end_date.month,
                     'dateRange.end.year': window_end_date.year,}

    valid_selected_fields = [snake_case_to_camel_case(field)
                             for field in selected_fields(catalog.get_stream(stream_name))
                             if snake_case_to_camel_case(field) in FIELDS_AVAILABLE_FOR_AD_ANALYTICS_V2]

    # When testing the API, if the fields in `field` all return `0` then
    # the API returns its empty response.

    # However, the API distinguishes between a day with non-null values
    # (even if this means the values are all `0`) and a day with null
    # values. We found that requesting these fields give you the days with
    # non-null values
    first_chunk = [['dateRange', 'pivot', 'pivotValue']]

    chunks = first_chunk + list(split_into_chunks(valid_selected_fields, MAX_CHUNK_LENGTH))

    # We have to append these fields in order to ensure we get them back
    # so that we can create the composite primary key for the record and
    # to merge the multiple responses based on this primary key
    for chunk in chunks:
        for field in ['dateRange', 'pivot', 'pivotValue']:
            if field not in chunk:
                chunk.append(field)

    ############### PAGINATION (for these 2 streams) ###############
    # The Tap requests LinkedIn with one Campaign ID at one time.
    # 1 Campaign permits 100 Ads
    # Considering, 1 Ad is active and the existing behaviour of the tap uses 30 Day window size
    #       and timeGranularity = DAILY(Results grouped by day) we get 30 records in one API response
    # Considering the maximum permitted size of Ads are created, "3000" records will be returned in an API response.
    # If “count=100” and records=100 in the API are the same then the next url will be returned and if we hit that URL, 400 error code will be returned.
    # This case is unreachable because here “count” is 10000 and at maximum only 3000 records will be returned in an API response.

    total_records = 0
    while window_end_date <= today:
        responses = []
        for chunk in chunks:
            static_params['fields'] = ','.join(chunk)
            params = {"start": 0,
                      "count": endpoint_config.get('count', 100),
                      **static_params}
            query_string = '&'.join(['%s=%s' % (key, value) for (key, value) in params.items()])
            LOGGER.info('Syncing %s from %s to %s', parent_id, window_start_date, window_end_date)
            for page in sync_analytics_endpoint(client, stream_name, endpoint_config.get('path'), query_string):
                if page.get(data_key):
                    responses.append(page.get(data_key))
        raw_records = merge_responses(responses)
        time_extracted = utils.now()

        # While we broke the ad_analytics streams out from
        # `sync_endpoint()`, we want to process them the same. And
        # transform_json() expects a dictionary with a key equal to
        # `data_key` and its value is the response from the API

        # Note that `transform_json()` returns the same structure we pass
        # in. `sync_endpoint()` grabs `data_key` from the return value, so
        # we mirror that here
        transformed_data = transform_json({data_key: list(raw_records.values())},
                                          stream_name)[data_key]
        if not transformed_data:
            LOGGER.info('No transformed_data')
        else:
            max_bookmark_value, record_count = process_records(
                catalog=catalog,
                stream_name=stream_name,
                records=transformed_data,
                time_extracted=time_extracted,
                bookmark_field=bookmark_field,
                max_bookmark_value=last_datetime,
                last_datetime=strftime(last_datetime_dt),
                parent=parent,
                parent_id=parent_id)
            LOGGER.info('%s, records processed: %s', stream_name, record_count)
            LOGGER.info('%s: max_bookmark: %s', stream_name, max_bookmark_value)
            total_records += record_count

        window_start_date, window_end_date, static_params = shift_sync_window(static_params, today)

        if window_start_date == window_end_date:
            break

    return total_records, max_bookmark_value

def sync_analytics_endpoint(client, stream_name, path, query_string):
    page = 1
    next_url = 'https://api.linkedin.com/v2/{}?{}'.format(path, query_string)

    while next_url:
        LOGGER.info('URL for %s: %s', stream_name, next_url)

        data = client.get(url=next_url, endpoint=stream_name)
        yield data
        next_url = get_next_url(data)

        LOGGER.info('%s: Synced page %s', stream_name, page)
        page = page + 1


def get_next_url(data):
    next_url = None
    links = data.get('paging', {}).get('links', [])
    for link in links:
        rel = link.get('rel')
        if rel == 'next':
            href = link.get('href')
            if href:
                next_url = 'https://api.linkedin.com{}'.format(urllib.parse.unquote(href))
    return next_url
