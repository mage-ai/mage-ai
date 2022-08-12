from mage_ai.io.base import DataSource
from mage_ai.server.api.base import BaseHandler
import yaml


class ApiDataProvidersHandler(BaseHandler):
    def get(self):
        profiles = []

        with open('default_repo/io_config.yaml', 'r') as stream:
            try:
                profiles = list(yaml.safe_load(stream).keys())
            except yaml.YAMLError as exc:
                print(exc)

        collection = [dict(
            id=k,
            profiles=[p for p in profiles if p != 'version'],
            value=v.value,
        ) for k, v in DataSource.__members__.items()]
        self.write(dict(data_providers=collection))
