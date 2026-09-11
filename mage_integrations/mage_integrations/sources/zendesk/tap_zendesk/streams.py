import datetime
import json
import os

import pytz
import singer
import zenpy
from singer import metadata, utils
from singer.metrics import Point
from tap_zendesk import metrics as zendesk_metrics
from tap_zendesk.sync import process_record
from zenpy.lib.exception import RecordNotFoundException

LOGGER = singer.get_logger()
KEY_PROPERTIES = ['id']

CUSTOM_TYPES = {
    'text': 'string',
    'textarea': 'string',
    'date': 'string',
    'regexp': 'string',
    'dropdown': 'string',
    'integer': 'integer',
    'decimal': 'number',
    'checkbox': 'boolean',
}

DEFAULT_SEARCH_WINDOW_SIZE = (60 * 60 * 24) * 30  # defined in seconds, default to a month (30 days)


def get_sideload_objects(stream):
    """Returns the value of sideload-objects from metadata, returns None if no values are present"""
    return metadata.to_map(stream.metadata).get((), {}).get('sideload-objects')


def check_end_date(record, config, replication_key):
    if 'end_date' in config:
        record_key_date = process_record(record)[replication_key]
        end_date = round(datetime.datetime.strptime(
                                    config['end_date'], "%Y-%m-%dT%H:%M:%SZ").timestamp())
        if not isinstance(record_key_date, int):
            record_key_date = round(datetime.datetime.strptime(
                                    record_key_date, "%Y-%m-%dT%H:%M:%SZ").timestamp())
        return record_key_date > end_date
    else:
        return False


def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def process_custom_field(field):
    """ Take a custom field description and return a schema for it. """
    zendesk_type = field.type
    json_type = CUSTOM_TYPES.get(zendesk_type)
    if json_type is None:
        raise Exception("Discovered unsupported type for custom field {} (key: {}): {}"
                        .format(field.title,
                                field.key,
                                zendesk_type))
    field_schema = {'type': [
        json_type,
        'null'
    ]}

    if zendesk_type == 'date':
        field_schema['format'] = 'datetime'
    if zendesk_type == 'dropdown':
        field_schema['enum'] = [o.value for o in field.custom_field_options]

    return field_schema


class Stream():
    name = None
    replication_method = None
    replication_key = None
    key_properties = KEY_PROPERTIES
    stream = None

    def __init__(self, client=None, config=None):
        self.client = client
        self.config = config

    def get_bookmark(self, state):
        return utils.strptime_with_tz(singer.get_bookmark(state, self.name, self.replication_key))

    def update_bookmark(self, state, value):
        current_bookmark = self.get_bookmark(state)
        if value and utils.strptime_with_tz(value) > current_bookmark:
            singer.write_bookmark(state, self.name, self.replication_key, value)

    def load_schema(self):
        schema_file = "schemas/{}.json".format(self.name)
        with open(get_abs_path(schema_file)) as f:
            schema = json.load(f)
        return self._add_custom_fields(schema)

    def _add_custom_fields(self, schema):  # pylint: disable=no-self-use
        return schema

    def load_metadata(self):
        schema = self.load_schema()
        mdata = metadata.new()

        mdata = metadata.write(mdata, (), 'table-key-properties', self.key_properties)
        mdata = metadata.write(mdata, (), 'forced-replication-method', self.replication_method)

        if self.replication_key:
            mdata = metadata.write(mdata, (), 'valid-replication-keys', [self.replication_key])

        for field_name in schema['properties'].keys():
            if field_name in self.key_properties or field_name == self.replication_key:
                mdata = metadata.write(mdata, ('properties', field_name), 'inclusion', 'automatic')
            else:
                mdata = metadata.write(mdata, ('properties', field_name), 'inclusion', 'available')

        return metadata.to_list(mdata)

    def is_selected(self):
        return self.stream is not None


def raise_or_log_zenpy_apiexception(schema, stream, e):
    # There are multiple tiers of Zendesk accounts. Some of them have
    # access to `custom_fields` and some do not. This is the specific
    # error that appears to be return from the API call in the event that
    # it doesn't have access.
    if not isinstance(e, zenpy.lib.exception.APIException):
        raise ValueError("Called with a bad exception type") from e
    if json.loads(e.args[0])['error']['message'] == "You do not have access to this page. Please contact the account owner of this help desk for further help.":  # noqa
        LOGGER.warning("The account credentials supplied do not have access to `%s` custom fields.",
                       stream)
        return schema
    else:
        raise e


