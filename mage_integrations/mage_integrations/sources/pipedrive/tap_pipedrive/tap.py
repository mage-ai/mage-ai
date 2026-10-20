import math
import sys
import time
from json import JSONDecodeError

import backoff
import pendulum
import requests
import simplejson
import singer
from requests.exceptions import ConnectionError, RequestException, Timeout
from singer import metadata, set_currently_syncing
from singer.catalog import Catalog, CatalogEntry, Schema

from mage_integrations.sources.pipedrive.tap_pipedrive.config import (
    BASE_URL,
    CONFIG_DEFAULTS,
)
from mage_integrations.sources.pipedrive.tap_pipedrive.exceptions import (
    PipedriveBadRequestError,
    PipedriveError,
    PipedriveForbiddenError,
    PipedriveGoneError,
    PipedriveInternalServiceError,
    PipedriveNotFoundError,
    PipedriveNotImplementedError,
    PipedrivePaymentRequiredError,
    PipedriveServiceUnavailableError,
    PipedriveTooManyRequestsError,
    PipedriveTooManyRequestsInSecondError,
    PipedriveUnauthorizedError,
    PipedriveUnprocessableEntityError,
    PipedriveUnsupportedMediaError,
)
from mage_integrations.sources.pipedrive.tap_pipedrive.streams import (
    ActivityTypesStream,
    CurrenciesStream,
    DealsProductsStream,
    DealStageChangeStream,
    FiltersStream,
    PipelinesStream,
    RecentActivitiesStream,
    RecentDealsStream,
    RecentFilesStream,
    RecentNotesStream,
    RecentOrganizationsStream,
    RecentPersonsStream,
    RecentProductsStream,
    RecentUsersStream,
    StagesStream,
)

logger = singer.get_logger()

# timeout request after 300 seconds
REQUEST_TIMEOUT = 300

ERROR_CODE_EXCEPTION_MAPPING = {
    400: {
        "raise_exception": PipedriveBadRequestError,
        "message": "Request is missing or has a bad parameter."
    },
    401: {
        "raise_exception": PipedriveUnauthorizedError,
        "message": "Invalid authorization credentials."
    },
    402: {
        "raise_exception": PipedrivePaymentRequiredError,
        "message": "Company account is not open (possible reason: trial expired, payment details not entered)."
    },
    403: {
        "raise_exception": PipedriveForbiddenError,
        "message": "Invalid authorization credentials or permissions."
    },
    404: {
        "raise_exception": PipedriveNotFoundError,
        "message": "The requested resource does not exist."
    },
    410: {
        "raise_exception": PipedriveGoneError,
        "message": "The old resource is permanently unavailable."
    },
    415: {
        "raise_exception": PipedriveUnsupportedMediaError,
        "message": "The feature is not enabled."
    },
    422: {
        "raise_exception": PipedriveUnprocessableEntityError,
        "message": "Webhook limit reached."
    },
    429: {
        "raise_exception": PipedriveTooManyRequestsError,
        "message": "Rate limit has been exceeded."
    },
    500: {
        "raise_exception": PipedriveInternalServiceError,
        "message": "Internal Service Error from PipeDrive."
    },
    501: {
        "raise_exception": PipedriveNotImplementedError,
        "message": "Functionality does not exist."
    },
    503: {
        "raise_exception": PipedriveServiceUnavailableError,
        "message": "Schedule maintenance on Pipedrive's end."
    },
}

def is_not_status_code_fn(status_code):
    def gen_fn(exc):
        if getattr(exc, 'response', None) and getattr(exc.response, 'status_code', None) and exc.response.status_code not in status_code:
            return True
        # Retry other errors up to the max
        return False
    return gen_fn

def retry_after_wait_gen():
    while True:
        # This is called in an except block so we can retrieve the exception
        # and check it.
        exc_info = sys.exc_info()
        resp = exc_info[1].response
        sleep_time_str = resp.headers.get('X-RateLimit-Reset')
        logger.info("API rate limit exceeded -- sleeping for %s seconds", sleep_time_str)
        yield math.floor(float(sleep_time_str))


class PipedriveNull200Error(Exception):
    "Raised when pipedrive api returns a 200 with null body"
    pass


