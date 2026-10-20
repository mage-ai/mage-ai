import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Union

from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.operation_history.constants import (
    MAGE_OPERATION_HISTORY_DIRECTORY_DEFAULT,
    MAGE_OPERATION_HISTORY_DIRECTORY_ENVIRONMENT_VARIABLE_NAME,
    ResourceType,
)
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.settings.platform.constants import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.environments import is_debug


@dataclass
class OperationHistory:
    operation: str
    resource: Dict = field(default_factory=dict)
    timestamp: int = None
    user: str = None

    def __init__(
        self,
        operation: OperationType,
        resource: Dict,
        timestamp: int = None,
        user: str = None,
    ):
        self.operation = operation
        self.resource = resource
        self.timestamp = timestamp
        self.user = user

    def to_dict(self) -> Dict:
        return dict(
            operation=self.operation,
            resource=self.resource,
            timestamp=self.timestamp,
            user=self.user,
        )


class OperationHistoryReader:
    def __init__(self, repo_config=None, repo_path: str = None):
        self.root_project = project_platform_activated()
        self.repo_path = repo_path or get_repo_path(root_project=self.root_project)

        if repo_config is None:
            self.repo_config = get_repo_config(
                repo_path=self.repo_path,
                root_project=self.root_project,
            )
        elif isinstance(repo_config, dict):
            self.repo_config = RepoConfig.from_dict(repo_config)
        else:
            self.repo_config = repo_config

        self.directory_name = self.repo_config.variables_dir
        self._storage = None

    @property
    def storage(self) -> LocalStorage:
        if not self._storage:
            self._storage = LocalStorage()

        return self._storage

    def create(
        self,
        operation: OperationType,
        resource_type: ResourceType,
        resource_uuid: Union[int, str],
        timestamp: int = None,
        user: str = None,
    ) -> OperationHistory:
        model = OperationHistory(
            operation=operation,
            resource=dict(
                type=resource_type,
                uuid=resource_uuid,
            ),
            timestamp=timestamp or int(datetime.utcnow().timestamp()),
            user=user,
        )

        return model

    def build_file_path(self, timestamp: int = None) -> str:
        dir_path = os.getenv(
            MAGE_OPERATION_HISTORY_DIRECTORY_ENVIRONMENT_VARIABLE_NAME,
        ) or os.path.join(
            self.directory_name,
            MAGE_OPERATION_HISTORY_DIRECTORY_DEFAULT,
        )

        filename = datetime.fromtimestamp(
            timestamp or int(datetime.utcnow().timestamp()),
        ).strftime('%Y-%m-%d')

        return os.path.join(dir_path, filename)

    def load_all_history(
        self,
        operation: OperationType = None,
        resource_type: ResourceType = None,
        timestamp_end: int = None,
        timestamp_start: int = None,
    ) -> List[OperationHistory]:
        now = datetime.utcnow().timestamp()

        if not timestamp_start:
            timestamp_start = now
        if not timestamp_end:
            timestamp_end = now

        date_start = datetime.fromtimestamp(timestamp_start).replace(
            hour=0,
            minute=0,
            second=0,
        )
        date_end = datetime.fromtimestamp(timestamp_end).replace(
            hour=0,
            minute=0,
            second=0,
        )

        dates = []
        current_date = date_start
        while current_date < date_end or len(dates) == 0:
            dates.append(current_date)
            current_date += timedelta(hours=24)

        arr = []

        for date in dates:
            file_path = self.build_file_path(date.timestamp())
            if not self.storage.path_exists(file_path):
                continue

            text = self.storage.read(file_path)

            if text:
                for line in text.split('\n'):
                    try:
                        if line:
                            record = OperationHistory(**json.loads(line))
                            if operation and operation.value != record.operation:
                                continue

                            if resource_type and resource_type.value != record.resource.get('type'):
                                continue

                            arr.append(record)
                    except json.decoder.JSONDecodeError as err:
                        if is_debug():
                            print(f'[ERROR] OperationHistoryReader.load_all_history: {err}')

        return arr

    def save(self, operation_history: OperationHistory) -> None:
        text = json.dumps(operation_history.to_dict())
        file_path = self.build_file_path(timestamp=operation_history.timestamp)
        self.storage.makedirs(os.path.dirname(file_path), exist_ok=True)
        with self.storage.open_to_write(file_path, append=True) as f:
            f.write(f'{text}\n')
