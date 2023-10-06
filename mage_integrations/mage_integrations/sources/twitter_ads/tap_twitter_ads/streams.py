# streams.py
# streams: API URL endpoints to be called
# properties:
#   <root node>: Plural stream name for the endpoint
#   path: API endpoint relative path, when added to the base URL, creates the full path,
#       default = stream_name
#   key_properties: Primary key fields for identifying an endpoint record.
#   replication_method: INCREMENTAL or FULL_TABLE
#   replication_keys: bookmark_field(s), typically a date-time, used for filtering the results
#        and setting the state
#   params: Query, sort, and other endpoint specific parameters; default = {}
#   data_key: JSON element containing the results list for the endpoint
#   bookmark_query_field: From date-time field used for filtering the query
#   bookmark_type: Data type for bookmark, integer or datetime
import copy
import functools
import time
from datetime import datetime, timedelta
from urllib.parse import urlparse

import backoff
import pytz
import singer
from requests.exceptions import ConnectionError
from singer import Transformer, metadata, metrics, utils
from singer.utils import strptime_to_utc
from twitter_ads import API_VERSION
from twitter_ads.cursor import Cursor
from twitter_ads.http import Request
from twitter_ads.utils import split_list

from mage_integrations.sources.twitter_ads.tap_twitter_ads.client import raise_for_error
from mage_integrations.sources.twitter_ads.tap_twitter_ads.transform import (
    transform_record,
    transform_report,
)

BOOKMARK_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
LOGGER = singer.get_logger()


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
    LOGGER.info('Stream: {} - Currently Syncing'.format(stream_name))


def get_page_size(config, default_page_size):
    """
    This function will get page size from config.
    It will return the default value if an empty string is given,
    and will raise an exception if invalid value is given.
    """
    page_size = config.get('page_size', default_page_size)
    if page_size == "":
        return default_page_size
    try:
        if type(page_size) == float:
            raise Exception

        page_size = int(page_size)
        if page_size <= 0:
            raise Exception
        return page_size
    except Exception:
        raise Exception("The entered page size ({}) is invalid".format(page_size))


# Backoff ConnectionError 5 times.
def retry_pattern(fnc):
    @backoff.on_exception(backoff.constant,
                          ConnectionError,
                          max_tries=5,
                          interval=60,
                          jitter=None
                          )
    @functools.wraps(fnc)
    def wrapper(*args, **kwargs):
        return fnc(*args, **kwargs)
    return wrapper


# Added decorator over functions of twitter SDK to
# perform backoff over SDK method Request.perform the method
Request.perform = retry_pattern(Request.perform)