class PipedriveTap(object):
    streams = [
        CurrenciesStream(),
        ActivityTypesStream(),
        StagesStream(),
        FiltersStream(),
        PipelinesStream(),
        RecentNotesStream(),
        RecentUsersStream(),
        RecentActivitiesStream(),
        RecentDealsStream(),
        RecentFilesStream(),
        RecentOrganizationsStream(),
        RecentPersonsStream(),
        RecentProductsStream(),
        DealStageChangeStream(),
        DealsProductsStream()
    ]

    def __init__(self, config, state):
        self.config = self.get_default_config()
        self.config.update(config)
        self.config['start_date'] = pendulum.parse(self.config['start_date'])
        self.state = state

    def do_discover(self):
        logger.info('Starting discover')

        catalog = Catalog([])

        for stream in self.streams:
            # with open("teste.log",'w') as file2:
            #     file2.write(stream)
            stream.tap = self

            schema = Schema.from_dict(stream.get_schema())
            key_properties = stream.key_properties

            meta = metadata.get_standard_metadata(
                schema=schema.to_dict(),
                key_properties=key_properties,
                valid_replication_keys=[stream.state_field] if stream.state_field else None,
                replication_method=stream.replication_method
            )

            # If the stream has a state_field, it needs to mark that property with automatic metadata
            if stream.state_field:
                meta = metadata.to_map(meta)
                meta[('properties', stream.state_field)]['inclusion'] = 'automatic'
                meta = metadata.to_list(meta)

            catalog.streams.append(CatalogEntry(
                stream=stream.schema,
                tap_stream_id=stream.schema,
                key_properties=key_properties,
                replication_method=stream.replication_method,
                schema=schema,
                metadata=meta
            ))

        return catalog

    def do_sync(self, catalog):
        logger.debug('Starting sync')

        # resuming when currently_syncing within state
        resume_from_stream = False
        if self.state and 'currently_syncing' in self.state:
            resume_from_stream = self.state['currently_syncing']

        selected_streams = self.get_selected_streams(catalog)

        if 'currently_syncing' in self.state and resume_from_stream not in selected_streams:
            resume_from_stream = False
            del self.state['currently_syncing']

        for stream in self.streams:
            if stream.schema not in selected_streams:
                continue

            stream.tap = self

            if resume_from_stream:
                if stream.schema == resume_from_stream:
                    logger.info('Resuming from {}'.format(resume_from_stream))
                    resume_from_stream = False
                else:
                    logger.info('Skipping stream {} as resuming from {}'.format(stream.schema, resume_from_stream))
                    continue

            # stream state, from state/bookmark or start_date
            stream.set_initial_state(self.state, self.config['start_date'])

            # currently syncing
            if stream.state_field:
                set_currently_syncing(self.state, stream.schema)
                self.state = singer.write_bookmark(self.state, stream.schema, stream.state_field, str(stream.initial_state))
                singer.write_state(self.state)

            # schema
            stream.write_schema()

            catalog_stream = catalog.get_stream(stream.schema)
            stream_metadata = metadata.to_map(catalog_stream.metadata)

            if stream.id_list: # see if we want to iterate over a list of deal_ids

                for deal_id in stream.get_deal_ids(self):
                    is_last_id = False

                    if deal_id == stream.these_deals[-1]: #find out if this is last deal_id in the current set
                        is_last_id = True

                    # if last page of deals, more_items in collection will be False
                    # Need to set it to True to get deal_id pagination for the first deal on the last page
                    if deal_id == stream.these_deals[0]:
                        stream.more_items_in_collection = True

                    stream.update_endpoint(deal_id)
                    stream.start = 0   # set back to zero for each new deal_id
                    self.do_paginate(stream, stream_metadata)

                    if not is_last_id:
                        stream.more_items_in_collection = True   #set back to True for pagination of next deal_id request
                    elif is_last_id and stream.more_ids_to_get:  # need to get the next batch of deal_ids
                        stream.more_items_in_collection = True
                        stream.start = stream.next_start
                    else:
                        stream.more_items_in_collection = False

                # Set the bookmark with a minimum from the `now - attribution_window` and maximum replication key
                # The "stream start date" is in the form of "%Y-%m-%dT%H:%M:%S.%f+00:00", whereas the "earliest_state" is in the
                # format of "%Y-%m-%dT%H:%M:%S+00:00", thus replacing the "microsecond" part to keep consistency in bookmark format
                stream.earliest_state = min(stream.earliest_state, stream.stream_start.subtract(hours=3)).replace(microsecond=0)
            else:
                # paginate
                self.do_paginate(stream, stream_metadata)

            # update state / bookmarking only when supported by stream
            if stream.state_field:
                self.state = singer.write_bookmark(self.state, stream.schema, stream.state_field,
                                                   str(stream.earliest_state))
            singer.write_state(self.state)

        # clear currently_syncing
        try:
            del self.state['currently_syncing']
        except KeyError as e:
            pass
        singer.write_state(self.state)

    def get_selected_streams(self, catalog):
        selected_streams = set()
        for stream in catalog.streams:
            mdata = metadata.to_map(stream.metadata)
            root_metadata = mdata.get(())
            if root_metadata and root_metadata.get('selected') is True:
                selected_streams.add(stream.tap_stream_id)
        return list(selected_streams)

    def do_paginate(self, stream, stream_metadata):
        while stream.has_data():

            with singer.metrics.http_request_timer(stream.schema) as timer:
                try:
                    response = self.execute_stream_request(stream)
                except (ConnectionError, RequestException) as e:
                    raise e
                timer.tags[singer.metrics.Tag.http_status_code] = response.status_code

            self.validate_response(response)
            self.rate_throttling(response)
            stream.paginate(response)

            # records with metrics
            with singer.metrics.record_counter(stream.schema) as counter:
                with singer.Transformer(singer.NO_INTEGER_DATETIME_PARSING) as transformer:
                    for row in self.iterate_response(response):
                        row = stream.process_row(row)

                        if not row: # in case of a non-empty response with an empty element
                            continue
                        row = transformer.transform(row, stream.get_schema(), stream_metadata)
                        if stream.write_record(row):
                            counter.increment()
                            stream.update_state(row)

    def get_default_config(self):
        return CONFIG_DEFAULTS

    def iterate_response(self, response):
        payload = response.json()
        return [] if payload['data'] is None else payload['data']

    def execute_stream_request(self, stream):
        params = {
            'start': stream.start,
            'limit': stream.limit
        }
        params = stream.update_request_params(params)
        return self.execute_request(stream.endpoint, params=params)

    @backoff.on_exception(backoff.expo, (Timeout, ConnectionError, PipedriveNull200Error), max_tries = 5, factor = 2)
    @backoff.on_exception(backoff.expo, (PipedriveInternalServiceError, simplejson.scanner.JSONDecodeError), max_tries = 3)
    @backoff.on_exception(retry_after_wait_gen, (PipedriveTooManyRequestsInSecondError, PipedriveBadRequestError), giveup=is_not_status_code_fn([429]), jitter=None, max_tries=3)
    def execute_request(self, endpoint, params=None):
        headers = {
            'User-Agent': self.config['user-agent'],
            'Accept-Encoding': 'application/json'
        }
        _params = {
            'api_token': self.config['api_token'],
        }
        if params:
            _params.update(params)

        url = "{}/{}".format(BASE_URL, endpoint)
        logger.debug('Firing request at {} with params: {}'.format(url, _params))

        # Set request timeout to config param `request_timeout` value.
        config_request_timeout = self.config.get('request_timeout')
        if config_request_timeout and float(config_request_timeout):
            request_timeout = float(config_request_timeout)
        else:
            request_timeout = REQUEST_TIMEOUT # If value is 0,"0","" or not passed then set default to 300 seconds.

        response = requests.get(url, headers=headers, params=_params, timeout=request_timeout)
        if response.status_code == 200 and isinstance(response, requests.Response) :
            try:
                # Verifying json is valid or not
                response.json()
            except simplejson.scanner.JSONDecodeError as e:
                raise e
            # Retry requests with null bodys and 200 status for dealsflow stream
            if response.json() is None and "flow" in response.url:
                logger.info("Received null body with 200 status for url: %s, retrying", url)
                raise PipedriveNull200Error
            return response
        else:
            raise_for_error(response)

    def validate_response(self, response):
        try:
            payload = response.json()
            if payload and 'data' in payload and payload['success']:
                return True
        except (AttributeError, simplejson.scanner.JSONDecodeError): # Verifying response in execute_request
            pass

    def rate_throttling(self, response):
        if all(x in response.headers for x in ['X-RateLimit-Remaining', 'X-RateLimit-Reset']):
            if int(response.headers['X-RateLimit-Remaining']) < 1:
                seconds_to_sleep = int(response.headers['X-RateLimit-Reset'])
                logger.debug('Hit API rate limits, no remaining requests per 10 seconds, will sleep '
                             'for {} seconds now.'.format(seconds_to_sleep))
                time.sleep(seconds_to_sleep)
        else:
            logger.debug('Required headers for rate throttling are not present in response header, '
                         'unable to throttle ..')

