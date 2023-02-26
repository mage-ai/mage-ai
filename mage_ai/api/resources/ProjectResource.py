from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.constants import VERSION
import aiohttp


class ProjectResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
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

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )
