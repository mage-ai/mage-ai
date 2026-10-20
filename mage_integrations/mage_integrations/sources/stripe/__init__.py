import json
import logging
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List

import backoff
import singer
import stripe
from singer import Transformer, metadata, metrics, utils
from stripe.api_requestor import APIRequestor
from stripe.api_resources.list_object import ListObject
from stripe.error import InvalidRequestError, RateLimitError
from stripe.stripe_object import StripeObject
from stripe.util import convert_to_stripe_object

from mage_integrations.sources.base import Source
from mage_integrations.sources.catalog import Catalog

REQUIRED_CONFIG_KEYS = [
    "start_date",
    "account_id",
    "client_secret"
]
STREAM_SDK_OBJECTS = {
    'charges': {'sdk_object': stripe.Charge, 'key_properties': ['id']},
    'events': {'sdk_object': stripe.Event, 'key_properties': ['id']},
    'customers': {'sdk_object': stripe.Customer, 'key_properties': ['id']},
    'plans': {'sdk_object': stripe.Plan, 'key_properties': ['id']},
    'payment_intents': {'sdk_object': stripe.PaymentIntent, 'key_properties': ['id']},
    'invoices': {'sdk_object': stripe.Invoice, 'key_properties': ['id']},
    'invoice_items': {'sdk_object': stripe.InvoiceItem, 'key_properties': ['id']},
    'invoice_line_items': {'sdk_object': stripe.InvoiceLineItem,
                           'key_properties': ['id', 'invoice']},
    'transfers': {'sdk_object': stripe.Transfer, 'key_properties': ['id']},
    'coupons': {'sdk_object': stripe.Coupon, 'key_properties': ['id']},
    'subscriptions': {
        'sdk_object': stripe.Subscription,
        'key_properties': ['id'],
        'request_args': {'status': 'all'}
    },
    'subscription_items': {'sdk_object': stripe.SubscriptionItem, 'key_properties': ['id']},
    'balance_transactions': {'sdk_object': stripe.BalanceTransaction,
                             'key_properties': ['id']},
    'payouts': {'sdk_object': stripe.Payout, 'key_properties': ['id']},
    # Each Payout has many transactions that are not accounted
    # for unless you ask for balance/history with a payout id
    'payout_transactions': {'sdk_object': stripe.BalanceTransaction, 'key_properties': ['id']},
    'disputes': {'sdk_object': stripe.Dispute, 'key_properties': ['id']},
    'products': {'sdk_object': stripe.Product, 'key_properties': ['id']},
}

# I think this can be merged into the above structure
STREAM_REPLICATION_KEY = {
    'charges': 'created',
    'events': 'created',
    'customers': 'created',
    'plans': 'created',
    'payment_intents': 'created',
    'invoices': 'created',
    'invoice_items': 'date',
    'transfers': 'created',
    'coupons': 'created',
    'subscriptions': 'created',
    'subscription_items': 'created',
    'balance_transactions': 'created',
    'payouts': 'created',
    'payout_transactions': 'id',
    # invoice_line_items is bookmarked based on parent invoices,
    # no replication key value on the object itself
    # 'invoice_line_items': 'date'
    'disputes': 'created',
    'products': 'created',
}

STREAM_TO_TYPE_FILTER = {
    'charges': {'type': 'charge.*', 'object': ['charge']},
    'customers': {'type': 'customer.*', 'object': ['customer']},
    'plans': {'type': 'plan.*', 'object': ['plan']},
    'payment_intents': {'type': 'payment_intent.*', 'object': ['payment_intent']},
    'invoices': {'type': 'invoice.*', 'object': ['invoice']},
    'invoice_items': {'type': 'invoiceitem.*', 'object': ['invoiceitem']},
    'coupons': {'type': 'coupon.*', 'object': ['coupon']},
    'subscriptions': {'type': 'customer.subscription.*', 'object': ['subscription']},
    'payouts': {'type': 'payout.*', 'object': ['transfer', 'payout']},
    'transfers': {'type': 'transfer.*', 'object': ['transfer']},
    'disputes': {'type': 'charge.dispute.*', 'object': ['dispute']},
    'products': {'type': 'product.*', 'object': ['product']},
    'invoice_line_items': {'type': 'invoice.*', 'object': ['line_item']},
    'subscription_items': {'type': 'customer.subscription.*', 'object': ['subscription_item']},
    'payout_transactions': {'type': 'payout.*', 'object': ['transfer', 'payout']},
    # Cannot find evidence of these streams having events associated:
    # balance_transactions - seems to be immutable
}

# Some fields are not available by default with latest API version so
# retrieve it by passing expand paramater in SDK object
STREAM_TO_EXPAND_FIELDS = {
    # `tax_ids` field is not included in API response by default. To include it in the response,
    # pass it in expand paramater.
    # Reference: https://stripe.com/docs/api/customers/object#customer_object-tax_ids
    'charges': ['data.refunds'],
    'customers': ['data.sources', 'data.subscriptions', 'data.tax_ids'],
    'plans': ['data.tiers'],
    'invoice_items': ['data.plan.tiers'],
    'invoice_line_items': ['data.plan.tiers'],
    'subscriptions': ['data.plan.tiers'],
    'subscription_items': ['data.plan.tiers']
}

SUB_STREAMS = {
    'subscriptions': 'subscription_items',
    'invoices': 'invoice_line_items',
    'payouts': 'payout_transactions'
}

PARENT_STREAM_MAP = {
    'subscription_items': 'subscriptions',
    'invoice_line_items': 'invoices',
    'payout_transactions': 'payouts'
}

# NB: These streams will only sync through once for creates, never updates.
IMMUTABLE_STREAMS = {'balance_transactions', 'events'}
IMMUTABLE_STREAM_LOOKBACK = 600  # 10 min in epoch time, Stripe accuracy is to the second

LOGGER = singer.get_logger()

DEFAULT_DATE_WINDOW_SIZE = 30  # default date window to fetch newly created records
DEFAULT_EVENT_UPDATE_DATE_WINDOW = 7  # default date window to fetch event updates

# default request timeout
REQUEST_TIMEOUT = 300  # 5 minutes