# parent class for all the stream classes
class TwitterAds:
    tap_stream_id = None
    replication_method = None
    replication_key = []
    key_properties = []
    to_replicate = True
    date_dictionary = False
    path = None
    params = {}
    parent = None
    data_key = None
    bookmark_query_field_from = None
    bookmark_query_field_to = None
    pagination = False
    parent_path = None
    parent_id_field = None
    url = "https://ads-api.twitter.com"

    # Reference:
    # https://developer.twitter.com/en/docs/ads/campaign-management/overview/placements#placements
    PLACEMENTS = [
        'ALL_ON_TWITTER',  # All possible placement types on Twitter
        'PUBLISHER_NETWORK'  # On the Twitter Audience Platform
    ]

    # function to fetch schema in sync mode
    def write_schema(self, catalog, stream_name):
        stream = catalog.get_stream(stream_name)
        schema = stream.schema.to_dict()
        LOGGER.info('Stream: {} - Writing schema'.format(stream_name))
        try:
            singer.write_schema(stream_name, schema, stream.key_properties)
        except OSError as err:
            LOGGER.error('Stream: {} - OS Error writing schema'.format(stream_name))
            raise err

    # function to fetch record in sync mode
    def write_record(self, stream_name, record, time_extracted):
        try:
            singer.messages.write_record(
                stream_name, record, time_extracted=time_extracted)
        except OSError as err:
            LOGGER.error('Stream: {} - OS Error writing record'.format(stream_name))
            LOGGER.error('record: {}'.format(record))
            raise err

    # get bookmark for the stream
    def get_bookmark(self, state, stream, default, account_id):
        # default only populated on initial sync
        if (state is None) or ('bookmarks' not in state):
            return default
        return (
            state
            .get('bookmarks', {})
            .get(stream, {})
            .get(account_id, default)  # Return account wise bookmark value
        )

    # to read bookmarks in sync mode
    def write_bookmark(self, state, stream, value, account_id, sub_type=None):
        if 'bookmarks' not in state:
            state['bookmarks'] = {}

        # Retrieve existing bookmark value
        state['bookmarks'][stream] = state['bookmarks'].get(stream, {})
        if sub_type:
            # Store bookmark value for each sub_type of tweets stream
            # Retrieve existing bookmark value if it is available in the state or assign empty dict.
            # Because we need to write bookmark value for each sub type inside the account_id.
            state['bookmarks'][stream][account_id] = state['bookmarks'].get(stream,
                                                                            {}).get(account_id, {})
            state['bookmarks'][stream][account_id][sub_type] = value
            LOGGER.info('Stream: {} Subtype: {} - Write state, bookmark value: {}'.format(stream,
                                                                                          sub_type,
                                                                                          value))

        else:
            # Update bookmark value for particular account
            state['bookmarks'][stream][account_id] = value
            LOGGER.info('Stream: {} - Write state, bookmark value: {}'.format(stream, value))

        singer.write_state(state)

    # Converts cursor object to dictionary
    def obj_to_dict(self, obj):
        if not hasattr(obj, "__dict__"):
            return obj
        result = {}
        for key, val in obj.__dict__.items():
            if key.startswith("_"):
                continue
            element = []
            if isinstance(val, list):
                for item in val:
                    element.append(self.obj_to_dict(item))
            else:
                element = self.obj_to_dict(val)
            result[key] = element
        return result

    # pylint: disable=line-too-long
    # API SDK Requests:
    # https://github.com/twitterdev/twitter-python-ads-sdk/blob/master/examples/manual_request.py
    # pylint: enable=line-too-long
    def get_resource(self, stream_name, client, path, params=None):
        resource = '/{}/{}'.format(API_VERSION, path)

        try:
            request = Request(client, 'get', resource, params=params)  # , stream=True)
            cursor = Cursor(None, request)
        except Exception as e:
            LOGGER.error('Stream: {} - ERROR: {}'.format(stream_name, e))
            # see tap-twitter-ads.client for more details
            raise_for_error(e)
        return cursor

    # method for HTTP post api call
    def post_resource(self, report_name, client, path, params=None, body=None):
        resource = '/{}/{}'.format(API_VERSION, path)
        try:
            response = Request(client, 'post', resource, params=params, body=body).perform()
        except Exception as e:
            LOGGER.error('Report: {} - ERROR: {}'.format(report_name, e))
            # see tap-twitter-ads.client for more details
            raise_for_error(e)
        response_body = response.body  # Dictionary response of POST request
        return response_body

    # fetch async data from the gives url
    def get_async_data(self, report_name, client, url):
        resource = urlparse(url)
        domain = '{0}://{1}'.format(resource.scheme, resource.netloc)
        try:
            response = Request(
                client, 'get', resource.path, domain=domain, raw_body=True, stream=True).perform()
            response_body = response.body
        except Exception as e:
            # see tap-twitter-ads.client for more details
            LOGGER.error('Report: {} - ERROR: {}'.format(report_name, e))
            raise_for_error(e)
        return response_body

    # List selected fields from stream catalog
    def get_selected_fields(self, catalog, stream_name):
        stream = catalog.get_stream(stream_name)
        mdata = metadata.to_map(stream.metadata)
        mdata_list = singer.metadata.to_list(mdata)
        selected_fields = []
        for entry in mdata_list:
            field = None
            try:
                field = entry['breadcrumb'][1]
                if entry.get('metadata', {}).get('selected', False):
                    selected_fields.append(field)
            except IndexError:
                pass
        return selected_fields

    # remove minutes from dattime and set it to 0
    def remove_minutes_local(self, dttm, tzone):
        new_dttm = dttm.astimezone(tzone).replace(
            minute=0, second=0, microsecond=0)
        return new_dttm

    # remove hours from datetime and set it to 0
    def remove_hours_local(self, dttm, timezone):
        new_dttm = dttm.astimezone(timezone).replace(
            hour=0, minute=0, second=0, microsecond=0)
        return new_dttm

    def get_maximum_bookmark(self, bookmark_value_str,
                             datetime_format,
                             record_dict,
                             bookmark_field,
                             stream_name,
                             record_counter,
                             last_dttm):
        """
        Return a maximum replication key value that is available in the record.
        """
        max_bookmark_value = None
        if bookmark_value_str:
            bookmark_value = strptime_to_utc(record_dict.get(bookmark_field))

            # If first record then set it as max_bookmark_value
            if record_counter == 0:
                max_bookmark_dttm = bookmark_value
                max_bookmark_value = max_bookmark_dttm.strftime(BOOKMARK_FORMAT)
        else:
            # pylint: disable=line-too-long
            LOGGER.info('Stream: {} - NO BOOKMARK, bookmark_field: {}, record: {}'.format(
                stream_name, bookmark_field, record_dict))
            # pylint: enable=line-too-long
            bookmark_value = last_dttm

        return bookmark_value, max_bookmark_value

    # from sync.py
    def sync_endpoint(
        self,
        client,
        catalog,
        state,
        start_date,
        stream_name,
        endpoint_config,
        tap_config,
        account_id=None,
        parent_ids=None,
        child_streams=None,
        selected_streams=None,
    ):
        if selected_streams is None:
            selected_streams = []
        # endpoint_config variables
        path = getattr(endpoint_config, 'path', None)
        id_fields = (hasattr(endpoint_config, 'key_properties')
                     or []) and endpoint_config.key_properties
        parent_id_field = next(iter(id_fields), None)  # first ID field
        params = (hasattr(endpoint_config, 'params') or {}) and endpoint_config.params

        # If page_size found in config then used it else use default page size.
        if params.get('count') and tap_config.get('page_size'):
            params['count'] = get_page_size(tap_config, params.get('count'))

        bookmark_field = next(iter((hasattr(endpoint_config, 'replication_keys')
                                    or []) and endpoint_config.replication_keys), None)
        datetime_format = hasattr(endpoint_config,
                                  'datetime_format') and endpoint_config.datetime_format
        if hasattr(endpoint_config, 'sub_types'):
            sub_types = endpoint_config.sub_types
        else:
            sub_types = ['none']
        children = (hasattr(endpoint_config, 'children')) and endpoint_config.children

        if parent_ids is None:
            parent_ids = []
        if child_streams is None:
            child_streams = []

        # tap config variabless
        # Twitter Ads does not accept True/False as boolean, must be true/false
        with_deleted = tap_config.get('with_deleted', 'true')
        country_codes = tap_config.get('country_codes', '').replace(' ', '')
        country_code_list = country_codes.split(',')
        LOGGER.info('country_code_list = {}'.format(country_code_list))  # COMMENT OUT
        if sub_types == ['{country_code_list}']:
            sub_types = country_code_list
        LOGGER.info('sub_types = {}'.format(sub_types))  # COMMENT OUT

        # Bookmark datetimes
        last_datetime = self.get_bookmark(state, stream_name, start_date, account_id)
        if not last_datetime or last_datetime is None:
            last_datetime = start_date

        # NOTE: Risk of syncing indefinitely and never getting bookmark
        max_bookmark_value = last_datetime

        total_records = 0
        # Loop through sub_types (for tweets endpoint), all other endpoints loop once
        for sub_type in sub_types:

            if stream_name == "tweets" and last_datetime != start_date:
                # Tweets stream contains two separate bookmarks
                # for each sub_type(PUBLISHED, SCHEDULED)
                last_dttm = strptime_to_utc(last_datetime.get(sub_type, start_date))
            else:
                last_dttm = strptime_to_utc(last_datetime)

            LOGGER.info('sub_type = {}'.format(sub_type))  # COMMENT OUT

            # Reset params and path for each sub_type
            params = {}
            new_params = {}
            path = None
            params = (hasattr(endpoint_config, 'params') or {}) and endpoint_config.params
            path = hasattr(endpoint_config, 'path') and endpoint_config.path

            # Replace keys/ids in path and params
            add_account_id = False  # Initial default
            if '{account_id}' in path:
                add_account_id = True
                path = path.replace('{account_id}', account_id)

            parent_id_list=""  # noqa
            if parent_ids:
                parent_id_list = ','.join(map(str, parent_ids))
                path = path.replace('{parent_ids}', parent_id_list)
            key = None
            val = None
            for key, val in list(params.items()):
                new_val = val
                if isinstance(val, str):
                    if key == 'with_deleted':
                        new_val = val.replace('{with_deleted}', with_deleted)
                    if '{account_ids}' in val:
                        new_val = val.replace('{account_ids}', account_id)
                    if '{parent_ids}' in val:
                        new_val = val.replace('{parent_ids}', parent_id_list)
                    if '{start_date}' in val:
                        new_val = val.replace('{start_date}', start_date)
                    if '{country_codes}' in val:
                        new_val = val.replace('{country_codes}', country_codes)
                    if '{sub_type}' in val:
                        new_val = val.replace('{sub_type}', sub_type)
                new_params[key] = new_val
            LOGGER.info('Stream: {} - Request URL: {}/{}/{}'.format(
                stream_name, self.url, API_VERSION, path))
            LOGGER.info('Stream: {} - Request params: {}'.format(stream_name, new_params))

            # API Call
            cursor = self.get_resource(stream_name, client, path, new_params)

            # cursor is an object like a generator(yield).
            # First, it will be iterated for the parent stream with
            # the parent's bookmark. But, for the child also we want
            # to iterate through all parent records
            # based on the child bookmark and collect parent_ids.
            # That's why we are making a cursor copy before the parent iteration.
            cursor_child = copy.deepcopy(cursor)  # Cursor for children to retrieve parent_ids

            # time_extracted: datetime when the data was extracted from the API
            time_extracted = utils.now()

            # Get stream metadata from catalog (for masking and validation)
            stream = catalog.get_stream(stream_name)
            schema = stream.schema.to_dict()
            stream_metadata = metadata.to_map(stream.metadata)

            i = 0
            with metrics.record_counter(stream_name) as counter:
                # Sync only selected stream. When only child stream
                # is selected(parent stream is not selected),
                # at that time this condition may become False.
                if stream_name in selected_streams:
                    # Loop thru cursor records, break out if no more
                    # data or bookmark_value < last_dttm
                    for record in cursor:
                        # Get dictionary for record
                        record_dict = self.obj_to_dict(record)
                        if not record_dict:
                            # Finish looping
                            LOGGER.info('Stream: {} - Finished Looping, no more data'.format(
                                stream_name))
                            break

                        # Get record's bookmark_value
                        # All bookmarked requests are sorted by updated_at descending
                        #   'sort_by': ['updated_at-desc']
                        # The first record is the max_bookmark_value
                        if bookmark_field:
                            bookmark_value_str = record_dict.get(bookmark_field)
                            bookmark_value, max_bookmark_value_str = self.get_maximum_bookmark(
                                bookmark_value_str,
                                datetime_format,
                                record_dict,
                                bookmark_field,
                                stream_name,
                                i,
                                last_dttm
                            )
                            # SCHEDULED type tweets response do not contain records in sorted order.
                            if i == 0 and sub_type != "SCHEDULED":
                                # If first record then set it as max_bookmark_value
                                max_bookmark_value = max_bookmark_value_str

                            # Bookmark mechanism for SCHEDULED type tweets
                            if sub_type == "SCHEDULED":
                                if not max_bookmark_dttm: # noqa
                                    # Assign maximum bookmark value to last saved state
                                    max_bookmark_dttm = last_dttm
                                    max_bookmark_value = max_bookmark_dttm.strftime(BOOKMARK_FORMAT)

                                if bookmark_value >= max_bookmark_dttm:
                                    # If replication key value of current record greater
                                    # than maximum bookmark then update it.
                                    max_bookmark_dttm = bookmark_value
                                    max_bookmark_value = max_bookmark_dttm.strftime(BOOKMARK_FORMAT)

                                if bookmark_value < last_dttm:
                                    # Skip record if replication value less than last saved state
                                    continue

                            elif bookmark_value < last_dttm:
                                # Finish looping
                                LOGGER.info('Stream: {} - Finished Looping, no more data'.format(
                                    stream_name))
                                break

                        else:
                            bookmark_value = last_dttm

                        # Check for PK fields
                        for key in id_fields:
                            if not record_dict.get(key):
                                LOGGER.info('Stream: {} - Missing key {} in record: {}'.format(
                                    stream_name, key, record))

                            # Transform record from transform.py
                            prepared_record = transform_record(stream_name, record_dict)

                            # Add account_id to record
                            if add_account_id:
                                prepared_record['account_id'] = account_id

                        # Transform record with Singer Transformer
                        with Transformer() as transformer:
                            transformed_record = transformer.transform(
                                prepared_record,
                                schema,
                                stream_metadata)

                            self.write_record(stream_name,
                                              transformed_record,
                                              time_extracted=time_extracted)
                            counter.increment()

                            # Increment counters
                            i = i + 1
                            total_records = total_records + 1

                            # End: for record in cursor
                        # End: with metrics as counter

                    # Update the state with the max_bookmark_value for the tweets stream
                    if stream_name == "tweets":
                        self.write_bookmark(state,
                                            stream_name,
                                            max_bookmark_value,
                                            account_id, sub_type)
                        max_bookmark_dttm = None

            # Loop through children and chunks of parent_ids
            if children:
                for child_stream_name in children:
                    child_endpoint_config = STREAMS[child_stream_name]
                    if child_stream_name in child_streams:
                        update_currently_syncing(state, child_stream_name)
                        # pylint: disable=line-too-long
                        LOGGER.info('Child Stream: {} - START Syncing, parent_stream: {}, account_id: {}'.format( # noqa
                            child_stream_name, stream_name, account_id))
                        # pylint: enable=line-too-long
                        # Write schema and log selected fields for stream
                        self.write_schema(catalog, child_stream_name)
                        selected_fields = self.get_selected_fields(catalog, child_stream_name)
                        LOGGER.info('Child Stream: {} - selected_fields: {}'.format(
                            child_stream_name, selected_fields))

                        total_child_records = 0
                        child_total_records = 0
                        # parent_id_limit: max list size for parent_ids
                        # parent_id_limit = child_endpoint_config.get('parent_ids_limit', 1)
                        if hasattr(child_endpoint_config, 'parent_ids_limit'):
                            parent_id_limit = child_endpoint_config.parent_ids_limit
                        else:
                            parent_id_limit = 1

                        # Bookmark for child stream
                        child_last_datetime = self.get_bookmark(state,
                                                                child_stream_name,
                                                                start_date,
                                                                account_id)

                        child_last_dttm = strptime_to_utc(child_last_datetime)

                        child_max_bookmark_value = None
                        child_counter = 0
                        # Loop thru cursor records,
                        # break out if no more data or child_bookmark_value < child_last_dttm
                        for record in cursor_child:
                            # Get dictionary for record
                            record_dict = self.obj_to_dict(record)

                            # Get record's bookmark_value
                            # All bookmarked requests are sorted by updated_at descending
                            #   'sort_by': ['updated_at-desc']
                            # The first record is the max_bookmark_value
                            if bookmark_field:
                                bookmark_value_str = record_dict.get(bookmark_field)
                                child_bookmark_value, max_bookmark_value_str = self.get_maximum_bookmark( # noqa
                                    bookmark_value_str,
                                    datetime_format,
                                    record_dict,
                                    bookmark_field,
                                    child_stream_name,
                                    child_counter,
                                    child_last_dttm)

                                if child_counter == 0:
                                    # If first record then set it as max_bookmark_value
                                    child_max_bookmark_value = max_bookmark_value_str

                                if child_bookmark_value < child_last_dttm:
                                    # Skip all records from now onwards because the replication
                                    # key value in record is less than last saved bookmark value.
                                    # Records are in descending order of bookmark value.
                                    # Finish looping
                                    LOGGER.info(
                                        'Stream: {} - Finished,\
                                        bookmark value < last datetime'.format(
                                            stream_name))
                                    break
                            else:
                                child_bookmark_value = child_last_dttm

                            # Append parent_id to parent_ids
                            parent_id = record_dict.get(parent_id_field)
                            parent_ids.append(parent_id)

                            child_counter = child_counter + 1
                        # End: for record in cursor

                        chunk = 0  # chunk number
                        # Make chunks of parent_ids
                        for chunk_ids in split_list(parent_ids, parent_id_limit):
                            # pylint: disable=line-too-long
                            LOGGER.info(
                                'Child Stream: {} - Syncing, chunk#: {},\
                                parent_stream: {}, parent chunk_ids: {}'.format(
                                    child_stream_name, chunk, stream_name, chunk_ids))
                            # pylint: enable=line-too-long

                            child_total_records = self.sync_endpoint(
                                client=client,
                                catalog=catalog,
                                state=state,
                                start_date=start_date,
                                stream_name=child_stream_name,
                                endpoint_config=child_endpoint_config,
                                tap_config=tap_config,
                                account_id=account_id,
                                parent_ids=chunk_ids,
                                child_streams=child_streams,
                                selected_streams=selected_streams)

                            # pylint: disable=line-too-long
                            LOGGER.info(
                                'Child Stream: {} - Finished chunk#: {}, parent_stream: {}'.format(
                                    child_stream_name, chunk, stream_name))
                            # pylint: enable=line-too-long
                            total_child_records = total_child_records + child_total_records
                            chunk = chunk + 1
                            # End: for chunk in parent_id_chunks

                        # pylint: disable=line-too-long
                        LOGGER.info(
                            'Child Stream: {} - FINISHED Syncing,\
                            parent_stream: {}, account_id: {}'.format(
                                child_stream_name, stream_name, account_id))
                        # pylint: enable=line-too-long
                        LOGGER.info('Child Stream: {} - total_records: {}'.format(
                            child_stream_name, total_child_records))
                        update_currently_syncing(state, stream_name)
                        # End: if child_stream_name in child_streams

                        # Update the state with the max_bookmark_value
                        # for the child stream if parent is incremental
                        if bookmark_field:
                            self.write_bookmark(state,
                                                child_stream_name,
                                                child_max_bookmark_value,
                                                account_id)

                    # End: for child_stream_name in children.items()
                # End: if children

            # pylint: disable=line-too-long
            LOGGER.info('Stream: {}, Account ID: {} - FINISHED\
                        Sub Type: {}, Total Sub Type Records: {}'.format(
                stream_name, account_id, sub_type, i))
            # pylint: enable=line-too-long
            # End: for sub_type in sub_types

        LOGGER.info('Stream: {}, max_bookmark_value: {}'.format(stream_name, max_bookmark_value))

        # Update the state with the max_bookmark_value
        # for all other streams except tweets stream if stream is selected
        if bookmark_field and stream_name in selected_streams and stream_name != "tweets":
            self.write_bookmark(state, stream_name, max_bookmark_value, account_id)

        return total_records
        # End sync_endpoint


