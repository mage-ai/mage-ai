from mage_integrations.sources.http.client import Client


class PaystackClient(Client):
    def __init__(self, config, api_result_limit=100):
        super().__init__(config, api_result_limit=api_result_limit)

    def get_headers(self):
        headers = {}

        if self.config.get('secret_key'):
            headers['authorization'] = f"Bearer {self.config.get('secret_key')}"

        return headers
