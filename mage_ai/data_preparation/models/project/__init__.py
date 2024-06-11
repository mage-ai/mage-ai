import os
from typing import Dict, List, Optional

from mage_ai.cluster_manager.constants import KUBE_NAMESPACE, ClusterType
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_cluster_type, get_repo_config
from mage_ai.server.constants import VERSION
from mage_ai.settings.platform import (
    active_project_settings,
    platform_settings,
    project_platform_activated,
    project_platform_settings,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import dig


class Project:
    def __init__(
        self,
        repo_config=None,
        repo_path: Optional[str] = None,
        context_data: Dict = None,
        root_project: bool = False,
        user=None,
    ):
        # print(f'Project context_data {id(context_data)} {context_data}')
        if context_data is None:
            context_data = dict()
        self.context_data = context_data
        self.root_project = root_project
        self.repo_path = repo_path or get_repo_path(
            context_data=context_data,
            root_project=self.root_project,
            user=user,
        )
        self.user = user

        self.name = os.path.basename(self.repo_path)
        self.settings = None

        if not root_project and project_platform_activated():
            self.settings = active_project_settings(
                context_data=context_data,
                get_default=True,
                user=user,
            )
            if self.settings and self.settings.get('uuid'):
                self.name = self.settings.get('uuid')

        self.version = VERSION
        self._features = None
        self._repo_config = repo_config

        self.__repo_config_root_project = None

        if project_platform_activated():
            self.__repo_config_root_project = get_repo_config(
                repo_path=get_repo_path(root_project=True),
                root_project=True,
            )

    @property
    def repo_config(self):
        if not self._repo_config:
            self._repo_config = get_repo_config(
                repo_path=self.repo_path,
                root_project=self.root_project,
            )
        return self._repo_config

    @property
    def workspace_config_defaults(self) -> Dict:
        config = self.repo_config.workspace_config_defaults or {}
        cluster_type = get_cluster_type(repo_path=self.repo_path)
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

        if project_platform_activated() and self.__repo_config_root_project:
            settings = platform_settings()
            if settings.get('features') and (settings.get('features') or {}).get(
                'override'
            ):
                features.update(self.features_override)

        for uuid in FeatureUUID:
            key = uuid.value
            if features and key in features:
                data[key] = features.get(key)

        return data

    @property
    def features_override(self) -> Dict:
        if project_platform_activated() and self.__repo_config_root_project:
            settings = self.platform_settings()
            if settings.get('features') and (settings.get('features') or {}).get(
                'override'
            ):
                return self.__repo_config_root_project.features or {}

        return {}

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
    def is_feature_enabled_in_root_or_active_project(
        cls,
        feature_name: FeatureUUID,
        context_data: Dict = None,
        user=None,
    ) -> bool:
        if cls(
            context_data=context_data,
            root_project=True,
            user=user,
        ).is_feature_enabled(feature_name):
            return True

        if project_platform_activated():
            return cls(
                context_data=context_data,
                root_project=False,
                user=user,
            ).is_feature_enabled(feature_name)

        return False

    def platform_settings(self) -> Dict:
        if project_platform_activated():
            return platform_settings(mage_projects_only=True)

    def repo_path_for_database_query(self, key: str) -> List[str]:
        if self.settings:
            query_arr = dig(self.settings, ['database', 'query', key])
            if query_arr:
                return [
                    os.path.join(
                        *[
                            part
                            for part in [
                                os.path.dirname(get_repo_path(root_project=True)),
                                query_alias,
                            ]
                            if len(part) >= 1
                        ]
                    )
                    for query_alias in query_arr
                ] + [get_repo_path(root_project=False)]

        return [self.repo_path]

    def projects(self) -> Dict:
        return project_platform_settings(
            context_data=self.context_data,
            mage_projects_only=True
        )

    def is_feature_enabled(self, feature_name: FeatureUUID) -> bool:
        feature_enabled = self.features.get(feature_name.value, False)

        if is_debug() and not os.getenv('DISABLE_DATABASE_TERMINAL_OUTPUT'):
            print(f'[Project.is_feature_enabled]: {feature_name} | {feature_enabled}')

        return feature_enabled
