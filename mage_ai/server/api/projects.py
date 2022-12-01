from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.constants import VERSION
import requests


class ApiProjectsHandler(BaseHandler):
    def get(self):
        try:
            response = requests.get('https://pypi.org/pypi/mage-ai/json', timeout=3)
            latest_version = response.json().get('info', {}).get('version', None)
        except ConnectionError as err:
            latest_version = VERSION
        parts = get_repo_path().split('/')
        collection = [
            dict(
                latest_version=latest_version,
                name=parts[-1],
                version=VERSION,
            ),
        ]
        self.write(dict(projects=collection))
