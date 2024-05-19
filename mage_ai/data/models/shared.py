from pathlib import Path
from typing import Any, Optional

from mage_ai.data.constants import SUPPORTED_VARIABLE_TYPES
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.settings.repo import get_variables_dir
from mage_ai.system.memory.manager import MemoryManager


class BaseData:
    def __init__(
        self,
        storage: BaseStorage,
        variable_dir_path: str,
        variable_path: str,
        monitor_memory: bool = False,
        poll_interval: Optional[int] = None,
        uuid: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
    ):
        self.storage = storage
        """
        ~/.mage_data/[project_name]/pipelines/[pipeline_uuid]/.variables
            /[pipeline_run.id]/[execution_partition]/[block.uuid]
        ~/.mage_data/unit_3_observability/pipelines/sklearn_training/.variables
            /9/20240518T144726_954384/load_models
        """
        self.variable_dir_path = variable_dir_path
        """
        ~/.mage_data/[project_name]/pipelines/[pipeline_uuid]/.variables
            /[pipeline_run.id]/[execution_partition]/[block.uuid]
            /[variable_name]

        ~/.mage_data/unit_3_observability/pipelines/sklearn_training/.variables
            /9/20240518T144726_954384/load_models
            /output_0
        """

        self.monitor_memory = monitor_memory
        self.poll_interval = poll_interval
        self.variable_path = variable_path
        self.variable_type = variable_type
        self.uuid = uuid or str(
            Path(self.variable_dir_path).relative_to(Path(get_variables_dir(root_project=False)))
        )

    def is_dataframe(self) -> bool:
        return self.variable_type in [
            VariableType.DATAFRAME,
            VariableType.POLARS_DATAFRAME,
            VariableType.SERIES_PANDAS,
        ]

    def build_memory_manager(self) -> MemoryManager:
        return MemoryManager(self.uuid, poll_interval=self.poll_interval)

    def supported(self, data: Optional[Any] = None) -> bool:
        from mage_ai.data_preparation.models.utils import is_user_defined_complex

        project = Project()
        if not project.is_feature_enabled(FeatureUUID.MEMORY_V2):
            return False

        if self.variable_type is None and data is not None:
            self.variable_type, _ = infer_variable_type(data)

        if self.variable_type not in SUPPORTED_VARIABLE_TYPES:
            return False

        if VariableType.POLARS_DATAFRAME == self.variable_type and not project.is_feature_enabled(
            FeatureUUID.MEMORY_V2_POLARS
        ):
            return False

        if self.variable_type in [
            VariableType.DATAFRAME,
            VariableType.SERIES_PANDAS,
        ] and not project.is_feature_enabled(FeatureUUID.MEMORY_V2_PANDAS):
            return False

        return is_user_defined_complex(data)
