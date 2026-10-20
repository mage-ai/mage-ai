import os
from pathlib import Path
from typing import Any, List, Optional, Union

from mage_ai.data.constants import InputDataType
from mage_ai.data.models.constants import CHUNKS_DIRECTORY_NAME
from mage_ai.data.models.utils import variable_type_supported
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.settings.repo import get_variables_dir
from mage_ai.system.models import ResourceUsage
from mage_ai.system.storage.utils import size_of_path


class BaseData:
    def __init__(
        self,
        storage: BaseStorage,
        variable_dir_path: str,
        variable_path: str,
        batch_settings: Optional[BatchSettings] = None,
        chunks: Optional[List[Any]] = None,
        input_data_types: Optional[List[InputDataType]] = None,
        poll_interval: Optional[int] = None,
        uuid: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        variable_types: Optional[List[VariableType]] = None,
        variables_dir: Optional[str] = None,
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
        self.variable_types = variable_types or []
        self.variables_dir = variables_dir or get_variables_dir(root_project=False)
        self.uuid = uuid or str(Path(self.variable_dir_path).relative_to(Path(self.variables_dir)))

    @property
    def data_source(self) -> Union[str, List[str]]:
        if self.variable_types and len(self.variable_types) >= 1:
            return self.__data_source_paths
        return self.data_source_directory_path

    @property
    def number_of_outputs(self) -> int:
        return (
            len(self.variable_types)
            if self.variable_types and len(self.variable_types) >= 1
            else 1
        )

    @property
    def data_source_directory_path(self) -> str:
        return self.__build_data_source_path()

    @property
    def __data_source_paths(self) -> List[str]:
        if self.variable_types:
            return [
                self.__build_data_source_path(str(idx)) for idx in range(len(self.variable_types))
            ]
        return [self.data_source_directory_path]

    def __build_data_source_path(self, subdirectory: Optional[str] = None) -> str:
        return os.path.join(self.variable_path, subdirectory or '', CHUNKS_DIRECTORY_NAME)

    def is_dataframe(self) -> bool:
        return all(
            variable_type
            in [
                VariableType.DATAFRAME,
                VariableType.POLARS_DATAFRAME,
                VariableType.SERIES_PANDAS,
                VariableType.SERIES_POLARS,
            ]
            for variable_type in (self.variable_types or [self.variable_type])
        )

    @property
    def resource_usage(self) -> ResourceUsage:
        return ResourceUsage.combine(self.resource_usages)

    @property
    def resource_usages(self) -> List[ResourceUsage]:
        return [
            ResourceUsage.load(
                directory=path,
                size=size_of_path(path, file_extension='parquet'),
            )
            for path in self.__data_source_paths
        ]

    def supported(self, data: Optional[Any] = None) -> bool:
        if self.variable_types and len(self.variable_types) >= 1:
            return all(
                variable_type_supported(variable_type, data)
                for variable_type in self.variable_types
            )

        return variable_type_supported(self.variable_type, data)