def new_list(self, api_key=None, stripe_version=None, stripe_account=None, **params):
    """
        Reported 400 error for the deleted invoice_line_item
        as part of https://jira.talendforge.org/browse/TDL-16966.
        The Stripe SDK is performing pagination API calls for invoice line items after 10 lines
        (we are getting the first 10 default lines with each invoice).
        If there are more than 10 lines on any invoice, then the SDK will
        collect those lines by passing the last line in the API call
        and for the '/events' API call, all the invoice line items will
        be replicated whether they are deleted or not.
        There is a corner case scenario where the 10th invoice line item is deleted
        and the API call will be:
            https://api.stripe.com/v1/invoices/in_test123/lines?limit=100&starting_after=ii_invoiceLineItem10.
        In this case, we will encounter 400 error code as this invoice line item
          'ii_invoiceLineItem10' is deleted.
        We skipped this kind of call as part of this function as this is the older event
        API call where we still
        have deleted records.
    """
    try:
        stripe_object = self._request(  # pylint: disable=protected-access
            "get",
            self.get("url"),
            api_key=api_key,
            stripe_version=stripe_version,
            stripe_account=stripe_account,
            params=params
        )
        stripe_object._retrieve_params = params  # pylint: disable=protected-access
        return stripe_object
    except InvalidRequestError as error:
        # see if we found 'No such invoice item' in the error message
        if 'No such invoice item' in str(error):
            # warn the user, as we are skipping the deleted record
            LOGGER.warning('%s. Currently, skipping this invoice line item call.', str(error))
            # set 'self.data' to None to come out of the loop
            self.data = None
            return self
        # if error contains message other than 'No such invoice item', raise the same error
        raise error


# To handle deleted invoice line item call, we replaced the 'list()' function of the 'ListObject'
# class of SDK to skip the deleted invoice line item call and continue syncing
ListObject.list = new_list


class Context():
    config = {}
    state = {}
    catalog = {}
    tap_start = None
    stream_map = {}
    new_counts = {}
    updated_counts = {}
    # By default fetch data from last 30 days for newly created records.
    window_size = DEFAULT_DATE_WINDOW_SIZE
    # By default collect data of 7 days in one API call for event_updates
    event_update_window_size = DEFAULT_EVENT_UPDATE_DATE_WINDOW

    @classmethod
    def get_catalog_entry(cls, stream_name):
        if not cls.stream_map:
            cls.stream_map = {s["tap_stream_id"]: s for s in cls.catalog['streams']}
        return cls.stream_map.get(stream_name)

    @classmethod
    def get_schema(cls, stream_name):
        stream = [s for s in cls.catalog["streams"] if s["tap_stream_id"] == stream_name][0]
        return stream["schema"]

    @classmethod
    def is_selected(cls, stream_name):
        stream = cls.get_catalog_entry(stream_name)
        if not stream:
            return False
        stream_metadata = metadata.to_map(stream['metadata'])
        return metadata.get(stream_metadata, (), 'selected')

    @classmethod
    def is_sub_stream(cls, stream_name):
        for sub_stream_id in SUB_STREAMS.values():
            if stream_name == sub_stream_id:
                return True
        return False

    @classmethod
    def print_counts(cls):
        # Separate loops for formatting.
        for stream_name, stream_count in Context.new_counts.items():
            with metrics.record_counter(stream_name) as counter:
                updates_count = Context.updated_counts[stream_name]
                total_replicated = stream_count + updates_count
                counter.increment(total_replicated)

        LOGGER.info('------------------')
        for stream_name, stream_count in Context.new_counts.items():
            LOGGER.info('%s: %d new, %d updates',
                        stream_name,
                        stream_count,
                        Context.updated_counts[stream_name])
        LOGGER.info('------------------')


def apply_request_timer_to_client(client):
    """ Instruments the Stripe SDK client object with a request timer. """
    _original_request = client.request

    def wrapped_request(*args, **kwargs):
        url = args[1]
        match = re.match(r'http[s]?://api\.stripe\.com/v1/(\w+)\??', url)
        stream_name = match.groups()[0]
        with metrics.http_request_timer(stream_name):
            return _original_request(*args, **kwargs)
    client.request = wrapped_request


def configure_stripe_client():
    stripe.set_app_info(Context.config.get('user_agent', 'Singer.io Tap'),
                        url="https://github.com/singer-io/tap-stripe")
    # Set the API key we'll be using
    # https://github.com/stripe/stripe-python/tree/a9a8d754b73ad47bdece6ac4b4850822fa19db4e#usage
    stripe.api_key = Context.config.get('client_secret')
    # Override the Stripe API Version for consistent access
    stripe.api_version = '2022-11-15'
    # Allow ourselves to retry retryable network errors 15 times
    # https://github.com/stripe/stripe-python/tree/a9a8d754b73ad47bdece6ac4b4850822fa19db4e#configuring-automatic-retries
    stripe.max_network_retries = 15

    request_timeout = Context.config.get('request_timeout')
    # if request_timeout is other than 0, "0" or "" then use request_timeout
    if request_timeout and float(request_timeout):
        request_timeout = float(request_timeout)
    else:  # If value is 0, "0" or "" then set default to 300 seconds.
        request_timeout = REQUEST_TIMEOUT
    # configure the clint with the request_timeout
    client = stripe.http_client.RequestsClient(timeout=request_timeout)
    apply_request_timer_to_client(client)
    stripe.default_http_client = client
    # Set stripe logging to INFO level
    # https://github.com/stripe/stripe-python/tree/a9a8d754b73ad47bdece6ac4b4850822fa19db4e#logging
    logging.getLogger('stripe').setLevel(logging.INFO)
    # Verify connectivity
    account = stripe.Account.retrieve(Context.config.get('account_id'))
    msg = "Successfully connected to Stripe Account with display name" \
          + " `%s`"
    LOGGER.info(msg, account.settings.dashboard.display_name)


def unwrap_data_objects(rec):
    """
    Looks for levels in the record that look like:
    {
        "url": ...,
        "object": ...,
        "data": {...}|[...]|...,
        ...
    }
    and recursively de-nests any that match by bringing the "data"
    value up to its parent's level.
    """
    # Return early if we got here with a list of strings, no denesting required
    if not isinstance(rec, dict):
        return rec

    for k, v in rec.items():  # pylint: disable=invalid-name
        if k == "data" and 'object' in rec and rec['object'] == 'list':
            if isinstance(v, dict):
                return unwrap_data_objects(v)
            if isinstance(v, list):
                return [unwrap_data_objects(o) for o in v]
            return v
        if isinstance(v, dict):
            rec[k] = unwrap_data_objects(v)
        if isinstance(v, list):
            rec[k] = [unwrap_data_objects(o) for o in rec[k]]
    return rec


