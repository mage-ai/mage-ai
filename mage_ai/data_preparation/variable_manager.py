import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from mage_ai.data.constants import InputDataType
from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_preparation.models.utils import (
    infer_variable_type,
    warn_for_repo_path,
)
from mage_ai.data_preparation.models.variable import VARIABLE_DIR, Variable
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.data_preparation.models.variables.utils import (
    get_first_data_output_variable_uuid,
    is_output_variable,
)
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.io.base import ExportWritePolicy
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path, get_variables_dir
from mage_ai.settings.server import MEMORY_MANAGER_V2
from mage_ai.shared.constants import GCS_PREFIX, S3_PREFIX
from mage_ai.shared.dates import str_to_timedelta
from mage_ai.shared.environments import is_debug
from mage_ai.shared.strings import to_ordinal_integers
from mage_ai.shared.utils import clean_name
from mage_ai.system.models import ResourceUsage


class VariableManager:
    def __init__(self, repo_path=None, variables_dir=None):
        warn_for_repo_path(repo_path)
        self.repo_path = repo_path or get_repo_path()
        if variables_dir is None:
            self.variables_dir = get_variables_dir(repo_path=self.repo_path)
        else:
            self.variables_dir = variables_dir
        self.storage = LocalStorage()
        # TODO: implement caching logic

    @classmethod
    def get_manager(
        cls,
        repo_path: Optional[str] = None,
        variables_dir: Optional[str] = None,
    ) -> 'VariableManager':
        manager_args = dict(
            repo_path=repo_path,
            variables_dir=variables_dir,
        )
        if variables_dir is not None and variables_dir.startswith(S3_PREFIX):
            return S3VariableManager(**manager_args)
        elif variables_dir is not None and variables_dir.startswith(GCS_PREFIX):
            return GCSVariableManager(**manager_args)
        else:
            return VariableManager(**manager_args)

    def add_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        data: Any,
        partition: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        clean_block_uuid: bool = True,
        clean_variable_uuid: bool = True,
        disable_variable_type_inference: bool = False,
        input_data_types: Optional[List[InputDataType]] = None,
        resource_usage: Optional[ResourceUsage] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List] = None,
    ) -> Variable:
        """
        Used by:
            block
            block/data_integration/utils
        """
        basic_iterable = False
        if not disable_variable_type_inference:
            variable_type, basic_iterable = infer_variable_type(
                data,
                repo_path=self.repo_path,
                variable_type=variable_type,
            )

        variable = Variable(
            clean_name(variable_uuid) if clean_variable_uuid else variable_uuid,
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            clean_block_uuid=clean_block_uuid,
            input_data_types=input_data_types,
            partition=partition,
            read_batch_settings=read_batch_settings,
            read_chunks=read_chunks,
            resource_usage=resource_usage,
            storage=self.storage,
            variable_type=variable_type,
            variables_dir=self.variables_dir,
            write_batch_settings=write_batch_settings,
            write_chunks=write_chunks,
        )

        if (
            write_batch_settings
            and write_batch_settings.mode
            and ExportWritePolicy.APPEND != write_batch_settings.mode
        ):
            # Delete data if it exists
            variable.delete()

        if (
            basic_iterable
            and MEMORY_MANAGER_V2
            and variable_type
            in [
                VariableType.DATAFRAME,
                VariableType.POLARS_DATAFRAME,
                VariableType.SERIES_PANDAS,
                VariableType.SERIES_POLARS,
            ]
        ):
            for idx, data_nested in enumerate(DataGenerator(data)):
                variable_nested = self.add_variable(
                    pipeline_uuid,
                    block_uuid,
                    os.path.join(str(variable_uuid), str(idx)),
                    data_nested,
                    clean_block_uuid=clean_block_uuid,
                    clean_variable_uuid=False,
                    input_data_types=input_data_types,
                    partition=partition,
                    read_batch_settings=read_batch_settings,
                    read_chunks=read_chunks,
                    resource_usage=resource_usage,
                    variable_type=variable_type,
                    write_batch_settings=write_batch_settings,
                    write_chunks=write_chunks,
                )
                if variable_nested.variable_type:
                    variable.variable_types.append(variable_nested.variable_type)

            variable.variable_type = VariableType.ITERABLE
            variable.write_metadata()
        else:
            variable.variable_type = variable_type
            variable.write_data(data)

        if is_debug():
            print(
                f'Variable {variable_uuid} ({variable_type or "no type"}) '
                f'for block {block_uuid} '
                f'in pipeline {pipeline_uuid} '
                f'stored in {variable.variable_path}'
            )

        return variable

    def add_variable_types(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        variable_types: List[VariableType],
        clean_block_uuid: bool = True,
        clean_variable_uuid: bool = True,
        partition: Optional[str] = None,
    ) -> None:
        variable = self.build_variable(
            pipeline_uuid,
            block_uuid,
            variable_uuid,
            clean_block_uuid=clean_block_uuid,
            clean_variable_uuid=clean_variable_uuid,
            partition=partition,
            variable_type=VariableType.ITERABLE,
        )
        variable.variable_types = variable_types
        variable.write_metadata()

    def build_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        partition: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        clean_block_uuid: bool = True,
        clean_variable_uuid: bool = True,
        input_data_types: Optional[List[InputDataType]] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List] = None,
    ) -> Variable:
        return Variable(
            clean_name(variable_uuid) if clean_variable_uuid else variable_uuid,
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
            clean_block_uuid=clean_block_uuid,
            read_batch_settings=read_batch_settings,
            read_chunks=read_chunks,
            input_data_types=input_data_types,
            variables_dir=self.variables_dir,
        )

    async def add_variable_async(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        data: Any,
        partition: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        clean_block_uuid: bool = True,
        input_data_types: Optional[List[InputDataType]] = None,
        resource_usage: Optional[ResourceUsage] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List] = None,
    ) -> None:
        """
        Used by:
            block
        """
        variable_type, _ = infer_variable_type(
            data,
            repo_path=self.repo_path,
            variable_type=variable_type,
        )

        variable = Variable(
            clean_name(variable_uuid),
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
            clean_block_uuid=clean_block_uuid,
            input_data_types=input_data_types,
            resource_usage=resource_usage,
            read_batch_settings=read_batch_settings,
            read_chunks=read_chunks,
            variables_dir=self.variables_dir,
            write_batch_settings=write_batch_settings,
            write_chunks=write_chunks,
        )

        # Delete data if it exists
        variable.delete()
        variable.variable_type = variable_type
        await variable.write_data_async(data)

    def clean_variables(self, pipeline_uuid: Optional[str] = None):
        from mage_ai.data_preparation.models.pipeline import Pipeline

        repo_config = get_repo_config()
        if repo_config.variables_retention_period is None:
            print('Variable retention period is not provided.')
            return

        retention_ds = str_to_timedelta(repo_config.variables_retention_period)
        if retention_ds is None:
            return

        min_partition = (datetime.utcnow() - retention_ds).strftime(format='%Y%m%dT%H%M%S')

        print(f'Clean variables before partition {min_partition}')
        if pipeline_uuid is None:
            pipeline_uuids = [
                d[0] if isinstance(d, tuple) else d
                for d in Pipeline.get_all_pipelines(self.repo_path)
            ]
        else:
            pipeline_uuids = [pipeline_uuid]

        for pipeline_uuid in pipeline_uuids:
            print(f'Removing cached variables from pipeline {pipeline_uuid}')
            pipeline_variable_path = os.path.join(
                self.pipeline_path(pipeline_uuid),
                VARIABLE_DIR,
            )
            dirs = self.storage.listdir(pipeline_variable_path)
            for dirname in dirs:
                if dirname.isdigit():
                    pipeline_schedule_vpath = os.path.join(pipeline_variable_path, dirname)
                    execution_partitions = self.storage.listdir(
                        pipeline_schedule_vpath,
                    )
                    for partition in execution_partitions:
                        if partition <= min_partition:
                            pipeline_partition_vpath = os.path.join(
                                pipeline_schedule_vpath,
                                partition,
                            )
                            print(f'Removing folder {pipeline_partition_vpath}')
                            self.storage.remove_dir(pipeline_partition_vpath)

    def delete_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        partition: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        clean_block_uuid: bool = True,
    ) -> None:
        Variable(
            variable_uuid,
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
            clean_block_uuid=clean_block_uuid,
            variables_dir=self.variables_dir,
        ).delete()

    def get_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        dataframe_analysis_keys: Optional[List[str]] = None,
        partition: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        raise_exception: bool = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
        spark: Optional[Any] = None,
        clean_block_uuid: bool = True,
        input_data_types: Optional[List[InputDataType]] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List] = None,
    ) -> Any:
        variable = self.get_variable_object(
            pipeline_uuid,
            block_uuid,
            variable_uuid,
            partition=partition,
            variable_type=variable_type,
            spark=spark,
            clean_block_uuid=clean_block_uuid,
            input_data_types=input_data_types,
            read_batch_settings=read_batch_settings,
            read_chunks=read_chunks,
            write_batch_settings=write_batch_settings,
            write_chunks=write_chunks,
        )
        return variable.read_data(
            dataframe_analysis_keys=dataframe_analysis_keys,
            raise_exception=raise_exception,
            sample=sample,
            sample_count=sample_count,
            spark=spark,
        )

    def get_variable_object(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: Optional[str] = None,
        partition: Optional[str] = None,
        variable_type: Optional[VariableType] = None,
        variable_types: Optional[List[VariableType]] = None,
        clean_block_uuid: bool = True,
        skip_check_variable_type: Optional[bool] = None,
        spark=None,
        input_data_types: Optional[List[InputDataType]] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List] = None,
    ) -> Variable:
        if variable_type == VariableType.DATAFRAME and spark is not None:
            variable_type = VariableType.SPARK_DATAFRAME

        if not variable_uuid:
            variable_uuid = get_first_data_output_variable_uuid(
                self.get_variables_by_block(pipeline_uuid, block_uuid, partition=partition)
            )
        if not variable_uuid:
            variable_uuid = 'output_0'

        return Variable(
            variable_uuid,
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            spark=spark,
            storage=self.storage,
            variable_type=variable_type,
            variable_types=variable_types,
            clean_block_uuid=clean_block_uuid,
            input_data_types=input_data_types,
            read_batch_settings=read_batch_settings,
            read_chunks=read_chunks,
            skip_check_variable_type=skip_check_variable_type,
            variables_dir=self.variables_dir,
            write_batch_settings=write_batch_settings,
            write_chunks=write_chunks,
        )

    def get_variables_by_pipeline(self, pipeline_uuid: str) -> Dict[str, List[str]]:
        from mage_ai.data_preparation.models.pipeline import Pipeline

        pipeline = Pipeline.get(pipeline_uuid, repo_path=self.repo_path)
        variable_dir_path = os.path.join(self.pipeline_path(pipeline_uuid), VARIABLE_DIR)
        if not self.storage.path_exists(variable_dir_path):
            return dict()
        block_dirs = self.storage.listdir(variable_dir_path)
        variables_by_block = dict()
        for d in block_dirs:
            if not pipeline.has_block(d) and d != 'global':
                continue
            block_variables_path = os.path.join(variable_dir_path, d)
            if not self.storage.isdir(block_variables_path):
                variables_by_block[d] = []
            else:
                variables = self.storage.listdir(os.path.join(variable_dir_path, d))
                variable_names = sorted([v.split('.')[0] for v in variables])
                variables_by_block[d] = [v for v in variable_names if v != '']
        return variables_by_block

    def get_variables_by_block(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        partition: Optional[str] = None,
        clean_block_uuid: bool = True,
        max_results: Optional[int] = None,
        output_variable_only: Optional[bool] = None,
    ) -> List[str]:
        variable_dir_path = os.path.join(
            self.pipeline_path(pipeline_uuid),
            VARIABLE_DIR,
            partition or '',
            clean_name(block_uuid) if clean_block_uuid else block_uuid,
        )
        if not self.storage.path_exists(variable_dir_path):
            return []

        opts = {}
        if max_results is not None:
            opts['max_results'] = max_results

        variable_uuids = self.storage.listdir(variable_dir_path, **opts)
        variable_uuids = [
            v
            for v in variable_uuids
            if v.split('.')[0] and (not output_variable_only or is_output_variable(v))
        ]

        def __sort_variables(text):
            number = re.findall('\\d+', text)
            if number:
                if len(number) == 1:
                    number.append(0)
                number = number[:2]
            else:
                number = to_ordinal_integers(text)[:2]
            return [int(i) for i in number]

        return sorted(variable_uuids, key=__sort_variables)

    def pipeline_path(self, pipeline_uuid: str) -> str:
        path = os.path.join(self.variables_dir, 'pipelines', pipeline_uuid)
        if type(self.storage) is LocalStorage:
            if not self.storage.path_exists(path):
                self.storage.makedirs(path, exist_ok=True)
        return path