class Organizations(Stream):
    name = "organizations"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def _add_custom_fields(self, schema):
        endpoint = self.client.organizations.endpoint
        # NB: Zenpy doesn't have a public endpoint for this at time of writing
        #     Calling into underlying query method to grab all fields
        try:
            field_gen = self.client.organizations._query_zendesk(endpoint.organization_fields,
                                                                 'organization_field')
        except zenpy.lib.exception.APIException as e:
            return raise_or_log_zenpy_apiexception(schema, self.name, e)
        schema['properties']['organization_fields']['properties'] = {}
        for field in field_gen:
            schema['properties']['organization_fields']['properties'][field.key] = process_custom_field(field) # noqa

        return schema

    def sync(self, state):
        bookmark = self.get_bookmark(state)
        organizations = self.client.organizations.incremental(start_time=bookmark)
        for organization in organizations:
            if check_end_date(organization, self.config, self.replication_key):
                break
            self.update_bookmark(state, organization.updated_at)
            yield (self.stream, organization)


class OrganizationMemberships(Stream):
    name = "organization_memberships"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)

        memberships = self.client.organization_memberships()
        for membership in memberships:
            # some organization memberships come back without an updated_at
            if membership.updated_at:
                if utils.strptime_with_tz(membership.updated_at) >= bookmark:
                    # NB: We don't trust that the records come back ordered by
                    # updated_at (we've observed out-of-order records),
                    # so we can't save state until we've seen all records
                    self.update_bookmark(state, membership.updated_at)
                    yield (self.stream, membership)
            else:
                if membership.id:
                    LOGGER.info('organization_membership record with id: ' + str(membership.id) +
                                ' does not have an updated_at field so it will be syncd...')
                    yield (self.stream, membership)
                else:
                    LOGGER.info(
                        'Received organization_membership \
                         record with no id or updated_at, skipping...')


class Users(Stream):
    name = "users"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def _add_custom_fields(self, schema):
        try:
            field_gen = self.client.user_fields()
        except zenpy.lib.exception.APIException as e:
            return raise_or_log_zenpy_apiexception(schema, self.name, e)
        schema['properties']['user_fields']['properties'] = {}
        for field in field_gen:
            schema['properties']['user_fields']['properties'][field.key] = process_custom_field(
                                                                            field)

        return schema

    def sync(self, state):
        bookmark = self.get_bookmark(state)
        users = self.client.users.incremental(start_time=bookmark)
        for user in users:
            if check_end_date(user, self.config, self.replication_key):
                break
            self.update_bookmark(state, user.updated_at)
            yield (self.stream, user)


