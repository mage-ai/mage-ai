import singer
from tap_pipedrive.stream import PipedriveIterStream

class DealsProductsStream(PipedriveIterStream):
    base_endpoint = 'deals'
    id_endpoint = 'deals/{}/products'
    schema = 'deal_products'
    state_field = None
    key_properties = ['id']

    def get_name(self):
        return self.schema

    def update_endpoint(self, deal_id):
        self.endpoint = self.id_endpoint.format(deal_id)