# Class for all reports streams
class Reports(TwitterAds):
    # syncing for all report streams
    def sync_report(self,
                    client,
                    catalog,
                    state,
                    start_date,
                    report_name,
                    report_config,
                    tap_config,
                    account_id=None,
                    country_ids=None,
                    platform_ids=None):

        # PROCESS:
        # Outer-outer loop (in sync): loop through accounts
        # Outer loop (in sync): loop through reports selected in catalog
        #   Each report definition: name, entity, segment, granularity
        #
        # For each Report:
        # 1. Determine start/end dates and date windows (rounded, limited, timezone);
        #     Loop through date windows from bookmark datetime to current datetime.
        # 2. Based on Entity Type, Get active entity ids for date window and placement.
        # 3. POST ASYNC Job to Queue to get queued_job_id with the following Loops:
        #     A. For each Sub Type Loop (Country or Platform)
        #     B. For each Placement w/ Entity ID Set Loop
        #     C. For each Chunk of 20 Entity IDs
        # 4. GET ASYNC Job Statuses and Download URLs (when complete)
        # 5. Download Data from URLs and Sync data to target

        # report parameters
        report_entity = report_config.get('entity')
        report_segment = report_config.get('segment', 'NO_SEGMENT')
        report_granularity = report_config.get('granularity', 'DAY')

        LOGGER.info('Report: {}, Entity: {}, Segment: {}, Granularity: {}'.format(
            report_name, report_entity, report_segment, report_granularity))

        # Set report_segment NO_SEGMENT to None
        if report_segment == 'NO_SEGMENT':
            report_segment = None
        # MEDIA_CREATIVE and ORGANIC_TWEET don't allow Segmentation
        if report_entity in ['MEDIA_CREATIVE', 'ORGANIC_TWEET']:
            report_segment = None

        # Initialize account and get account timezone
        account = client.accounts(account_id)
        tzone = account.timezone
        timezone = pytz.timezone(tzone)
        LOGGER.info('Account ID: {} - timezone: {}'.format(account_id, tzone))

        # Bookmark datetimes
        last_datetime = self.get_bookmark(state, report_name, start_date, account_id)
        last_dttm = strptime_to_utc(last_datetime).astimezone(timezone)
        max_bookmark_value = last_datetime

        # Get absolute start and end times
        attribution_window = int(tap_config.get('attribution_window', '14'))
        abs_start, abs_end = self.get_absolute_start_end_time(
            report_granularity, timezone, last_dttm, attribution_window)

        # Initialize date window
        if report_segment:
            # Max is 45 days (segmented), set lower to avoid date/hour rounding issues
            date_window_size = 42  # is the Answer
        else:
            # Max is 90 days, set lower to avoid date/hour rounding issues
            date_window_size = 85
        window_start = abs_start
        window_end = (abs_start + timedelta(days=date_window_size))
        window_start_rounded = None
        window_end_rounded = None
        if window_end > abs_end:
            window_end = abs_end

        # DATE WINDOW LOOP
        while window_start != abs_end:
            entity_id_sets = []
            entity_ids = []
            window_start_rounded, window_end_rounded = self.round_times(
                report_granularity, timezone, window_start, window_end)
            window_start_str = window_start_rounded.strftime('%Y-%m-%dT%H:%M:%S%z')
            window_end_str = window_end_rounded.strftime('%Y-%m-%dT%H:%M:%S%z')

            LOGGER.info('Report: {} - Date window: {} to {}'.format(
                report_name, window_start_str, window_end_str))

            # ACCOUNT cannot use active_entities endpoint; but single Account ID
            if report_entity == 'ACCOUNT':
                entity_ids.append(account_id)
                entity_id_sets = [
                    {
                        'placement': 'ALL_ON_TWITTER',
                        'entity_ids': entity_ids,
                        'start_time': window_start_str,
                        'end_time': window_end_str
                    },
                    {
                        'placement': 'PUBLISHER_NETWORK',
                        'entity_ids': entity_ids,
                        'start_time': window_start_str,
                        'end_time': window_end_str
                    }
                ]

            # ORGANIC_TWEET cannot use active_entities endpoint
            elif report_entity == 'ORGANIC_TWEET':
                LOGGER.info('Report: {} - GET ORGANINC_TWEET entity_ids'.format(report_name))
                entity_ids = self.get_tweet_entity_ids(client, account_id, window_start, window_end)
                entity_id_set = {  # PUBLISHER_NETWORK is invalid placement for ORGANIC_TWEET
                    'placement': 'ALL_ON_TWITTER',
                    'entity_ids': entity_ids,
                    'start_time': window_start_str,
                    'end_time': window_end_str
                }
                entity_id_sets.append(entity_id_set)

            # ALL OTHER entity types use active_entities endpoint
            else:
                # Reference:
                # https://developer.twitter.com/en/docs/ads/analytics/api-reference/active-entities
                # GET active_entities for entity
                LOGGER.info('Report: {} - GET {} active_entities entity_ids'.format(
                    report_name, report_entity))
                active_entities_path = 'stats/accounts/{account_id}/active_entities'.replace(
                    '{account_id}', account_id)
                active_entities_params = {
                    'entity': report_entity,
                    'start_time': window_start_str,
                    'end_time': window_end_str
                }
                LOGGER.info('Report: {} - active_entities GET URL: {}/{}/{}'.format(
                    report_name, self.url, API_VERSION, active_entities_path))
                LOGGER.info('Report: {} - active_entities params: {}'.format(
                    report_name, active_entities_params))
                active_entities = self.get_resource(
                    'active_entities',
                    client,
                    active_entities_path,
                    active_entities_params,
                )

                # Get active entity_ids, start, end for each placement type for date window
                entity_id_sets = self.get_active_entity_sets(
                    active_entities,
                    report_name,
                    account_id,
                    report_entity,
                    report_granularity,
                    timezone,
                    window_start,
                    window_end,
                )
                # End: else (active_entities)

            LOGGER.info('entity_id_sets = {}'.format(entity_id_sets))  # COMMENT OUT

            # ASYNC report POST requests
            # Get metric_groups for report_entity and report_egment
            metric_groups = self.get_entity_metric_groups(report_entity, report_segment)

            # Set sub_type and sub_type_ids for sub_type loop
            if report_segment in ('LOCATIONS', 'METROS', 'POSTAL_CODES', 'REGIONS'):
                sub_type = 'countries'
                sub_type_ids = country_ids
            elif report_segment in ('DEVICES', 'PLATFORM_VERSIONS'):
                sub_type = 'platforms'
                sub_type_ids = platform_ids
            else:  # NO sub_type (loop once thru sub_type loop)
                sub_type = 'none'
                sub_type_ids = ['none']

            # POST ALL Queued ASYNC Jobs for Report
            queued_job_ids = []
            # SUB_TYPE LOOP
            # Countries or Platforms loop (or single loop for sub_types = ['none'])
            for sub_type_id in sub_type_ids:
                sub_type_queued_job_ids = []
                if sub_type == 'platforms':
                    country_id = None
                    platform_id = sub_type_id
                elif sub_type == 'countries':
                    country_id = sub_type_id
                    platform_id = None
                else:
                    country_id = None
                    platform_id = None

                # ENTITY ID SET LOOP
                for entity_id_set in entity_id_sets:
                    entity_id_set_queued_job_ids = []
                    LOGGER.info('entity_id_set = {}'.format(entity_id_set))  # COMMENT OUT
                    placement = entity_id_set.get('placement')
                    entity_ids = entity_id_set.get('entity_ids', [])
                    start_time = entity_id_set.get('start_time')
                    end_time = entity_id_set.get('end_time')
                    LOGGER.info('Report: {} - placement: {}, start_time: {}, end_time: {}'.format(
                        report_name, placement, start_time, end_time))

                    # POST ASYNC JOBS for ENTITY ID SET (possibly many chunks)
                    entity_id_set_queued_job_ids = self.post_queued_async_jobs(
                        client,
                        account_id,
                        report_name,
                        report_entity,
                        entity_ids,
                        report_granularity,
                        report_segment,
                        metric_groups,
                        placement,
                        start_time,
                        end_time,
                        country_id,
                        platform_id,
                    )
                    sub_type_queued_job_ids = sub_type_queued_job_ids + entity_id_set_queued_job_ids
                    # End: for entity_id_set in entity_id_sets

                queued_job_ids = queued_job_ids + sub_type_queued_job_ids
                # End: for sub_type_id in sub_type_ids

            # WHILE JOBS STILL RUNNING LOOP, GET ASYNC JOB STATUS
            # GET ASYNC Status Reference:
            # https://developer.twitter.com/en/docs/ads/analytics/api-reference/asynchronous#get-stats-jobs-accounts-account-id
            async_results_urls = []
            async_results_urls = self.get_async_results_urls(client,
                                                             account_id,
                                                             report_name,
                                                             queued_job_ids)
            LOGGER.info('async_results_urls = {}'.format(async_results_urls))  # COMMENT OUT

            # Get stream_metadata from catalog (for Transformer masking and validation below)
            stream = catalog.get_stream(report_name)
            schema = stream.schema.to_dict()
            stream_metadata = metadata.to_map(stream.metadata)

            # ASYNC RESULTS DOWNLOAD / PROCESS LOOP
            # RISK: What if some reports error or don't finish?
            # Possibly move this code block withing ASYNC Status Check
            total_records = 0
            for async_results_url in async_results_urls:

                # GET DOWNLOAD DATA FROM URL
                LOGGER.info('Report: {} - GET async data from URL: {}'.format(
                    report_name, async_results_url))
                async_data = self.get_async_data(report_name, client, async_results_url)
                # LOGGER.info('async_data = {}'.format(async_data)) # COMMENT OUT

                # time_extracted: datetime when the data was extracted from the API
                time_extracted = utils.now()

                # TRANSFORM REPORT DATA
                transformed_data = []
                transformed_data = transform_report(report_name, async_data, account_id)
                # LOGGER.info('transformed_data = {}'.format(transformed_data)) # COMMENT OUT
                if transformed_data is None or transformed_data == []:
                    LOGGER.info('Report: {} - NO TRANSFORMED DATA for URL: {}'.format(
                        report_name, async_results_url))

                # PROCESS RESULTS TO TARGET RECORDS
                with metrics.record_counter(report_name) as counter:
                    for record in transformed_data:
                        # Transform record with Singer Transformer

                        # Evalueate max_bookmark_value
                        end_time = record.get('end_time')  # String
                        end_dttm = strptime_to_utc(end_time)  # Datetime
                        max_bookmark_dttm = strptime_to_utc(max_bookmark_value)  # Datetime
                        if end_dttm > max_bookmark_dttm:  # Datetime comparison
                            max_bookmark_value = end_time  # String

                        with Transformer() as transformer:
                            transformed_record = transformer.transform(
                                record,
                                schema,
                                stream_metadata)

                            self.write_record(report_name,
                                              transformed_record,
                                              time_extracted=time_extracted)
                            counter.increment()

                # Increment total_records
                total_records = total_records + counter.value
                # End: for async_results_url in async_results_urls

            # Update the state with the max_bookmark_value for the date window
            self.write_bookmark(state, report_name, max_bookmark_value, account_id)

            # Increment date window
            window_start = window_end
            window_end = window_start + timedelta(days=date_window_size)
            if window_end > abs_end:
                window_end = abs_end
            # End: date window

        return total_records
        # End sync_report

    # GET Metric Groups allowed for each Entity, w/ Segment constraints
    # Metrics & Segmentation:
    # https://developer.twitter.com/en/docs/ads/analytics/overview/metrics-and-segmentation
    # Google Sheet summary:
    # https://docs.google.com/spreadsheets/d/1Cn3B1TPZOjg9QhnnF44Myrs3W8hNOSyFRH6qn8SCc7E/edit?usp=sharing
    def get_entity_metric_groups(self, report_entity, report_segment):
        # Entity type: Set metric_groups, instantiate object
        all_metric_groups = [
            'ENGAGEMENT',
            'BILLING',
            'VIDEO',
            'MEDIA',
            'WEB_CONVERSION',
            'MOBILE_CONVERSION',
            'LIFE_TIME_VALUE_MOBILE_CONVERSION'
        ]
        # Undocumented rule: CONVERSION_TAGS report segment only allows WEB_CONVERSION metric group
        if report_segment == 'CONVERSION_TAGS' and report_entity in \
                ['ACCOUNT', 'CAMPAIGN', 'LINE_ITEM', 'PROMOTED_TWEET']:
            metric_groups = ['WEB_CONVERSION']

        elif report_entity == 'ACCOUNT':
            metric_groups = ['ENGAGEMENT']

        elif report_entity == 'FUNDING_INSTRUMENT':
            metric_groups = ['ENGAGEMENT', 'BILLING']

        elif report_entity == 'CAMPAIGN':
            metric_groups = all_metric_groups

        elif report_entity == 'LINE_ITEM':
            metric_groups = all_metric_groups

        elif report_entity == 'PROMOTED_TWEET':
            metric_groups = all_metric_groups

        elif report_entity == 'PROMOTED_ACCOUNT':
            metric_groups = all_metric_groups

        elif report_entity == 'MEDIA_CREATIVE':
            metric_groups = all_metric_groups

        elif report_entity == 'ORGANIC_TWEET':
            metric_groups = ['ENGAGEMENT', 'VIDEO']

        return metric_groups

    # Round start and end times based on granularity and timezone
    def round_times(self, report_granularity, timezone, start=None, end=None):
        start_rounded = None
        end_rounded = None
        # Round min_start, max_end to hours or dates
        if report_granularity == 'HOUR':
            # Round min_start/end to hour
            if start:
                start_rounded = self.remove_minutes_local(start - timedelta(hours=1), timezone)
            if end:
                end_rounded = self.remove_minutes_local(end + timedelta(hours=1), timezone)
        else:
            # DAY, TOTAL, Round min_start, max_end to date
            if start:
                start_rounded = self.remove_hours_local(start - timedelta(days=1), timezone)
            if end:
                end_rounded = self.remove_hours_local(end + timedelta(days=1), timezone)
        return start_rounded, end_rounded

    # Determine absolute start and end times w/ attribution_window constraint
    # abs_start/end and window_start/end must be rounded to nearest hour or day (granularity)
    def get_absolute_start_end_time(self,
                                    report_granularity,
                                    timezone,
                                    last_dttm,
                                    attribution_window):
        now_dttm = utils.now().astimezone(timezone)
        delta_days = (now_dttm - last_dttm).days
        if delta_days < attribution_window:
            start = now_dttm - timedelta(days=attribution_window)
        else:
            start = last_dttm
        abs_start, abs_end = self.round_times(report_granularity, timezone, start, now_dttm)
        return abs_start, abs_end

    # Organic Tweets may not use Active Entities endpoint
    # GET Published Organic Tweet Entity IDs within date window
    def get_tweet_entity_ids(self, client, account_id, window_start, window_end):
        entity_ids = []
        tweet_config = STREAMS.get('tweets')
        tweet_path = hasattr(tweet_config, 'path') and tweet_config.path.replace('{account_id}',
                                                                                 account_id)
        datetime_format = hasattr(tweet_config, 'datetime_format') and tweet_config.datetime_format

        # Set params for PUBLISHED ORGANIC_TWEETs
        tweet_params = hasattr(tweet_config, 'params') and tweet_config.params
        tweet_params['tweet_type'] = 'PUBLISHED'
        tweet_params['timeline_type'] = 'ORGANIC'
        tweet_params['with_deleted'] = 'false'
        tweet_params['trim_user'] = 'true'

        tweet_cursor = self.get_resource('tweets', client, tweet_path, tweet_params)
        # Loop thru organic tweets to get entity_ids (if in date range)
        for tweet in tweet_cursor:
            entity_id = tweet['id']
            created_at = tweet['created_at']
            created_dttm = datetime.strptime(created_at, datetime_format)
            if created_dttm <= window_end and created_dttm >= window_start:
                entity_ids.append(entity_id)
            elif created_dttm < window_start:
                break

        return entity_ids

    # GET Active Entity IDs w/in date window (rounded for granularity) for an entity type
    def get_active_entity_sets(
        self,
        active_entities,
        report_name,
        account_id,
        report_entity,
        report_granularity,
        timezone,
        window_start,
        window_end,
    ):

        entity_id_sets = []
        entity_id_set = {}
        # Abstract out the Get Entity IDs and start/end date
        # PLACEMENT LOOP
        # Get entity_ids for each placement type
        for placement in self.PLACEMENTS:  # ALL_ON_TWITTER, PUBLISHER_NETWORK
            # LOGGER.info('placement = {}'.format(placement)) # COMMENT OUT
            entity_ids = []
            min_start = None
            max_end = None
            min_start_rounded = window_start
            max_end_rounded = window_end
            ent = 0
            for active_entity in active_entities:
                active_entity_dict = self.obj_to_dict(active_entity)
                LOGGER.info('active_entity_dict = {}'.format(active_entity_dict))  # COMMENT OUT
                entity_id = active_entity_dict.get('entity_id')
                entity_placements = active_entity_dict.get('placements', [])
                entity_start = strptime_to_utc(active_entity_dict.get(
                    'activity_start_time')).astimezone(timezone)
                entity_end = strptime_to_utc(active_entity_dict.get(
                    'activity_end_time')).astimezone(timezone)

                # If active_entity in placement, append; and determine min/max dates
                if placement in entity_placements:
                    entity_ids.append(entity_id)
                    if ent == 0:
                        min_start = entity_start
                        max_end = entity_end
                    if entity_start < min_start:
                        min_start = entity_start
                    if entity_end > max_end:
                        max_end = entity_end
                    ent = ent + 1
                    # End: if placement in entity_placements
                # End: for active_entity in active_entities

            # Round min_start, max_end to hours or dates
            min_start_rounded, max_end_rounded = self.round_times(
                report_granularity, timezone, min_start, max_end)

            # Adjust for window start/end
            if min_start_rounded:
                if min_start_rounded < window_start:
                    min_start_rounded = window_start
            else:
                min_start_rounded = window_start

            if max_end_rounded:
                if max_end_rounded > window_end:
                    max_end_rounded = window_end
            else:
                max_end_rounded = window_end

            if entity_ids != []:
                entity_id_set = {
                    'placement': placement,
                    'entity_ids': entity_ids,
                    'start_time': min_start_rounded.strftime('%Y-%m-%dT%H:%M:%S%z'),
                    'end_time': max_end_rounded.strftime('%Y-%m-%dT%H:%M:%S%z')
                }
                LOGGER.info('entity_id_set = {}'.format(entity_id_set))  # COMMENT OUT
                entity_id_sets.append(entity_id_set)

            # End: for placement in PLACEMENTS

        return entity_id_sets

    # POST QUEUED ASYNC JOB
    # pylint: disable=line-too-long
    # ASYNC Analytics Reference:
    # https://developer.twitter.com/en/docs/ads/analytics/guides/asynchronous-analytics
    # ASYNC POST Reference:
    # https://developer.twitter.com/en/docs/ads/analytics/api-reference/asynchronous#post-stats-jobs-accounts-account-id
    # Report Parameters:
    #  entity_type: required, 1 and only 1 per request
    #  entity_ids: required, 1 to 20 per request
    #  metric_groups: required, 1 or more per request (valid combinations based on entity_type)
    #  segments: optional, 0 or 1 allowed, based on entity_type
    #    NO segmentation allowed for: MEDIA_CREATIVE and ORGANIC_TWEETS
    #    country: country targeting value, required for segment = LOCATIONS, POSTAL_CODES,
    #    REGIONS, METROS?
    #    platform: platform targeting value, required for segment = DEVICES, PLATFORM_VERSIONS
    #  placements: required, 1 and only 1 per request; but loop thru 2:
    #    ALL_ON_TWITTER, PUBLISHER_NETWORK
    #  granularity: required; HOUR, DAY, or TOTAL; 1 and only 1 per request
    #  start_date - end_date: required, have to be rounded to the hour
    #      limited to 45 day windows (for SEGMENT queries), 90 days (for non-SEGMENTED)
    # pylint: enable=line-too-long
    def post_queued_async_jobs(
        self, client, account_id, report_name, report_entity, entity_ids, report_granularity,
        report_segment, metric_groups, placement, start_time, end_time, country_id, platform_id,
    ):
        queued_job_ids = []
        # CHUNK ENTITY_IDS LOOP
        chunk = 0  # chunk number
        # Make chunks of 20 of entity_ids
        for chunk_ids in split_list(entity_ids, 20):
            # POST async_queued_job for report entity chunk_ids
            # Reference:
            # https://developer.twitter.com/en/docs/ads/analytics/api-reference/asynchronous#post-stats-jobs-accounts-account-id
            LOGGER.info('Report: {} - POST ASYNC queued_job, chunk#: {}'.format(
                report_name, chunk))
            queued_job_path = 'stats/jobs/accounts/{account_id}'.replace(
                '{account_id}', account_id)
            queued_job_params = {
                # Required params
                'entity': report_entity,
                'entity_ids': ','.join(map(str, chunk_ids)),
                'metric_groups': ','.join(map(str, metric_groups)),
                'placement': placement,
                'granularity': report_granularity,
                'start_time': start_time,
                'end_time': end_time,
                # Optional params
                'segmentation_type': report_segment,
                'country': country_id,
                'platform': platform_id
            }
            LOGGER.info('Report: {} - queued_job POST URL: {}/{}/{}'.format(
                report_name, self.url, API_VERSION, queued_job_path))
            LOGGER.info('Report: {} - queued_job params: {}'.format(
                report_name, queued_job_params))

            # POST queued_job: asynchronous job
            queued_job = self.post_resource(
                'queued_job',
                client,
                queued_job_path,
                queued_job_params,
            )

            queued_job_data = queued_job.get('data')
            queued_job_id = queued_job_data.get('id_str')
            queued_job_ids.append(queued_job_id)
            LOGGER.info('queued_job_ids = {}'.format(queued_job_ids))  # COMMENT OUT
            # End: for chunk_ids in entity_ids
        return queued_job_ids

    def get_async_results_urls(self, client, account_id, report_name, queued_job_ids):
        # WHILE JOBS STILL RUNNING LOOP, GET ASYNC JOB STATUS
        # GET ASYNC Status Reference:
        # https://developer.twitter.com/en/docs/ads/analytics/api-reference/asynchronous#get-stats-jobs-accounts-account-id
        jobs_still_running = True  # initialize
        j = 1   # job status check counter
        async_results_urls = []
        while len(queued_job_ids) > 0 and jobs_still_running and j <= 20:
            # Wait 15 sec for async reports to finish
            wait_sec = 15
            LOGGER.info('Report: {} - Waiting {} sec for async job(s) to finish'.format(
                report_name, wait_sec))
            time.sleep(wait_sec)

            # GET async_job_status
            LOGGER.info('Report: {} - GET async_job_statuses'.format(report_name))
            async_job_statuses_path = 'stats/jobs/accounts/{account_id}'.replace(
                '{account_id}', account_id)
            async_job_statuses_params = {
                # What is the concurrent job_id limit?
                'job_ids': ','.join(map(str, queued_job_ids)),
                'count': 1000,
                'cursor': None
            }
            LOGGER.info('Report: {} - async_job_statuses GET URL: {}/{}/{}'.format(
                report_name, self.url, API_VERSION, async_job_statuses_path))
            LOGGER.info('Report: {} - async_job_statuses params: {}'.format(
                report_name, async_job_statuses_params))
            async_job_statuses = self.get_resource(
                'async_job_statuses',
                client,
                async_job_statuses_path,
                async_job_statuses_params,
            )

            jobs_still_running = False
            for async_job_status in async_job_statuses:
                job_status_dict = self.obj_to_dict(async_job_status)
                job_id = job_status_dict.get('id_str')
                job_status = job_status_dict.get('status')
                if job_status == 'PROCESSING':
                    jobs_still_running = True
                elif job_status == 'SUCCESS':
                    LOGGER.info('Report: {} - job_id: {}, finished running (SUCCESS)'.format(
                        report_name, job_id))
                    job_results_url = job_status_dict.get('url')
                    async_results_urls.append(job_results_url)
                    # LOGGER.info('job_results_url = {}'.format(job_results_url)) # COMMENT OUT
                    # Remove job_id from queued_job_ids
                    queued_job_ids.remove(job_id)
                # End: async_job_status in async_job_statuses
            j = j + 1   # increment job status check counter
            # End: async_job_status in async_job_statuses
        return async_results_urls


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/accounts#accounts
class Accounts(TwitterAds):
    tap_stream_id = "accounts"
    path = 'accounts'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'account_ids': '{account_ids}',
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/creatives/api-reference/account-media#account-media
class AccountMedia(TwitterAds):
    tap_stream_id = "account_media"
    path = 'accounts/{account_id}/account_media'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None,
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/advertiser-business-categories#advertiser-business-categories
class AdvertiserBusinessCategories(TwitterAds):
    tap_stream_id = "advertiser_business_categories"
    path = 'advertiser_business_categories'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'FULL_TABLE'
    params = {}


