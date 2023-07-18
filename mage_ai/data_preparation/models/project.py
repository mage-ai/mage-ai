import aiohttp

from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.server.constants import VERSION
from mage_ai.settings.repo import get_repo_path


class Project():
    def __init__(self, repo_config=None):
        parts = get_repo_path().split('/')

        self.name = parts[-1]
        self.repo_config = repo_config or get_repo_config()
        self.version = VERSION

    @property
    def help_improve_mage(self) -> bool:
        return self.repo_config.help_improve_mage

    @property
    def project_uuid(self) -> str:
        return self.repo_config.project_uuid

    async def latest_version(self) -> str:
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

        return latest_version
