from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.chargebee.client import ChargebeeClient
from mage_integrations.sources.chargebee.state import save_state
from mage_integrations.sources.chargebee.streams import (
    ITEM_MODEL_AVAILABLE_STREAMS,
    PLAN_MODEL_AVAILABLE_STREAMS,
)
from mage_integrations.sources.chargebee.streams.base import is_selected
from typing import List
import singer

LOGGER = singer.get_logger()

class Runner:

    def __init__(self, config, state, catalog, client, available_streams):
        self.config = config
        self.state = state
        self.catalog = catalog
        self.client = client
        self.available_streams = available_streams

    def get_streams_to_replicate(self):
        streams = []

        if not self.catalog:
            return streams

        for stream_catalog in self.catalog.streams:
            if not is_selected(stream_catalog):
                LOGGER.info("'{}' is not marked selected, skipping."
                            .format(stream_catalog.stream))
                continue

            for available_stream in self.available_streams:
                if available_stream.matches_catalog(stream_catalog):
                    if not available_stream.requirements_met(self.catalog):
                        raise RuntimeError(
                            "{} requires that that the following are "
                            "selected: {}"
                            .format(stream_catalog.stream,
                                    ','.join(available_stream.REQUIRES)))

                    to_add = available_stream(
                        self.config, self.state, stream_catalog, self.client)

                    streams.append(to_add)

        return streams

    def do_discover(self):
        LOGGER.info("Starting discovery.")

        catalog = []

        for available_stream in self.available_streams:
            stream = available_stream(self.config, self.state, None, None)

            catalog += stream.generate_catalog()

        return catalog

    def do_sync(self):
        LOGGER.info("Starting sync.")

        streams = self.get_streams_to_replicate()

        for stream in streams:
            try:
                stream.state = self.state
                stream.sync()
                self.state = stream.state
            except OSError as e:
                LOGGER.error(str(e))
                exit(e.errno)

            except Exception as e:
                LOGGER.error(str(e))
                LOGGER.error('Failed to sync endpoint {}, moving on!'
                             .format(stream.TABLE))
                raise e

        save_state(self.state)


class ChargebeeRunner(Runner):
    pass
    # def __init__(self, args, client, available_streams, catalog = None):
    #     super().__init__(args, client, available_streams)

    #     self.catalog = catalog


class Chargebee(Source):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.client = ChargebeeClient(self.config)

    def discover(self, streams: List[str] = None) -> Catalog:
        runner = ChargebeeRunner(
            self.config,
            self.state,
            self.catalog,
            self.client,
            self.get_available_streams(),
        )

        return Catalog(runner.do_discover())

    def sync(self, catalog: Catalog) -> None:
        runner = ChargebeeRunner(
            self.config,
            self.state,
            self.catalog,
            self.client,
            self.get_available_streams(),
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

if __name__ == '__main__':
    main(Chargebee)