class DependencyException(Exception):
    pass


def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def load_shared_schema_refs():
    shared_schemas_path = get_abs_path('schemas/shared')

    shared_file_names = [f for f in os.listdir(shared_schemas_path)
                         if os.path.isfile(os.path.join(shared_schemas_path, f))]

    shared_schema_refs = {}
    for shared_file in shared_file_names:
        with open(os.path.join(shared_schemas_path, shared_file)) as data_file:
            shared_schema_refs['shared/' + shared_file] = json.load(data_file)

    return shared_schema_refs

# Load schemas from schemas folder


def load_schemas():
    schemas = {}

    schema_path = get_abs_path('schemas')
    files = [f for f in os.listdir(schema_path) if os.path.isfile(os.path.join(schema_path, f))]
    for filename in files:
        path = get_abs_path('schemas') + '/' + filename
        file_raw = filename.replace('.json', '')
        with open(path) as file:
            schemas[file_raw] = {'path': filename, 'schema': json.load(file)}

    return schemas


def get_discovery_metadata(schema, key_properties, replication_method, replication_key):
    mdata = metadata.new()
    mdata = metadata.write(mdata, (), 'table-key-properties', key_properties)
    mdata = metadata.write(mdata, (), 'forced-replication-method', replication_method)

    if replication_key:
        mdata = metadata.write(mdata, (), 'valid-replication-keys', [replication_key])

    for field_name in schema['properties'].keys():
        if field_name in key_properties or field_name in [replication_key, "updated"]:
            mdata = metadata.write(mdata, ('properties', field_name), 'inclusion', 'automatic')
        else:
            mdata = metadata.write(mdata, ('properties', field_name), 'inclusion', 'available')

    return metadata.to_list(mdata)


def discover(logger=None):
    if logger is None:
        logger = LOGGER
    raw_schemas = load_schemas()
    streams = []

    logger.info('Starting Discover')
    for stream_name, stream_map in STREAM_SDK_OBJECTS.items():
        schema = raw_schemas[stream_name]['schema']
        refs = load_shared_schema_refs()
        # create and add catalog entry
        catalog_entry = {
            'stream': stream_name,
            'tap_stream_id': stream_name,
            'schema': singer.resolve_schema_references(schema, refs),
            'metadata': get_discovery_metadata(schema,
                                               stream_map['key_properties'],
                                               'INCREMENTAL',
                                               STREAM_REPLICATION_KEY.get(stream_name)),
            # Events may have a different key property than this. Change
            # if it's appropriate.
            'key_properties': stream_map['key_properties']
        }
        streams.append(catalog_entry)
    logger.info('Finishing Discover')
    return {'streams': streams}


def value_at_breadcrumb(breadcrumb, rec):
    if len(breadcrumb) == 1:
        return rec.get(breadcrumb[0])
    if rec.get(breadcrumb[0]):
        return value_at_breadcrumb(breadcrumb[1:], rec[breadcrumb[0]])
    return None


def insert_at_breadcrumb(breadcrumb, value, rec):
    if len(breadcrumb) == 1:
        rec[breadcrumb[0]] = value
    else:
        if rec.get(breadcrumb[0]):
            insert_at_breadcrumb(breadcrumb[1:], value, rec[breadcrumb[0]])
        else:
            rec[breadcrumb[0]] = {}
            insert_at_breadcrumb(breadcrumb[1:], value, rec[breadcrumb[0]])


def apply_whitelist(rec, stream_field_whitelist):
    """The whitelist is a map from stream_name to a list of breadcrumbs that
    indicates which nested fields should be persisted. There shouldn't be
    any top-level fields in the whitelist since users can already remove
    these fields via field selection. The shape of the whitelist is:
    {
       <stream_name>: [
          [<field_1_breadcrumb>],
          [<field_2_breadcrumb>],
          ...
          [<field_n_breadcrumb>]
       ]
    }
    For now, the top level field should always be 'data' until we hear of
    a need to extend this to other deeply nested objects
    """
    filtered_rec = {}

    # Keep all the top level fields
    for k, v in rec.items():  # pylint: disable=invalid-name
        if not isinstance(v, (dict, list)):
            filtered_rec[k] = v

    for breadcrumb in stream_field_whitelist:
        assert len(breadcrumb) > 1
        assert breadcrumb[0] == 'data'
        value_to_add = value_at_breadcrumb(breadcrumb, rec)
        if value_to_add:
            insert_at_breadcrumb(breadcrumb, value_to_add, filtered_rec)
    return filtered_rec


def reduce_foreign_keys(rec, stream_name):
    if stream_name == 'customers':
        rec['subscriptions'] = [s['id'] for s in rec.get('subscriptions', [])] or None
    elif stream_name == 'subscriptions':
        rec['items'] = [i['id'] for i in rec.get('items', [])] or None
    elif stream_name == 'invoices':
        lines = rec.get('lines')
        if isinstance(lines, list):
            rec['lines'] = [line['id'] for line in rec.get('lines', [])] or None
        # Sometimes the lines key is a dict with a list of objects. This behavior may
        # manifest for events of type 'invoice.payment_succeeded'
        elif isinstance(lines, dict):
            for k, val in lines.items():
                if isinstance(val, list) and val and isinstance(val[0], StripeObject):
                    rec['lines'][k] = [li.to_dict_recursive() for li in val]
    return rec


# Retry 429 RateLimitError 7 times.
@backoff.on_exception(backoff.expo,
                      RateLimitError,
                      max_tries=7,
                      factor=2)
def new_request(self, method, url, params=None, headers=None):
    '''The new request function to overwrite the request()
    function of the APIRequestor class of SDK.'''
    rbody, rcode, rheaders, my_api_key = self.request_raw(
        method.lower(), url, params, headers, is_streaming=False
    )
    resp = self.interpret_response(rbody, rcode, rheaders)
    LOGGER.debug('request id : %s', resp.request_id)
    return resp, my_api_key


# To log the request_id, we replaced the request() function of the APIRequestor
# class o SDK, captured the response and logged the request_id
APIRequestor.request = new_request


