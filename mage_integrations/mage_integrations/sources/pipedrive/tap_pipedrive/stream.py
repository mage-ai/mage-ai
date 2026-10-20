import os
import singer
import pendulum
from requests.exceptions import RequestException
from mage_integrations.sources.messages import write_schema

logger = singer.get_logger()


class PipedriveStream(object):
    tap = None
    endpoint = ''
    key_properties = []
    state_field = None
    initial_state = None
    earliest_state = None
    schema = ''
    schema_path = 'schemas/{}.json'
    schema_cache = None
    replication_method = 'FULL_TABLE'

    start = 0
    limit = 100
    next_start = 100
    more_items_in_collection = True

    id_list = False

    def get_schema(self):
        if not self.schema_cache:
            self.schema_cache = self.load_schema()
        return self.schema_cache

    def load_schema(self):
        schema_path = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                   self.schema_path.format(self.schema))
        schema = singer.utils.load_json(schema_path)
        return schema

    def write_schema(self):
        write_schema(self.schema, self.get_schema(),
                     key_properties=self.key_properties,
                     replication_method=self.replication_method)

    def get_name(self):
        return self.endpoint

    def update_state(self, row):
        if self.state_field:
            # nullable update_time breaks bookmarking
            if self.get_row_state(row) is not None:
                current_state = pendulum.parse(self.get_row_state(row))

                if self.state_is_newer_or_equal(current_state):
                    self.earliest_state = current_state

    def set_initial_state(self, state, start_date):
        try:
            dt = state['bookmarks'][self.schema][self.state_field]
            if dt is not None:
                self.initial_state = pendulum.parse(dt)
                self.earliest_state = self.initial_state
                return

        except (TypeError, KeyError) as e:
            pass

        self.initial_state = start_date
        self.earliest_state = self.initial_state

    def has_data(self):
        return self.more_items_in_collection

    def paginate(self, response):
        payload = response.json()

        if 'additional_data' in payload and 'pagination' in payload['additional_data']:
            logger.debug('Paginate: valid response')
            pagination = payload['additional_data']['pagination']
            if 'more_items_in_collection' in pagination:
                self.more_items_in_collection = pagination['more_items_in_collection']

                if 'next_start' in pagination:
                    self.start = pagination['next_start']

        else:
            self.more_items_in_collection = False

        if self.more_items_in_collection:
            logger.debug('Stream {} has more data starting at {}'.format(self.schema, self.start))
        else:
            logger.debug('Stream {} has no more data'.format(self.schema))

    def update_request_params(self, params):
        """
        Non recent stream doesn't modify request params
        """
        return params

    def state_is_newer_or_equal(self, current_state):
        if self.earliest_state is None:
            # self.state = current_state
            return True

        if current_state >= self.earliest_state:
            self.earliest_state = current_state
            return True

        return False

    def write_record(self, row):
        if self.record_is_newer_equal_null(row):
            singer.write_record(self.schema, row)
            return True
        return False

    def record_is_newer_equal_null(self, row):
        # no bookmarking in stream or state is null
        if not self.state_field or self.initial_state is None:
            return True

        # state field is null
        if self.get_row_state(row) is None:
            return True

        # newer or equal
        current_state = pendulum.parse(self.get_row_state(row))
        if current_state >= self.initial_state:
            return True

        return False

    def get_row_state(self, row):
        return row[self.state_field]

    def process_row(self, row):
        return row


class PipedriveIterStream(PipedriveStream):
    id_list = True
    
    def get_deal_ids(self, tap):

        # note when the stream starts syncing
        self.stream_start = pendulum.now('UTC') # explicitly set timezone to UTC

        # create checkpoint at inital_state to only find stage changes more recent than initial_state (bookmark)
        checkpoint = self.initial_state

        while self.more_items_in_collection:
            self.endpoint = self.base_endpoint

            with singer.metrics.http_request_timer(self.schema) as timer:
                try:
                    response = tap.execute_stream_request(self)
                except (ConnectionError, RequestException) as e:
                    raise e
                timer.tags[singer.metrics.Tag.http_status_code] = response.status_code

            tap.validate_response(response)
            tap.rate_throttling(response)
            self.paginate(response)

            self.more_ids_to_get = self.more_items_in_collection  # note if there are more pages of ids to get
            self.next_start = self.start  # note pagination for next loop

            if not response.json().get('data'):
                continue

            # find all deals ids for deals added or with stage changes after start and before stop
            this_page_ids = self.find_deal_ids(response.json()['data'], start=checkpoint, stop=self.stream_start)

            self.these_deals = this_page_ids  # need the list of deals to check for last id in the tap
            for deal_id in this_page_ids:
                yield deal_id


    def find_deal_ids(self, data, start, stop):

        # find all deals that were *added* after the start time and before the stop time
        added_ids = [data[i]['id']
                     for i in range(len(data))
                     if (data[i]['add_time'] is not None
                         and start <= pendulum.parse(data[i]['add_time']) < stop)]

        # find all deals that a) had a stage change at any time (i.e., the stage_change_time is not None),
        #                     b) had a stage change after the start time and before the stop time, and
        #                     c) are not in added_ids
        changed_ids = [data[i]['id']
                       for i in range(len(data))
                       if (data[i]['id'] not in added_ids)
                       and (data[i]['stage_change_time'] is not None
                            and start <= pendulum.parse(data[i]['stage_change_time']) < stop)]
        return added_ids + changed_ids