# Reference:
# https://developer.twitter.com/en/docs/twitter-ads-api/campaign-management/api-reference/tracking-tags
class TrackingTags(TwitterAds):
    tap_stream_id = "tracking_tags"
    path = 'accounts/{account_id}/tracking_tags'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/campaigns#campaigns
class Campaigns(TwitterAds):
    tap_stream_id = "campaigns"
    path = 'accounts/{account_id}/campaigns'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/twitter-ads-api/creatives/api-reference/cards#cards
class Cards(TwitterAds):
    tap_stream_id = "cards"
    path = 'accounts/{account_id}/cards'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'include_legacy_cards': 'true',
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        # As per the API document, the maximum page size is 1000 but
        # API throws an error if a page size passed more than 200
        'count': 200,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/creatives/api-reference/poll#poll-cards
class CardsPoll(TwitterAds):
    tap_stream_id = "cards_poll"
    path = 'accounts/{account_id}/cards/poll'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/creatives/api-reference/image-conversation#image-conversation-cards
class CardsImageConversation(TwitterAds):
    tap_stream_id = "cards_image_conversation"
    path = 'accounts/{account_id}/cards/image_conversation'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/creatives/api-reference/video-conversation#video-conversation-cards
class CardsVideoConversation(TwitterAds):
    tap_stream_id = "cards_video_conversation"
    path = 'accounts/{account_id}/cards/video_conversation'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/content-categories#content-categories
