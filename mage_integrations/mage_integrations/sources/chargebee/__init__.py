from mage_integrations.sources.chargebee.client import ChargebeeClient
from mage_integrations.sources.base import Source
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.chargebee.client.tap_chargebee.streams import (
    ITEM_MODEL_AVAILABLE_STREAMS,
    PLAN_MODEL_AVAILABLE_STREAMS,
)
from typing import List
import singer
import tap_framework

LOGGER = singer.get_logger()

class ChargebeeRunner(tap_framework.Runner):
    def __init__(self, args, client, available_streams, catalog = None):
        super().__init__(args, client, available_streams)

        self.catalog = catalog


class ChargeBee(Source):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.client = ChargebeeClient(self.config)
        

    def discover(self, streams: List[str] = None) -> Catalog:
        runner = ChargebeeRunner(
            self.config, self.client, self.get_available_streams()
        )

        return runner.do_discover()

    def sync(self, catalog: Catalog) -> None:
        runner = ChargebeeRunner(
            self.config,
            self.client,
            self.get_available_streams(),
            catalog=catalog,
        )
        runner.do_sync()



    def get_available_streams(self):
        site_name = self.config.get('site')
        LOGGER.info("Site Name {}".format(site_name))
        configuration_url = 'https://{}.chargebee.com/api/v2/configurations'.format(site_name)
        response = self.client.make_request(
            url=configuration_url,
            method='GET')
        site_configurations = response['configurations']
        LOGGER.info("Configurations API response {}".format(response))
        product_catalog_version = next(iter(config['product_catalog_version'] for config in site_configurations if
                                            config['domain'].lower() == site_name.lower()),
                                    None)
        if product_catalog_version == 'v2':
            available_streams = ITEM_MODEL_AVAILABLE_STREAMS
            self.config['item_model'] = True
            LOGGER.info('Item Model')
        elif product_catalog_version == 'v1':
            available_streams = PLAN_MODEL_AVAILABLE_STREAMS
            self.config['item_model'] = False
            LOGGER.info('Plan Model')
        else:
            LOGGER.error("Incorrect Product Catalog version {}".format(product_catalog_version))
            raise RuntimeError("Incorrect Product Catalog version")
        return available_streams