class Tickets(Stream):
    name = "tickets"
    replication_method = "INCREMENTAL"
    replication_key = "generated_timestamp"

    last_record_emit = {}
    buf = {}
    buf_time = 60

    def _buffer_record(self, record):
        stream_name = record[0].tap_stream_id
        if self.last_record_emit.get(stream_name) is None:
            self.last_record_emit[stream_name] = utils.now()

        if self.buf.get(stream_name) is None:
            self.buf[stream_name] = []
        self.buf[stream_name].append(record)

        if (utils.now() - self.last_record_emit[stream_name]).total_seconds() > self.buf_time:
            self.last_record_emit[stream_name] = utils.now()
            return True

        return False

    def _empty_buffer(self):
        for stream_name, stream_buf in self.buf.items():
            for rec in stream_buf:
                yield rec
            self.buf[stream_name] = []

    def sync(self, state):
        bookmark = self.get_bookmark(state)
        sideload_objects = get_sideload_objects(self.stream)
        tickets = self.client.tickets.incremental(start_time=bookmark, include=sideload_objects)
        audits_stream = TicketAudits(self.client)
        metrics_stream = TicketMetrics(self.client)
        comments_stream = TicketComments(self.client)

        def emit_sub_stream_metrics(sub_stream):
            if sub_stream.is_selected():
                singer.metrics.log(LOGGER, Point(metric_type='counter',
                                                 metric=singer.metrics.Metric.record_count,
                                                 value=sub_stream.count,
                                                 tags={'endpoint': sub_stream.stream.tap_stream_id}))  # noqa
                sub_stream.count = 0

        if audits_stream.is_selected():
            LOGGER.info("Syncing ticket_audits per ticket...")

        for ticket in tickets:
            zendesk_metrics.capture('ticket')
            generated_timestamp_dt = datetime.datetime.utcfromtimestamp(
                ticket.generated_timestamp).replace(tzinfo=pytz.UTC)

            if check_end_date(ticket, self.config, self.replication_key):
                break

            self.update_bookmark(state, utils.strftime(generated_timestamp_dt))

            ticket_dict = ticket.to_dict()
            # NB: Fields is a duplicate of custom_fields, remove before emitting
            ticket_dict.pop('fields')
            should_yield = self._buffer_record((self.stream, ticket_dict))

            if audits_stream.is_selected():
                try:
                    for audit in audits_stream.sync(ticket_dict["id"]):
                        zendesk_metrics.capture('ticket_audit')
                        self._buffer_record(audit)
                except RecordNotFoundException:
                    LOGGER.warning("Unable to retrieve audits for ticket (ID: %s), "
                                   "the Zendesk API returned a RecordNotFound error",
                                   ticket_dict["id"])

            if metrics_stream.is_selected():
                try:
                    for metric in metrics_stream.sync(ticket_dict["id"]):
                        zendesk_metrics.capture('ticket_metric')
                        self._buffer_record(metric)
                except RecordNotFoundException:
                    LOGGER.warning("Unable to retrieve metrics for ticket (ID: %s), "
                                   "the Zendesk API returned a RecordNotFound error",
                                   ticket_dict["id"])

            if comments_stream.is_selected():
                try:
                    # add ticket_id to ticket_comment so the comment can
                    # be linked back to it's corresponding ticket
                    for comment in comments_stream.sync(ticket_dict["id"]):
                        zendesk_metrics.capture('ticket_comment')
                        comment[1].ticket_id = ticket_dict["id"]
                        self._buffer_record(comment)
                except RecordNotFoundException:
                    LOGGER.warning("Unable to retrieve comments for ticket (ID: %s), "
                                   "the Zendesk API returned a RecordNotFound error",
                                   ticket_dict["id"])

            if should_yield:
                for rec in self._empty_buffer():
                    yield rec
                emit_sub_stream_metrics(audits_stream)
                emit_sub_stream_metrics(metrics_stream)
                emit_sub_stream_metrics(comments_stream)
                singer.write_state(state)

        for rec in self._empty_buffer():
            yield rec
        emit_sub_stream_metrics(audits_stream)
        emit_sub_stream_metrics(metrics_stream)
        emit_sub_stream_metrics(comments_stream)
        singer.write_state(state)


class TicketAudits(Stream):
    name = "ticket_audits"
    replication_method = "INCREMENTAL"
    count = 0

    def sync(self, ticket_id):
        ticket_audits = self.client.tickets.audits(ticket=ticket_id)
        for ticket_audit in ticket_audits:
            self.count += 1
            yield (self.stream, ticket_audit)


class TicketMetrics(Stream):
    name = "ticket_metrics"
    replication_method = "INCREMENTAL"
    count = 0

    def sync(self, ticket_id):
        ticket_metric = self.client.tickets.metrics(ticket=ticket_id)
        self.count += 1
        yield (self.stream, ticket_metric)


class TicketComments(Stream):
    name = "ticket_comments"
    replication_method = "INCREMENTAL"
    count = 0

    def sync(self, ticket_id):
        ticket_comments = self.client.tickets.comments(ticket=ticket_id)
        for ticket_comment in ticket_comments:
            self.count += 1
            yield (self.stream, ticket_comment)


