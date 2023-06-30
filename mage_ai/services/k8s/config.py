from dataclasses import dataclass
from typing import Dict

from mage_ai.shared.config import BaseConfig

# import traceback

DEFAULT_SERVICE_ACCOUNT_NAME = 'default'
ECS_CONTAINER_METADATA_URI_VAR = 'ECS_CONTAINER_METADATA_URI_V4'


@dataclass
class K8sResourceConfig(BaseConfig):
    cpu: str
    memory: str


@dataclass
class K8sExecutorConfig(BaseConfig):
    resource_limits: Dict = None
    resource_requests: Dict = None
    service_account_name: str = DEFAULT_SERVICE_ACCOUNT_NAME

    @classmethod
    def load(self, config_path: str = None, config: Dict = None):
        executor_config = super().load(config_path=config_path, config=config)
        # if executor_config.resource_limits is not None and \
        #         type(executor_config.resource_limits) is dict:
        #     try:
        #         executor_config.resource_limits = K8sResourceConfig.load(
        #             config=executor_config.resource_limits,
        #         )
        #     except Exception:
        #         traceback.print_exc()
        #         executor_config.resource_limits = None
        # if executor_config.resource_requests is not None and \
        #         type(executor_config.resource_requests) is dict:
        #     try:
        #         executor_config.resource_requests = K8sResourceConfig.load(
        #             config=executor_config.resource_requests,
        #         )
        #     except Exception:
        #         traceback.print_exc()
        #         executor_config.resource_requests = None
        return executor_config