def paginate(sdk_obj, filter_key, start_date, end_date, stream_name, request_args=None, limit=100):
    yield from sdk_obj.list(
        limit=limit,
        stripe_account=Context.config.get('account_id'),
        # Some fields are not available by default with latest API version so
        # retrieve it by passing expand paramater in SDK object
        expand=STREAM_TO_EXPAND_FIELDS.get(stream_name, []),
        # None passed to starting_after appears to retrieve
        # all of them so this should always be safe.
        **{filter_key + "[gte]": start_date,
           filter_key + "[lt]": end_date},
        **request_args or {}
    ).auto_paging_iter()


# pylint: disable=invalid-name
def dt_to_epoch(dt):
    return int(dt.timestamp())


def epoch_to_dt(epoch_ts):
    return datetime.fromtimestamp(epoch_ts)


def get_bookmark_for_stream(stream_name, replication_key):
    """
        Returns bookmark for the streams from the state if found otherwise start_date
    """
    # Invoices's replication key changed from `date` to `created` in latest API version.
    # Invoice line Items write bookmark with Invoice's replication key but it changed to `created`
    # so kept `date` in bookmarking for Invoices and Invoice line Items as it has to respect
    # bookmark of active connection too.
    if stream_name in ['invoices', 'invoice_line_items']:
        stream_bookmark = singer.get_bookmark(Context.state or {}, stream_name, 'date') or \
            int(utils.strptime_to_utc(Context.config["start_date"]).timestamp())
    else:
        stream_bookmark = singer.get_bookmark(
            Context.state or {}, stream_name, replication_key
        ) or \
            int(utils.strptime_to_utc(Context.config["start_date"]).timestamp())
    return stream_bookmark


def evaluate_start_time_based_on_lookback(bookmark, lookback_window):
    '''
    For historical syncs take the start date as the starting point in a sync,
    even if it is more recent than {today - lookback_window}. For incremental syncs,
    the tap should start syncing from {previous state - lookback_window}
    '''
    start_date = int(utils.strptime_to_utc(Context.config["start_date"]).timestamp())
    if bookmark:
        lookback_evaluated_time = bookmark - lookback_window
        return lookback_evaluated_time
    return start_date


def get_bookmark_for_sub_stream(stream_name):
    """
    Get the bookmark for the child-stream based on the parent's replication key.
    """
    child_stream = stream_name
    # Get the parent for the stream
    parent_stream = PARENT_STREAM_MAP[child_stream]
    # Get the replication key
    parent_replication_key = STREAM_REPLICATION_KEY[parent_stream]
    # Get the bookmark value of the child stream
    bookmark_value = get_bookmark_for_stream(child_stream, parent_replication_key)
    return bookmark_value


def write_bookmark_for_stream(stream_name, replication_key, stream_bookmark):
    """
        Write bookmark for the streams using replication key and bookmark value
    """
    # Invoices's replication key changed from `date` to `created` in latest API version.
    # Invoice line Items write bookmark with Invoice's replication key but it changed to `created`
    # so kept `date` in bookmarking for Invoices and Invoice line Items as it has to respect
    # bookmark of active connection too.
    if stream_name in ['invoices', 'invoice_line_items']:
        singer.write_bookmark(Context.state or {},
                              stream_name,
                              'date',
                              stream_bookmark)
    else:
        singer.write_bookmark(Context.state or {},
                              stream_name,
                              replication_key,
                              stream_bookmark)


def convert_dict_to_stripe_object(record):
    """
    Convert field datatype of dict object to `stripe.stripe_object.StripeObject`.
    Example:
    record = {'id': 'dummy_id', 'tiers':  [{"flat_amount": 4578"unit_amount": 7241350}]}
    This function convert datatype of each record of 'tiers'
    field to `stripe.stripe_object.StripeObject`.
    """
    # Loop through each fields of `record` object
    for key, val in record.items():
        # Check type of field
        if isinstance(val, list):
            # Loop through each records of list
            for index, field_val in enumerate(val):
                if isinstance(field_val, dict):
                    # Convert datatype of dict to `stripe.stripe_object.StripeObject`
                    record[key][index] = convert_to_stripe_object(record[key][index])

    return record

# pylint: disable=too-many-locals
# pylint: disable=too-many-statements