def raise_for_error(response):
    try:
        response.raise_for_status()
    except (requests.HTTPError, requests.ConnectionError) as error:
        try:
            error_code = response.status_code

            # Handling status code 429 specially since the required information is present in the headers
            if error_code == 429:
                resp_headers = response.headers
                api_rate_limit_message = ERROR_CODE_EXCEPTION_MAPPING[429]["message"]

                #Raise PipedriveTooManyRequestsInSecondError exception if 2 seconds limit is reached
                if int(resp_headers.get("X-RateLimit-Remaining")) < 1:
                    message = "HTTP-error-code: 429, Error: {} Please retry after {} seconds.".format(api_rate_limit_message, resp_headers.get("X-RateLimit-Reset"))
                    raise PipedriveTooManyRequestsInSecondError(message, response) from None

                message = "HTTP-error-code: 429, Error: Daily {} Please retry after {} seconds.".format(api_rate_limit_message, resp_headers.get("X-RateLimit-Reset"))

            else:
                # Forming a response message for raising custom exception
                try:
                    json_resp = response.json()
                except Exception:
                    json_resp = {}

                message_text = json_resp.get("error", ERROR_CODE_EXCEPTION_MAPPING.get(error_code, {}).get("message", "Unknown Error"))
                message = "HTTP-error-code: {}, Error: {}".format(error_code, message_text)

            exc = ERROR_CODE_EXCEPTION_MAPPING.get(error_code, {}).get("raise_exception", PipedriveError)
            raise exc(message, response) from None

        except (ValueError, TypeError):
            raise PipedriveError(error) from None
