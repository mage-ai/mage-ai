from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog
from mage_integrations.sources.google_search_console.sync import sync
from mage_integrations.sources.google_search_console.client import GoogleClient


class GoogleSearchConsole(Source):
    def sync(self, catalog: Catalog) -> None:
        with GoogleClient(self.config['client_id'],
                          self.config['client_secret'],
                          self.config['refresh_token'],
                          self.config['site_urls'],
                          self.config['user_agent'],
                          self.config.get('request_timeout')) as client:
            sync(client, self.config, catalog, self.state)


if __name__ == '__main__':
    main(GoogleSearchConsole)