def sync_stream(stream_name, is_sub_stream=False, logger=None):
    """
    Sync each stream, looking for newly created records. Updates are captured by events stream.
    :param
    stream_name - Name of the stream
    is_sub_stream - Check whether the function is called via the parent stream(only parent/both
    parent-child are selected)
                    or when called through only child stream i.e. when parent is not selected.
    """
    if logger is None:
        logger = LOGGER
    logger.info(f"Started syncing stream {stream_name}")

    stream_metadata = metadata.to_map(Context.get_catalog_entry(stream_name)['metadata'])
    stream_field_whitelist = json.loads(Context.config.get('whitelist_map', '{}')).get(stream_name)

    extraction_time = singer.utils.now()

    if is_sub_stream:
        # We need to get the parent data first for syncing the child streams. Hence,
        # changing stream_name to parent stream when only child is selected.
        stream_name = PARENT_STREAM_MAP.get(stream_name)

    replication_key = STREAM_REPLICATION_KEY.get(stream_name)

    # Invoice Items bookmarks on `date`, but queries on `created`
    filter_key = 'created' if stream_name == 'invoice_items' else replication_key

    sub_stream_name = SUB_STREAMS.get(stream_name)

    # Get bookmark for the stream
    stream_bookmark = get_bookmark_for_stream(stream_name, replication_key)
    bookmark = stream_bookmark

    # If there is a sub-stream and its selected, get its bookmark (or the start date if no bookmark)
    should_sync_sub_stream = sub_stream_name and Context.is_selected(sub_stream_name)

    # Get the bookmark of the sub_stream if it is selected
    if should_sync_sub_stream:
        sub_stream_bookmark = get_bookmark_for_sub_stream(sub_stream_name)
        bookmark = sub_stream_bookmark

        # If both the parent and child streams are selected, get the minimum bookmark value
        if not is_sub_stream:
            bookmark = min(stream_bookmark, sub_stream_bookmark)
    # Set the substream bookmark to None (when only parent is selected)
    else:
        sub_stream_bookmark = None

    with Transformer(singer.UNIX_SECONDS_INTEGER_DATETIME_PARSING) as transformer:
        end_time = dt_to_epoch(utils.now())

        window_size = Context.window_size

        if DEFAULT_DATE_WINDOW_SIZE != window_size:
            logger.info(f'Using non-default date window size of {window_size}')
        start_window = bookmark

        # NB: Immutable streams are never synced for updates. We've
        # observed a short lag period between when records are created and
        # when they are available via the API, so these streams will need
        # a short lookback window.
        if stream_name in IMMUTABLE_STREAMS:
            if stream_name == "events":
                # Start sync for newly created event records from the last 30 days before if
                # bookmark/start_date is older than 30 days.
                start_window = int(max(bookmark, (singer.utils.now() - timedelta(days=30)).timestamp())) # noqa
                if start_window != bookmark:
                    logger.warning("Provided start_date or current bookmark for newly created event\
                                   records is older than 30 days.")
                    logger.warning("The Stripe Event API returns data for the last 30 days only. \
                                   So, syncing event data from 30 days only.")

            # pylint:disable=fixme
            # TODO: This may be an issue for other streams' created_at
            # entries, but to keep the surface small, doing this only for
            # immutable streams at first to confirm the suspicion.
            try:
                # added configurable lookback window
                lookback_window = Context.config.get('lookback_window', IMMUTABLE_STREAM_LOOKBACK)
                if lookback_window and int(lookback_window) or lookback_window in (0, '0'):
                    lookback_window = int(lookback_window)
                else:
                    lookback_window = IMMUTABLE_STREAM_LOOKBACK  # default lookback
            except ValueError:
                raise ValueError('Please provide a valid integer value for the \
                                 lookback_window parameter.') from None
            if start_window != Context.config["start_date"]:
                start_window = evaluate_start_time_based_on_lookback(start_window, lookback_window)
            stream_bookmark = start_window

        # NB: We observed records coming through newest->oldest and so
        # date-windowing was added and the tap only bookmarks after it has
        # gotten through a date window
        while start_window < end_time:
            stop_window = dt_to_epoch(epoch_to_dt(start_window) + timedelta(days=window_size))
            # cut off the last window at the end time
            if stop_window > end_time:
                stop_window = end_time
            for stream_obj in paginate(
                    STREAM_SDK_OBJECTS[stream_name]['sdk_object'],
                    filter_key,
                    start_window,
                    stop_window,
                    stream_name,
                    STREAM_SDK_OBJECTS[stream_name].get('request_args')
            ):

                # get the replication key value from the object
                rec = unwrap_data_objects(stream_obj.to_dict_recursive())
                # convert field datatype of dict object to `stripe.stripe_object.StripeObject`
                rec = convert_dict_to_stripe_object(rec)
                rec = reduce_foreign_keys(rec, stream_name)
                stream_obj_created = rec[replication_key]
                rec['updated'] = stream_obj_created

                # sync stream if object is greater than or equal to the bookmark
                # and if parent is selected
                if stream_obj_created >= stream_bookmark and not is_sub_stream:
                    rec = transformer.transform(rec,
                                                Context.get_catalog_entry(stream_name)['schema'],
                                                stream_metadata)

                    # At this point, the record has been transformed and so
                    # any de-selected fields have been pruned. Now, prune off
                    # any fields that aren't present in the whitelist.
                    if stream_field_whitelist:
                        rec = apply_whitelist(rec, stream_field_whitelist)

                    singer.write_record(stream_name,
                                        rec,
                                        time_extracted=extraction_time)

                    Context.new_counts[stream_name] += 1

                # sync sub streams if it is selected and the parent object
                # is greater than its bookmark
                if should_sync_sub_stream and stream_obj_created > sub_stream_bookmark:
                    sync_sub_stream(sub_stream_name, stream_obj)

            # Update stream bookmark as stop window when parent stream is selected
            if not is_sub_stream and stop_window > stream_bookmark:
                stream_bookmark = stop_window
                write_bookmark_for_stream(stream_name, replication_key, stream_bookmark)

            # Update sub-stream bookmark as stop window when child stream is selected
            if should_sync_sub_stream and stop_window > sub_stream_bookmark:
                sub_stream_bookmark = stop_window
                write_bookmark_for_stream(sub_stream_name, replication_key, sub_stream_bookmark)

            singer.write_state(Context.state)

            # update window for next iteration
            start_window = stop_window

    singer.write_state(Context.state)


def get_object_list_iterator(object_list):
    """
    The data of a child event may either be a list, dict,
    or None. Handle all as a list.
    """
    if object_list is None:
        return []
    if hasattr(object_list, "auto_paging_iter"):
        # If this is an auto_paging_iter, we want to page by 100. This
        # grabs more data at once, and mitigates an infinite loop scenario
        # where legacy line_items may have the same id of `sub_1234abc`,
        # which breaks pagination. (see below)
        object_list._retrieve_params["limit"] = 100  # pylint:disable=protected-access
        return object_list.auto_paging_iter()
    if isinstance(object_list, dict):
        return [object_list]
    return object_list


# For Cycle Detection Below: In order to reliably detect cycles with
# sub-stream objects while mitigating the impact by requesting 100 on the
# second request, we need to check the expected count plus the initial
# set, against the actual count. If this is greater, we can reliably say
# we are in a cycle.
INITIAL_SUB_STREAM_OBJECT_LIST_LENGTH = 10


def is_parent_selected(sub_stream_name):
    """
    Given a child stream, check if the parent is selected.
    """
    parent_stream = PARENT_STREAM_MAP.get(sub_stream_name)
    return Context.is_selected(parent_stream)


