from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.constants import VERSION
import aiohttp


class ApiProjectsHandler(BaseHandler):
    async def get(self):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'https://pypi.org/pypi/mage-ai/json',
                    timeout=3,
                ) as response:
                    response_json = await response.json()
                    latest_version = response_json.get('info', {}).get('version', None)
        except Exception:
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
