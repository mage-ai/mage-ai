from typing import Dict, Generator, List

from singer.schema import Schema

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.chargebee.client import ChargebeeClient
from mage_integrations.sources.chargebee.streams import (
    ITEM_MODEL_AVAILABLE_STREAMS,
    PLAN_MODEL_AVAILABLE_STREAMS,
    STREAMS,
)


class Chargebee(Source):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.client = ChargebeeClient(self.config or {})

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        if query is None:
            query = {}
        tap_stream_id = stream.tap_stream_id
        stream_obj = STREAMS[tap_stream_id](
            self.config,
            self.state,
            stream,
            self.client,
            logger=self.logger,
        )

        return stream_obj.load_data()

    def get_forced_replication_method(self, stream_id):
        return STREAMS[stream_id].REPLICATION_METHOD

    def get_table_key_properties(self, stream_id):
        return STREAMS[stream_id].KEY_PROPERTIES

    def get_valid_replication_keys(self, stream_id):
        return STREAMS[stream_id].VALID_REPLICATION_KEYS

    def load_schemas_from_folder(self) -> Dict:
        site_name = self.config.get('site')
        self.logger.info("Site Name {}".format(site_name))
        configuration_url = 'https://{}.chargebee.com/api/v2/configurations'.format(site_name)
        response = self.client.make_request(
            url=configuration_url,
            method='GET')
        site_configurations = response['configurations']
        self.logger.info(f'Configurations API response {response}')
        product_catalog_version = next(
            iter(config['product_catalog_version'] for config in site_configurations
                 if config['domain'].lower() == site_name.lower()),
            None,
        )
        if product_catalog_version == 'v2':
            available_streams = ITEM_MODEL_AVAILABLE_STREAMS
            self.config['item_model'] = True
            self.logger.info('Item Model')
        elif product_catalog_version == 'v1':
            available_streams = PLAN_MODEL_AVAILABLE_STREAMS
            self.config['item_model'] = False
            self.logger.info('Plan Model')
        else:
            self.logger.error(f'Incorrect Product Catalog version {product_catalog_version}')
            raise RuntimeError('Incorrect Product Catalog version')

        return {
            stream.TABLE: Schema.from_dict(
                stream(self.config, self.state, None, None).get_schema())
            for stream in available_streams
        }


if __name__ == '__main__':
    main(Chargebee)