class ContentCategories(TwitterAds):
    tap_stream_id = "content_categories"
    path = 'content_categories'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'FULL_TABLE'
    params = {}


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/funding-instruments#funding-instruments
class FundingInstruments(TwitterAds):
    tap_stream_id = "funding_instruments"
    path = 'accounts/{account_id}/funding_instruments'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/iab-categories#iab-categories
class IabCategories(TwitterAds):
    tap_stream_id = "iab_categories"
    path = 'iab_categories'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'FULL_TABLE'
    params = {
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-criteria#targeting-criteria
class TargetingCriteria(TwitterAds):
    tap_stream_id = 'targeting_criteria'
    path = 'accounts/{account_id}/targeting_criteria'
    data_key = 'data'
    key_properties = ['line_item_id', 'id']
    replication_method = 'INCREMENTAL'
    parent_ids_limit = 200
    params = {
        'line_item_ids': '{parent_ids}',  # up to 200 comma delim ids
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }
    parent_stream = 'line_items'


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/line-items#line-items
class LineItems(TwitterAds):
    tap_stream_id = "line_items"
    path = 'accounts/{account_id}/line_items'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }
    children = ["targeting_criteria"]


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/media-creatives#media-creatives
class MediaCreatives(TwitterAds):
    tap_stream_id = "media_creatives"
    path = 'accounts/{account_id}/media_creatives'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/creatives/api-reference/preroll-call-to-actions#preroll-call-to-actions
