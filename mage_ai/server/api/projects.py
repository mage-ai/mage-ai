from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.constants import VERSION


class ApiProjectsHandler(BaseHandler):
    def get(self):
        parts = get_repo_path().split('/')
        collection = [
            dict(
                name=parts[-1],
                version=VERSION,
            ),
        ]
        self.write(dict(projects=collection))
