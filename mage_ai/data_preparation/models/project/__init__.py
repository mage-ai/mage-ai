from typing import Dict

import aiohttp

from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.server.constants import VERSION
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.environments import is_debug


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

    @property
    def openai_api_key(self) -> str:
        return self.repo_config.openai_api_key

    @property
    def features(self) -> Dict:
        data = {}
        features = self.repo_config.features

        for uuid in FeatureUUID:
            key = uuid.value
            data[key] = features.get(key) if features else None

        return data

    @property
    def emr_config(self) -> Dict:
        return self.repo_config.emr_config or None

    @property
    def spark_config(self) -> Dict:
        return self.repo_config.spark_config or None

    @property
    def remote_variables_dir(self) -> Dict:
        return self.repo_config.remote_variables_dir

    @property
    def pipelines(self) -> Dict:
        return self.repo_config.pipelines

    def is_feature_enabled(self, feature_name: FeatureUUID) -> str:
        feature_enabled = self.repo_config.features.get(feature_name.value, False)

        if is_debug():
            print(f'[Project.is_feature_enabled]: {feature_name} | {feature_enabled}')

        return feature_enabled

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