class PrerollCallToActions(TwitterAds):
    tap_stream_id = "preroll_call_to_actions"
    path = 'accounts/{account_id}/preroll_call_to_actions'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# References:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/promoted-accounts#promoted-accounts
class PromotedAccounts(TwitterAds):
    tap_stream_id = "promoted_accounts"
    path = 'accounts/{account_id}/promoted_accounts'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/promoted-tweets#promoted-tweets
class PromotedTweets(TwitterAds):
    tap_stream_id = "promoted_tweets"
    path = 'accounts/{account_id}/promoted_tweets'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/promotable-users#promotable-users
class PromotableUsers(TwitterAds):
    tap_stream_id = "promotable_users"
    path = 'accounts/{account_id}/promotable_users'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/scheduled-promoted-tweets#scheduled-promoted-tweets
class ScheduledPromotedTweets(TwitterAds):
    tap_stream_id = "scheduled_promoted_tweets"
    path = 'accounts/{account_id}/scheduled_promoted_tweets'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/audiences/api-reference/tailored-audiences#tailored-audiences
class TailoredAudiences(TwitterAds):
    tap_stream_id = "tailored_audiences"
    path = 'accounts/{account_id}/custom_audiences'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['updated_at']
    params = {
        'sort_by': ['updated_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-app-store-categories
class TargetingAppStoreCategories(TwitterAds):
    tap_stream_id = "targeting_app_store_categories"
    path = 'targeting_criteria/app_store_categories'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {}


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-conversations
class TargetingConversations(TwitterAds):
    tap_stream_id = "targeting_conversations"
    path = 'targeting_criteria/conversations'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-devices
class TargetingDevices(TwitterAds):
    tap_stream_id = "targeting_devices"
    path = 'targeting_criteria/devices'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-events
class TargetingEvents(TwitterAds):
    tap_stream_id = "targeting_events"
    path = 'targeting_criteria/events'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {
        'start_time': '{start_date}',
        'country_codes': '{country_codes}',
        'event_types': 'CONFERENCE,HOLIDAY,MUSIC_AND_ENTERTAINMENT,OTHER,POLITICS,RECURRING,SPORTS',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-interests
class TargetingInterests(TwitterAds):
    tap_stream_id = "targeting_interests"
    path = 'targeting_criteria/interests'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-languages
class TargetingLanguages(TwitterAds):
    tap_stream_id = "targeting_languages"
    path = 'targeting_criteria/languages'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-locations
class TargetingLocations(TwitterAds):
    tap_stream_id = "targeting_locations"
    path = 'targeting_criteria/locations'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    sub_types = ['{country_code_list}']
    params = {
        'country_code': '{sub_type}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-network-operators
class TargetingNetworkOperators(TwitterAds):
    tap_stream_id = "targeting_network_operators"
    path = 'targeting_criteria/network_operators'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    sub_types = ['{country_code_list}']
    params = {
        'country_code': '{sub_type}',
        'count': 1000,
        'cursor': None
    }


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-platform-versions
class TargetingPlatformVersions(TwitterAds):
    tap_stream_id = "targeting_platform_versions"
    path = 'targeting_criteria/platform_versions'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {}


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-platforms
class TargetingPlatforms(TwitterAds):
    tap_stream_id = "targeting_platforms"
    path = 'targeting_criteria/platforms'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    params = {}


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-tv-shows
class TargetingTVShows(TwitterAds):
    tap_stream_id = "targeting_tv_shows"
    path = 'targeting_criteria/tv_shows'
    data_key = 'data'
    key_properties = ['targeting_value']
    replication_method = 'FULL_TABLE'
    parent_ids_limit = 1
    params = {
        'locale': '{parent_ids}',
        'count': 50,
        'cursor': None
    }
    parent_stream = "targeting_tv_markets"


# Reference:
# https://developer.twitter.com/en/docs/ads/campaign-management/api-reference/targeting-options#get-targeting-criteria-tv-markets
class TargetingTvMarkets(TwitterAds):
    tap_stream_id = "targeting_tv_markets"
    path = 'targeting_criteria/tv_markets'
    data_key = 'data'
    key_properties = ['locale']
    replication_method = 'FULL_TABLE'
    params = {}
    children = ["targeting_tv_shows"]


# Reference:
# https://developer.twitter.com/en/docs/ads/creatives/api-reference/tweets#get-accounts-account-id-scoped-timeline
# Data Dictionary:
# https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/tweet-object
# User Data Dictionary:
# https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/user-object
class Tweets(TwitterAds):
    tap_stream_id = "tweets"
    path = 'accounts/{account_id}/tweets'
    data_key = 'data'
    key_properties = ['id']
    replication_method = 'INCREMENTAL'
    replication_keys = ['created_at']
    datetime_format = '%a %b %d %H:%M:%S %z %Y'
    sub_types = ['PUBLISHED', 'SCHEDULED']  # NOT DRAFT
    params = {
        'tweet_type': '{sub_type}',
        'timeline_type': 'ALL',
        'sort_by': ['created_at-desc'],
        'with_deleted': '{with_deleted}',
        'count': 1000,
        'cursor': None  # NOT include_mentions_and_replies
    }


# dictionary of the stream classes
STREAMS = {
    "accounts": Accounts,
    "account_media": AccountMedia,
    "advertiser_business_categories": AdvertiserBusinessCategories,
    "tracking_tags": TrackingTags,
    "campaigns": Campaigns,
    "cards": Cards,
    "cards_poll": CardsPoll,
    "cards_image_conversation": CardsImageConversation,
    "cards_video_conversation": CardsVideoConversation,
    "content_categories": ContentCategories,
    "funding_instruments": FundingInstruments,
    "iab_categories": IabCategories,
    "line_items": LineItems,
    "media_creatives": MediaCreatives,
    "preroll_call_to_actions": PrerollCallToActions,
    "promoted_accounts": PromotedAccounts,
    "promoted_tweets": PromotedTweets,
    "promotable_users": PromotableUsers,
    "scheduled_promoted_tweets": ScheduledPromotedTweets,
    "tailored_audiences": TailoredAudiences,
    "targeting_app_store_categories": TargetingAppStoreCategories,
    "targeting_conversations": TargetingConversations,
    "targeting_devices": TargetingDevices,
    "targeting_events": TargetingEvents,
    "targeting_interests": TargetingInterests,
    "targeting_languages": TargetingLanguages,
    "targeting_locations": TargetingLocations,
    "targeting_network_operators": TargetingNetworkOperators,
    "targeting_platform_versions": TargetingPlatformVersions,
    "targeting_platforms": TargetingPlatforms,
    "targeting_tv_markets": TargetingTvMarkets,
    "tweets": Tweets,
    "targeting_criteria": TargetingCriteria,
    "targeting_tv_shows": TargetingTVShows,
}
