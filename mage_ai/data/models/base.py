import os
from pathlib import Path
from typing import Any, List, Optional

from mage_ai.data.constants import SUPPORTED_VARIABLE_TYPES, InputDataType
from mage_ai.data.models.constants import CHUNKS_DIRECTORY_NAME
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_preparation.models.block.settings.variables.models import (
    ChunkKeyTypeUnion,
)
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.settings.repo import get_variables_dir
from mage_ai.settings.server import (
    MEMORY_MANAGER_PANDAS_V2,
    MEMORY_MANAGER_POLARS_V2,
    MEMORY_MANAGER_V2,
)


class BaseData:
    def __init__(
        self,
        storage: BaseStorage,
        variable_dir_path: str,
        variable_path: str,
        batch_settings: Optional[BatchSettings] = None,
        chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        input_data_types: Optional[List[InputDataType]] = None,
        poll_interval: Optional[int] = None,
        uuid: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        variables_dir: str = None,
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
        self.batch_settings = batch_settings
        self.chunks = chunks
        self.poll_interval = poll_interval
        self.variable_path = variable_path
        self.variable_type = variable_type
        self.variables_dir = variables_dir or get_variables_dir(root_project=False)
        self.uuid = uuid or str(
            Path(self.variable_dir_path).relative_to(Path(self.variables_dir))
        )

    @property
    def data_partitions_path(self) -> str:
        return os.path.join(self.variable_path, CHUNKS_DIRECTORY_NAME)

    def is_dataframe(self) -> bool:
        return self.variable_type in [
            VariableType.DATAFRAME,
            VariableType.POLARS_DATAFRAME,
            VariableType.SERIES_PANDAS,
            VariableType.SERIES_POLARS,
        ]

    def supported(self, data: Optional[Any] = None) -> bool:
        from mage_ai.data_preparation.models.utils import is_user_defined_complex

        if not MEMORY_MANAGER_V2:
            return False

        if self.variable_type is None and data is not None:
            self.variable_type, _ = infer_variable_type(data)

        if self.variable_type not in SUPPORTED_VARIABLE_TYPES:
            return False

        if (
            self.variable_type
            in [
                VariableType.POLARS_DATAFRAME,
                VariableType.SERIES_POLARS,
            ]
            and not MEMORY_MANAGER_POLARS_V2
        ):
            return False

        if (
            self.variable_type
            in [
                VariableType.DATAFRAME,
                VariableType.SERIES_PANDAS,
            ]
            and not MEMORY_MANAGER_PANDAS_V2
        ):
            return False

        return data is None or is_user_defined_complex(data)
