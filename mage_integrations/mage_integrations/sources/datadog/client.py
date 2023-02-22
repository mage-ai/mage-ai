from mage_integrations.sources.http.client import Client


class DatadogClient(Client):
    def __init__(self, config, logger=None, api_result_limit=100):
        super().__init__(
            config,
            logger=logger,
            api_result_limit=api_result_limit,
        )

    def get_headers(self):
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "DD-API-KEY": self.config.get('api_key'),
            "DD-APPLICATION-KEY": self.config.get('application_key')
        }