class S3VariableManager(VariableManager):
    def __init__(self, repo_path=None, variables_dir=None):
        super().__init__(repo_path=repo_path, variables_dir=variables_dir)
        from mage_ai.data_preparation.storage.s3_storage import S3Storage

        self.storage = S3Storage(dirpath=variables_dir)


class GCSVariableManager(VariableManager):
    def __init__(self, repo_path=None, variables_dir=None):
        super().__init__(repo_path=repo_path, variables_dir=variables_dir)
        from mage_ai.data_preparation.storage.gcs_storage import GCSStorage

        self.storage = GCSStorage(dirpath=variables_dir)


def clean_variables(pipeline_uuid: str = None):
    variables_dir = get_variables_dir()
    VariableManager(variables_dir=variables_dir).clean_variables(pipeline_uuid=pipeline_uuid)


def get_global_variables(
    pipeline_uuid: str,
    pipeline=None,
    context_data: Dict = None,
    repo_path: str = None,
    variables_dir: str = None,
) -> Dict[str, Any]:
    """
    Get all global variables. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline = pipeline or Pipeline.get(
        pipeline_uuid,
        all_projects=project_platform_activated(),
        context_data=context_data,
        repo_path=repo_path,
    )
    if pipeline.variables is not None:
        global_variables = pipeline.variables
    else:
        variables_dir = variables_dir or get_variables_dir(repo_path=repo_path)
        variable_manager = VariableManager(
            repo_path=repo_path, variables_dir=variables_dir
        )
        variables = variable_manager.get_variables_by_block(
            pipeline_uuid,
            'global',
        )
        global_variables = dict()
        for variable in variables:
            global_variables[variable] = variable_manager.get_variable(
                pipeline_uuid,
                'global',
                variable,
            )

    return global_variables


def get_global_variable(
    pipeline_uuid: str,
    key: str,
) -> Any:
    """
    Get global variable by key. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline = Pipeline.get(
        pipeline_uuid,
        all_projects=project_platform_activated(),
    )
    if pipeline.variables is not None:
        return pipeline.variables.get(key)
    else:
        return VariableManager(variables_dir=get_variables_dir()).get_variable(
            pipeline_uuid,
            'global',
            key,
        )


