import singer
from requests import RequestException
from tap_pipedrive.streams.recents import RecentsStream


logger = singer.get_logger()


class DynamicTypingRecentsStream(RecentsStream):
    schema_path = 'schemas/recents/dynamic_typing/{}.json'
    static_fields = []
    fields_endpoint = ''
    fields_more_items_in_collection = True
    fields_start = 0
    fields_limit = 100


    def get_schema(self):
        if not self.schema_cache:
            schema = self.load_schema()

            while self.fields_more_items_in_collection:

                fields_params = {"limit" : self.fields_limit, "start" : self.fields_start} 

                try:
                    fields_response = self.tap.execute_request(endpoint=self.fields_endpoint, params=fields_params)
                except (ConnectionError, RequestException) as e:
                    raise e

                try:
                    payload = fields_response.json() # Verifying response in execute_request

                    for property in payload['data']:
                        if property['key'] not in self.static_fields:
                            logger.debug(property['key'], property['field_type'], property['mandatory_flag'])

                            if property['key'] in schema['properties']:
                                logger.warn('Dynamic property "{}" overrides with type {} existing entry in ' \
                                            'static JSON schema of {} stream.'.format(
                                                property['key'],
                                                property['field_type'],
                                                self.schema
                                            )
                                )

                            property_content = {
                                'type': []
                            }

                            if property['field_type'] in ['int']:
                                property_content['type'].append('integer')

                            elif property['field_type'] in ['timestamp']:
                                property_content['format'] = 'date-time'

                            # allow all dynamic properties to be null since this 
                            # happens in practice probably because a property could
                            # be marked mandatory for some amount of time and not
                            # mandatory for another amount of time
                            property_content['type'].append('null')

                            # Default type should be string for all fields
                            property_content['type'].append('string')

                            schema['properties'][property['key']] = property_content

                    # Check for more data is available in next page
                    if 'additional_data' in payload and 'pagination' in payload['additional_data']:
                        pagination = payload['additional_data']['pagination']
                        if 'more_items_in_collection' in pagination:
                            self.fields_more_items_in_collection = pagination['more_items_in_collection']

                            if 'next_start' in pagination:
                                self.fields_start = pagination['next_start']

                    else:
                        self.fields_more_items_in_collection = False

                except Exception as e:
                    raise e

            self.schema_cache = schema
        return self.schema_cache