def sync_sub_stream(sub_stream_name, parent_obj, updates=False):
    """
    Given a parent object, retrieve its values for the specified substream.
    """
    extraction_time = singer.utils.now()

    if sub_stream_name == "invoice_line_items":
        object_list = parent_obj.lines
    elif sub_stream_name == "subscription_items":
        # parent_obj.items is a function that returns a dict iterator, so use the attribute
        object_list = parent_obj.get("items")
    elif sub_stream_name == "payout_transactions":
        payout_id = parent_obj['id']
        acct_id = Context.config.get('account_id')
        # Balance transaction history with a payout id param
        # provides the link of transactions to payouts
        if 'automatic' in parent_obj and parent_obj['automatic']:
            object_list = stripe.BalanceTransaction.list(limit=100,
                                                         stripe_account=acct_id,
                                                         payout=payout_id)
        else:
            # According to the API docs balance history is only available
            # for automatic stripe payouts.
            # https://stripe.com/docs/api/balance/balance_history#balance_history-payout
            LOGGER.info('Skipping retrieval of balance history for manual payout %s',
                        payout_id)
            return
    else:
        raise Exception("Attempted to sync substream that is not implemented: {}"
                        .format(sub_stream_name))

    substream_count = 0
    expected_count = None
    # The following code arose because we encountered a bug in the API
    # whereby we enter an infinite loop based on what appears to be bad
    # API behavior on Stripe's end, which is [acknowledged by their
    # team][1]
    #
    # [1]: https://github.com/stripe/stripe-python/issues/567#issuecomment-490957400
    #
    # Our workaround is to rely on the `total_count` of the object_list if
    # we have it (in the case of the affected sub stream,
    # `invoice_line_items`, it has that attribute. Presumably they all
    # have it but the following code was written out of an abundance of
    # caution.) to track whether we've emitted more records than the API
    # told us it had. This may be brittle but we'll have to prove that out
    # in the wild. To make it as robust as possible we're currently
    # restricting it to the `invoice_line_items` substream only. If it
    # were to prove useful elsewhere we will need to increase the
    # complexity of the ValueError generated in the event of an infinite
    # loop to emit other urls.
    if sub_stream_name == 'invoice_line_items' and hasattr(object_list, 'total_count'):
        LOGGER.debug("Will verify substream sync using the object_list's total_count.")
        expected_count = object_list.total_count
    else:
        LOGGER.debug((
            "Will not verify substream sync because object_list "
            "has no total_count attribute or is not "
            "invoice_line_items substream."))

    with Transformer(singer.UNIX_SECONDS_INTEGER_DATETIME_PARSING) as transformer:
        iterator = get_object_list_iterator(object_list)
        for sub_stream_obj in iterator:
            if expected_count:
                substream_count += 1
                if (expected_count + INITIAL_SUB_STREAM_OBJECT_LIST_LENGTH) < substream_count:
                    # If we detect that the total records are greater than
                    # the first page length (10) plus the expected total,
                    # we can confidently say we are in an infinite loop.
                    raise ValueError((
                        "Infinite loop detected. Please contact Stripe "
                        "support with the following curl request: `curl "
                        "-v -H 'Stripe-Account: <redacted>' -H "
                        "'Stripe-Version: {}' -u '<redacted>:' -G "
                        "--data-urlencode 'limit=100' "
                        "https://api.stripe.com/v1/invoices/{}/lines`. "
                        "You can reference the following Github issue "
                        "in your conversation with Stripe support: "
                        "https://github.com/stripe/stripe-python/issues/567#issuecomment-490957400"
                    ).format(stripe.api_version,
                             parent_obj.id))
            obj_ad_dict = sub_stream_obj.to_dict_recursive()

            if sub_stream_name == "invoice_line_items":
                # we will get "unique_id" for default API versions older than "2019-12-03"
                # ie. for API version older than "2019-12-03", the value in the field
                # "unique_id" is moved to "id" field in the newer API version
                # For example:
                #   OLDER API VERSION
                #     {
                #         "id": "ii_testinvoiceitem",
                #         "object": "line_item",
                #         "invoice_item": "ii_testinvoiceitem",
                #         "subscription": "sub_testsubscription",
                #         "type": "invoiceitem",
                #         "unique_id": "il_testlineitem"
                #     }

                #   NEWER API VERSION
                #     {
                #         "id": "il_testlineitem",
                #         "object": "line_item",
                #         "invoice_item": "ii_testinvoiceitem",
                #         "subscription": "sub_testsubscription",
                #         "type": "invoiceitem",
                #     }
                if updates and obj_ad_dict.get("unique_id"):
                    # get "unique_id"
                    object_unique_id = obj_ad_dict.get("unique_id")
                    # get "id"
                    object_id = obj_ad_dict.get("id")
                    # update "id" field with "unique_id" value
                    obj_ad_dict["id"] = object_unique_id
                    # if type is invoiceitem, update 'invoice_item' field with 'id' if not present
                    if obj_ad_dict.get("type") == "invoiceitem" and not obj_ad_dict.get("invoice_item"): # noqa
                        obj_ad_dict["invoice_item"] = object_id
                    # if type is subscription, update 'subscription' field with 'id' if not present
                    elif obj_ad_dict.get("type") == "subscription" and not obj_ad_dict.get("subscription"): # noqa
                        obj_ad_dict["subscription"] = object_id

                # Synthetic addition of a key to the record we sync
                obj_ad_dict["invoice"] = parent_obj.id
            elif sub_stream_name == "payout_transactions":
                # payout_transactions is a join table
                obj_ad_dict = {"id": obj_ad_dict['id'], "payout_id": parent_obj['id']}

            rec = transformer.transform(unwrap_data_objects(obj_ad_dict),
                                        Context.get_catalog_entry(sub_stream_name)['schema'],
                                        metadata.to_map(
                                            Context.get_catalog_entry(sub_stream_name)['metadata']
            ))
            # NB: Older structures (such as invoice_line_items) may not have had their ID present.
            #     Skip these if they don't match the structure we expect.
            if "id" in rec:
                singer.write_record(sub_stream_name,
                                    rec,
                                    time_extracted=extraction_time)
            if updates:
                Context.updated_counts[sub_stream_name] += 1
            else:
                Context.new_counts[sub_stream_name] += 1


def should_sync_event(events_obj, object_type, id_to_created_map):
    """Checks to ensure the event's underlying object has an id and that the id_to_created_map
    contains an entry for that id. Returns true the first time an id should be added to the map
    and when we're looking at an event that is created later than one we've seen before."""
    event_resource_dict = events_obj.data.object.to_dict_recursive()
    event_resource_id = event_resource_dict.get('id')
    current_max_created = id_to_created_map.get(event_resource_id)
    event_created = events_obj.created

    # The event's object had no id so throw it out!
    if not event_resource_id or event_resource_dict.get('object') not in object_type:
        return False

    # If the event is the most recent one we've seen, we should sync it
    # Events can have the same created at time, so just use the first one
    # (Since they are returned in reverse chronological order)
    should_sync = not current_max_created or event_created > current_max_created
    if should_sync:
        id_to_created_map[event_resource_id] = events_obj.created
    return should_sync