class SatisfactionRatings(Stream):
    name = "satisfaction_ratings"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)
        original_search_window_size = int(self.config.get('search_window_size',
                                          DEFAULT_SEARCH_WINDOW_SIZE))
        search_window_size = original_search_window_size
        # We substract a second here because the API seems to compare
        # start_time with a >, but we typically prefer a >= behavior.
        # Also, the start_time query parameter filters based off of
        # created_at, but zendesk support confirmed with us that
        # satisfaction_ratings are immutable so that created_at =
        # updated_at
        # start = bookmark_epoch-1
        start = bookmark - datetime.timedelta(seconds=1)
        end = start + datetime.timedelta(seconds=search_window_size)
        if 'end_date' in self.config:
            sync_end = datetime.datetime.strptime(self.config['end_date'],
                                                  "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=pytz.UTC)
        else:
            sync_end = singer.utils.now() - datetime.timedelta(minutes=1)
        epoch_sync_end = int(sync_end.strftime('%s'))
        parsed_sync_end = singer.strftime(sync_end, "%Y-%m-%dT%H:%M:%SZ")

        while start < sync_end:
            epoch_start = int(start.strftime('%s'))
            parsed_start = singer.strftime(start, "%Y-%m-%dT%H:%M:%SZ")
            epoch_end = int(end.strftime('%s'))
            parsed_end = singer.strftime(end, "%Y-%m-%dT%H:%M:%SZ")

            LOGGER.info("Querying for satisfaction ratings between %s and %s", parsed_start,
                        min(parsed_end, parsed_sync_end))
            satisfaction_ratings = self.client.satisfaction_ratings(start_time=epoch_start,
                                                                    end_time=min(epoch_end,
                                                                                 epoch_sync_end))
            # NB: We've observed that the tap can sync 50k records in ~15
            # minutes, due to this, the tap will adjust the time range
            # dynamically to ensure bookmarks are able to be written in
            # cases of high volume.
            if satisfaction_ratings.count > 50000:
                search_window_size = search_window_size // 2
                end = start + datetime.timedelta(seconds=search_window_size)
                LOGGER.info("satisfaction_ratings - Detected Search API response size for this \
                             window is too large (> 50k). \
                             Cutting search window in half to %s seconds.", search_window_size)
                continue
            for satisfaction_rating in satisfaction_ratings:
                assert parsed_start <= satisfaction_rating.updated_at, "satisfaction_ratings - \
                Record found before date window start. Details: window start ({}) is not less than \
                or equal to updated_at ({})".format(parsed_start, satisfaction_rating.updated_at)
                if bookmark < utils.strptime_with_tz(satisfaction_rating.updated_at) <= end:
                    # NB: We don't trust that the records come back ordered by
                    # updated_at (we've observed out-of-order records),
                    # so we can't save state until we've seen all records
                    self.update_bookmark(state, satisfaction_rating.updated_at)
                if parsed_start <= satisfaction_rating.updated_at <= parsed_end:
                    yield (self.stream, satisfaction_rating)
            if search_window_size <= original_search_window_size // 2:
                search_window_size = search_window_size * 2
                LOGGER.info("Successfully requested records. Doubling search window to %s seconds",
                            search_window_size)
            singer.write_state(state)

            start = end - datetime.timedelta(seconds=1)
            end = start + datetime.timedelta(seconds=search_window_size)


class Groups(Stream):
    name = "groups"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)

        groups = self.client.groups()
        for group in groups:
            if utils.strptime_with_tz(group.updated_at) >= bookmark:
                # NB: We don't trust that the records come back ordered by
                # updated_at (we've observed out-of-order records),
                # so we can't save state until we've seen all records
                self.update_bookmark(state, group.updated_at)
                yield (self.stream, group)


class Macros(Stream):
    name = "macros"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)

        macros = self.client.macros()
        for macro in macros:
            if utils.strptime_with_tz(macro.updated_at) >= bookmark:
                # NB: We don't trust that the records come back ordered by
                # updated_at (we've observed out-of-order records),
                # so we can't save state until we've seen all records
                self.update_bookmark(state, macro.updated_at)
                yield (self.stream, macro)


class Tags(Stream):
    name = "tags"
    replication_method = "FULL_TABLE"
    key_properties = ["name"]

    def sync(self, state):  # pylint: disable=unused-argument
        # NB: Setting page to force it to paginate all tags, instead of just the
        #     top 100 popular tags
        tags = self.client.tags(page=1)
        for tag in tags:
            yield (self.stream, tag)


class TicketFields(Stream):
    name = "ticket_fields"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)

        fields = self.client.ticket_fields()
        for field in fields:
            if utils.strptime_with_tz(field.updated_at) >= bookmark:
                # NB: We don't trust that the records come back ordered by
                # updated_at (we've observed out-of-order records),
                # so we can't save state until we've seen all records
                self.update_bookmark(state, field.updated_at)
                yield (self.stream, field)


class TicketForms(Stream):
    name = "ticket_forms"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)

        forms = self.client.ticket_forms()
        for form in forms:
            if utils.strptime_with_tz(form.updated_at) >= bookmark:
                # NB: We don't trust that the records come back ordered by
                # updated_at (we've observed out-of-order records),
                # so we can't save state until we've seen all records
                self.update_bookmark(state, form.updated_at)
                yield (self.stream, form)