def get_variable(pipeline_uuid: str, block_uuid: str, key: str, **kwargs) -> Any:
    """
    Set block intermediate variable by key.
    Block intermediate variables are stored in variables dir.
    """
    return VariableManager(variables_dir=get_variables_dir()).get_variable(
        pipeline_uuid,
        block_uuid,
        key,
        **kwargs,
    )


def set_global_variable(
    pipeline_uuid: str,
    key: str,
    value: Any,
    repo_path: str = None,
) -> None:
    """
    Set global variable by key. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline = Pipeline.get(pipeline_uuid)
    pipeline = Pipeline.get(pipeline_uuid, repo_path=repo_path)

    if pipeline.variables is None:
        pipeline.variables = get_global_variables(pipeline_uuid)
    pipeline.update_global_variable(key, value)


def delete_global_variable(
    pipeline_uuid: str,
    key: str,
    repo_path: str = None,
) -> None:
    """
    Delete global variable by key. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline = Pipeline.get(pipeline_uuid)
    pipeline = Pipeline.get(pipeline_uuid, repo_path=repo_path)
    if pipeline.variables is not None:
        pipeline.delete_global_variable(key)
    else:
        VariableManager(
            variables_dir=get_variables_dir(),
        ).delete_variable(pipeline_uuid, 'global', key)