def recursive_to_dict(some_obj):
    if isinstance(some_obj, stripe.stripe_object.StripeObject):
        return recursive_to_dict(dict(some_obj))

    if isinstance(some_obj, list):
        return [recursive_to_dict(item) for item in some_obj]

    if isinstance(some_obj, dict):
        return {key: recursive_to_dict(value) for key, value in some_obj.items()}

    # Else just return
    return some_obj


def sync_event_updates(stream_name, is_sub_stream):
    """
    Get updates via events endpoint
    look at 'events update' bookmark and pull events after that
    :param
    stream_name - Name of the stream
    is_sub_stream - Check whether the function is called via
                    the parent stream(only parent/both are selected)
                    or when called through only child stream i.e. when parent is not selected.
    """
    LOGGER.info("Started syncing event based updates")
    reset_brk_flag_value = False
    event_update_window_size = Context.event_update_window_size
    # event_update_window_size in seconds
    events_update_date_window_size = int(60 * 60 * 24 * event_update_window_size)
    sync_start_time = dt_to_epoch(utils.now())
    start_date = int(utils.strptime_to_utc(Context.config["start_date"]).timestamp())

    if is_sub_stream:
        # We need to get the parent data first for syncing the child streams. Hence,
        # changing stream_name to parent stream when only child is selected.
        stream_name = PARENT_STREAM_MAP.get(stream_name)

    sub_stream_name = SUB_STREAMS.get(stream_name)

    parent_bookmark_value = singer.get_bookmark(Context.state or {},
                                                stream_name,
                                                'updates_created') or start_date

    # Get the bookmark value of the sub_stream if its selected and present
    if sub_stream_name:
        sub_stream_bookmark_value = singer.get_bookmark(Context.state or {},
                                                        sub_stream_name,
                                                        'updates_created') or start_date
    # If only child stream is selected, update bookmark to sub-stream bookmark value
    if is_sub_stream:
        bookmark_value = sub_stream_bookmark_value

    elif sub_stream_name and Context.is_selected(sub_stream_name):
        # Get the minimum bookmark value from parent and child streams if both are selected.
        bookmark_value = min(parent_bookmark_value, sub_stream_bookmark_value)

        if parent_bookmark_value != sub_stream_bookmark_value and bookmark_value == start_date:
            reset_brk_flag_value = True

    # Update the bookmark to parent bookmark value, if child is not selected
    else:
        bookmark_value = parent_bookmark_value

    # Start sync for event updates record from the last 30 days before
    # if bookmark/start_date is older than 30 days.
    max_event_start_date = (epoch_to_dt(sync_start_time) - timedelta(days=30)).timestamp()
    max_created = int(max(bookmark_value, max_event_start_date))

    if max_created != bookmark_value and (bookmark_value != start_date or
                                          reset_brk_flag_value is True):
        reset_bookmark_for_event_updates(is_sub_stream, stream_name, sub_stream_name, start_date)
        raise Exception("Provided current bookmark date for event updates is older than 30 days."
                        "Hence, resetting the bookmark date of respective\
                         {}/{} stream to start date.".format(stream_name, sub_stream_name))

    date_window_start = max_created
    date_window_end = max_created + events_update_date_window_size
    stop_paging = False

    # Create a map to hold relate event object ids to timestamps
    updated_object_timestamps = {}

    while not stop_paging:
        extraction_time = singer.utils.now()

        response = STREAM_SDK_OBJECTS['events']['sdk_object'].list(**{
            "limit": 100,
            "type": STREAM_TO_TYPE_FILTER[stream_name]['type'],
            "stripe_account": Context.config.get('account_id'),
            # None passed to starting_after appears to retrieve
            # all of them so this should always be safe.
            "created[gte]": date_window_start,
            "created[lt]": date_window_end,
        })

        # If no results, and we are not up to current time
        if not len(response) and date_window_end > extraction_time.timestamp():
            stop_paging = True

        for events_obj in response.auto_paging_iter():
            event_resource_obj = events_obj.data.object

            # Check whether we should sync the event based on its created time
            if not should_sync_event(events_obj,
                                     STREAM_TO_TYPE_FILTER[stream_name]['object'],
                                     updated_object_timestamps):
                continue

            # Syncing an event as its the first time we've seen it or its the most recent version
            with Transformer(singer.UNIX_SECONDS_INTEGER_DATETIME_PARSING) as transformer:
                event_resource_metadata = metadata.to_map(
                    Context.get_catalog_entry(stream_name)['metadata']
                )

                # Filter out line items with null ids
                if isinstance(events_obj.get('data').get('object'), stripe.Invoice):
                    invoice_obj = events_obj.get('data', {}).get('object', {})
                    line_items = invoice_obj.get('lines', {}).get('data')

                    if line_items:
                        filtered_line_items = [line_item for line_item in line_items
                                               if line_item.get('id')]

                        invoice_obj['lines']['data'] = filtered_line_items

                rec = recursive_to_dict(event_resource_obj)
                rec = unwrap_data_objects(rec)
                rec = reduce_foreign_keys(rec, stream_name)
                rec["updated"] = events_obj.created
                rec["updated_by_event_type"] = events_obj.type
                rec = transformer.transform(
                    rec,
                    Context.get_catalog_entry(stream_name)['schema'],
                    event_resource_metadata
                )

                if events_obj.created >= bookmark_value:
                    if rec.get('id') is not None:
                        # Write parent records only when the parent is selected
                        if not is_sub_stream:
                            singer.write_record(stream_name,
                                                rec,
                                                time_extracted=extraction_time)
                            Context.updated_counts[stream_name] += 1

                        # Delete events should be synced but not their subobjects
                        if events_obj.get('type', '').endswith('.deleted'):
                            continue

                        # Write child stream records only when the child stream is selected
                        if sub_stream_name and Context.is_selected(sub_stream_name):
                            if event_resource_obj:
                                sync_sub_stream(sub_stream_name,
                                                event_resource_obj,
                                                updates=True)
            if events_obj.created > max_created:
                max_created = events_obj.created

        # The events stream returns results in descending order, so we
        # cannot bookmark until the entire page is processed
        date_window_start = date_window_end
        date_window_end = date_window_end + events_update_date_window_size

        # Write bookmark for parent or child stream if it is selected
        write_bookmark_for_event_updates(is_sub_stream, stream_name, sub_stream_name, max_created)

    # max_created is the maximum replication key value among all records.
    # sync_start_time is epoch time when tap started to sync event updates.
    # events_update_date_window_size is the size of date_window to
    # make API requests for event updates.
    # Take back sync_start_time events_update_date_window_size(default 7, maximum 30)
    # days behind to compare
    # with max_created value. Save a maximum of max_created and
    # sync_start_time because stripe returns
    # records of the last 30 days for event updates.
    max_created = max(max_created, sync_start_time - events_update_date_window_size)
    write_bookmark_for_event_updates(is_sub_stream, stream_name, sub_stream_name, max_created)