class GroupMemberships(Stream):
    name = "group_memberships"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)

        memberships = self.client.group_memberships()
        for membership in memberships:
            # some group memberships come back without an updated_at
            if membership.updated_at:
                if utils.strptime_with_tz(membership.updated_at) >= bookmark:
                    # NB: We don't trust that the records come back ordered by
                    # updated_at (we've observed out-of-order records),
                    # so we can't save state until we've seen all records
                    self.update_bookmark(state, membership.updated_at)
                    yield (self.stream, membership)
            else:
                if membership.id:
                    LOGGER.info('group_membership record with id: ' + str(membership.id) +
                                ' does not have an updated_at field so it will be syncd...')
                    yield (self.stream, membership)
                else:
                    LOGGER.info(
                        'Received group_membership record \
                        with no id or updated_at, skipping...')


class SLAPolicies(Stream):
    name = "sla_policies"
    replication_method = "FULL_TABLE"

    def sync(self, state):  # pylint: disable=unused-argument
        for policy in self.client.sla_policies():
            yield (self.stream, policy)


class TicketMetricEvents(Stream):
    name = "ticket_metric_events"
    replication_method = "INCREMENTAL"
    replication_key = "time"

    def sync(self, state):
        bookmark = self.get_bookmark(state)

        ticket_metric_events = self.client.ticket_metric_events(start_time=bookmark)
        for ticket_metric_event in ticket_metric_events:
            if check_end_date(ticket_metric_event, self.config, self.replication_key):
                break
            if utils.strptime_with_tz(ticket_metric_event.time) >= bookmark:
                # NB: We don't trust that the records come back ordered by
                # updated_at (we've observed out-of-order records),
                # so we can't save state until we've seen all records
                self.update_bookmark(state, ticket_metric_event.time)
            yield (self.stream, ticket_metric_event)


class AgentsActivity(Stream):
    name = "agents_activity"
    replication_method = "FULL_TABLE"
    key_properties = ["agent_id"]

    def sync(self, state):  # pylint: disable=unused-argument

        page = 1
        agents_activity = self.client.talk.agents_activity(page=page)
        while len(agents_activity) > 1:
            for agent_activity in agents_activity:
                yield (self.stream, agent_activity)
            page = page + 1
            agents_activity = self.client.talk.agents_activity(page=page)


class Article(Stream):
    name = "articles"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)
        articles = self.client.help_center.articles.incremental(start_time=bookmark)
        for article in articles:
            if check_end_date(article, self.config, self.replication_key):
                break
            if utils.strptime_with_tz(article.updated_at) >= bookmark:
                self.update_bookmark(state, article.updated_at)
            yield self.stream, article


class Call(Stream):
    name = "calls"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)
        calls = self.client.talk.calls.incremental(start_time=bookmark)
        for call in calls:
            if check_end_date(call, self.config, self.replication_key):
                break
            if utils.strptime_with_tz(call.updated_at) >= bookmark:
                self.update_bookmark(state, call.updated_at)
            yield self.stream, call


class Call_legs(Stream):
    name = "call_legs"
    replication_method = "INCREMENTAL"
    replication_key = "updated_at"

    def sync(self, state):
        bookmark = self.get_bookmark(state)
        legs = self.client.talk.legs.incremental(start_time=bookmark)
        for leg in legs:
            if check_end_date(leg, self.config, self.replication_key):
                break
            if utils.strptime_with_tz(leg.updated_at) >= bookmark:
                self.update_bookmark(state, leg.updated_at)
            yield self.stream, leg


STREAMS = {
    "tickets": Tickets,
    "groups": Groups,
    "users": Users,
    "organizations": Organizations,
    "organization_memberships": OrganizationMemberships,
    "ticket_audits": TicketAudits,
    "ticket_comments": TicketComments,
    "ticket_fields": TicketFields,
    "ticket_forms": TicketForms,
    "group_memberships": GroupMemberships,
    "macros": Macros,
    "satisfaction_ratings": SatisfactionRatings,
    "tags": Tags,
    "ticket_metrics": TicketMetrics,
    "sla_policies": SLAPolicies,
    "ticket_metric_events": TicketMetricEvents,
    "agents_activity": AgentsActivity,
    "articles": Article,
    "calls": Call,
    "call_legs": Call_legs
}
