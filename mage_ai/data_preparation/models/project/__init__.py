import os
from typing import Dict, List

import aiohttp

from mage_ai.cluster_manager.constants import KUBE_NAMESPACE, ClusterType
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_cluster_type, get_repo_config
from mage_ai.server.constants import VERSION
from mage_ai.settings.platform import (
    active_project_settings,
    project_platform_activated,
    project_platform_settings,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import dig


class Project():
    def __init__(self, repo_config=None, repo_path: str = None, root_project: bool = False):
        self.root_project = root_project
        self.repo_path = repo_path or get_repo_path(root_project=self.root_project)

        parts = self.repo_path.split('/')
        self.name = parts[-1]
        self.settings = None

        if not root_project and project_platform_activated():
            self.settings = active_project_settings(get_default=True)
            if self.settings and self.settings.get('uuid'):
                self.name = self.settings.get('uuid')

        self.repo_config = repo_config or get_repo_config(
            repo_path=self.repo_path,
            root_project=self.root_project,
        )
        self.version = VERSION
        self._features = None

    @property
    def workspace_config_defaults(self) -> Dict:
        config = self.repo_config.workspace_config_defaults or {}
        cluster_type = get_cluster_type()
        try:
            if cluster_type == ClusterType.K8S:
                from mage_ai.cluster_manager.kubernetes.workload_manager import (
                    WorkloadManager,
                )
                workload_manager = WorkloadManager(os.getenv(KUBE_NAMESPACE))
                k8s_default_values = workload_manager.get_default_values()

                if not config.get('k8s'):
                    config['k8s'] = k8s_default_values
        except Exception:
            pass

        return config

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
        if self._features:
            return self._features

        self._features = {}
        features = self.features_defined

        for uuid in FeatureUUID:
            key = uuid.value
            self._features[key] = features.get(key) if features else None

        return self._features

    @features.setter
    def features(self, x):
        self._features = x

    @property
    def features_defined(self) -> Dict:
        data = {}
        features = self.repo_config.features if self.repo_config else {}

        for uuid in FeatureUUID:
            key = uuid.value
            if FeatureUUID.PROJECT_PLATFORM == uuid:
                data[key] = project_platform_activated()
            else:
                if features and key in features:
                    data[key] = features.get(key)

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

    @classmethod
    def is_feature_enabled_in_root_or_active_project(self, feature_name: FeatureUUID) -> bool:
        if self(root_project=True).is_feature_enabled(feature_name):
            return True

        if project_platform_activated():
            return self(root_project=False).is_feature_enabled(feature_name)

        return False

    def repo_path_for_database_query(self, key: str) -> List[str]:
        if self.settings:
            query_arr = dig(self.settings, ['database', 'query', key])
            if query_arr:
                return [os.path.join(*[part for part in [
                    os.path.dirname(get_repo_path(root_project=True)),
                    query_alias,
                ] if len(part) >= 1]) for query_alias in query_arr] + [
                    get_repo_path(root_project=False)
                ]

        return [self.repo_path]

    def projects(self) -> Dict:
        return project_platform_settings(mage_projects_only=True)

    def is_feature_enabled(self, feature_name: FeatureUUID) -> bool:
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