def write_bookmark_for_event_updates(is_sub_stream, stream_name, sub_stream_name, max_created):
    """
    Write bookmark for parent and child streams.
    """
    # Write the parent bookmark value only when the parent is selected
    if not is_sub_stream:
        singer.write_bookmark(Context.state or {},
                              stream_name,
                              'updates_created',
                              max_created)

    # Write the child bookmark value only when the child is selected
    if sub_stream_name and Context.is_selected(sub_stream_name):
        singer.write_bookmark(Context.state or {},
                              sub_stream_name,
                              'updates_created',
                              max_created)

    singer.write_state(Context.state)


def reset_bookmark_for_event_updates(is_sub_stream, stream_name, sub_stream_name, start_date):
    """
    Reset bookmark for parent and child streams
    to start date and clear the bookmark date for event updates.
    """
    # Write the parent bookmark value only when the parent is selected
    if not is_sub_stream:
        singer.write_bookmark(Context.state or {},
                              stream_name,
                              STREAM_REPLICATION_KEY.get(stream_name),
                              start_date)
        Context.state.get("bookmarks").pop(stream_name, None)

    # Write the child bookmark value only when the child is selected
    if sub_stream_name and Context.is_selected(sub_stream_name):
        singer.write_bookmark(Context.state or {},
                              sub_stream_name,
                              STREAM_REPLICATION_KEY.get(sub_stream_name),
                              start_date)
        Context.state.get("bookmarks").pop(sub_stream_name, None)

    singer.write_state(Context.state)


def get_date_window_size(param, default_value):
    """
    Get date_window value from config, if the value is passed.
    Else return the default value.
    param: Name of param to fetch from the config. (e.g. date_window_size)
    default_value: Default value to return for the given param.
    """
    window_size = Context.config.get(param)

    # If window_size is not passed in the config then set it to the default(30 days)
    if window_size is None:
        return default_value

    # Return float of window_size which is passed in the config and
    # is in the valid format of int, float or string.
    if ((type(window_size) in [int, float]) or
        (isinstance(window_size, str) and window_size.replace('.', '', 1).isdigit())) and \
            float(window_size) > 0:
        return float(window_size)
    else:
        # Raise Exception if window_size value is 0, "0" or invalid string.
        raise Exception("The entered window size '{}' is invalid, it should "
                        "be a valid non-zero integer.".format(window_size))


class Stripe(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        return Catalog(list(filter(
            lambda x: not streams or x['tap_stream_id'] in streams,
            discover(logger=self.logger)['streams'],
        )))

    def sync(self, catalog: Catalog) -> None:
        for catalog_entry in Context.catalog['streams']:
            stream_name = catalog_entry['tap_stream_id']
            if Context.is_selected(stream_name):
                Context.new_counts[stream_name] = 0
                Context.updated_counts[stream_name] = 0
        super().sync(catalog)

    def sync_stream(self, stream, properties: Dict = None) -> None:
        stream_name = stream.tap_stream_id
        if Context.is_selected(stream_name):
            # Run the sync for only parent streams/only child streams/both parent-child streams
            if not Context.is_sub_stream(stream_name) or not is_parent_selected(stream_name):
                sync_stream(stream_name, Context.is_sub_stream(stream_name), logger=self.logger)
                # This prevents us from retrieving immutable stream events.
                if STREAM_TO_TYPE_FILTER.get(stream_name):
                    sync_event_updates(stream_name, Context.is_sub_stream(stream_name))

    def test_connection(self) -> None:
        configure_stripe_client()


@utils.handle_top_exception(LOGGER)
def main():
    # Retry 429 RateLimitError 7 times.
    @backoff.on_exception(backoff.expo,
                          stripe.error.RateLimitError,
                          max_tries=7,
                          factor=2)
    def new_request(self, method, url, params=None, headers=None):
        """
        The new request function to overwrite the request() function of the APIRequestor class
        of SDK.
        """
        rbody, rcode, rheaders, my_api_key = self.request_raw(
            method.lower(), url, params, headers, is_streaming=False
        )
        resp = self.interpret_response(rbody, rcode, rheaders)
        LOGGER.debug('request id : %s', resp.request_id)
        return resp, my_api_key

    # To log the request_id, we replaced the request() function of the APIRequestor
    # class o SDK, captured the response and logged the request_id
    APIRequestor.request = new_request

    # Parse command line arguments
    source = Stripe()

    Context.config = source.config
    Context.state = source.state
    # set the config and state in prior to check the authentication in the discovery mode itself.
    configure_stripe_client()

    if source.should_test_connection:
        pass
    elif source.discover_mode:
        source.process()
    else:
        Context.window_size = get_date_window_size('date_window_size', DEFAULT_DATE_WINDOW_SIZE)
        Context.event_update_window_size = get_date_window_size('event_date_window_size',
                                                                DEFAULT_EVENT_UPDATE_DATE_WINDOW)
        # Reset event_update_window_size to 30 days if it is greater than 30 because Stripe Event
        # API returns data of
        # the last 30 days only.
        if Context.event_update_window_size > 30:
            Context.event_update_window_size = 30
            LOGGER.warning("Using a default window size of 30 days as Stripe Event API returns "
                           "data of the last 30 days only.")

        Context.tap_start = utils.now()
        Context.catalog = source.catalog.to_dict() or source.discover()

        try:
            source.process()
        finally:
            # Print counts
            Context.print_counts()


if __name__ == '__main__':
    main()
