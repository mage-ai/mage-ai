import os
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd

from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.variable import (
    VARIABLE_DIR,
    Variable,
    VariableType,
)
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path, get_variables_dir
from mage_ai.shared.constants import GCS_PREFIX, S3_PREFIX
from mage_ai.shared.dates import str_to_timedelta
from mage_ai.shared.environments import is_debug
from mage_ai.shared.utils import clean_name


class VariableManager:
    def __init__(self, repo_path=None, variables_dir=None):
        self.repo_path = repo_path or get_repo_path()
        if variables_dir is None:
            self.variables_dir = self.repo_path
        else:
            self.variables_dir = variables_dir
        self.storage = LocalStorage()
        # TODO: implement caching logic

    @classmethod
    def get_manager(
        self,
        repo_path: str = None,
        variables_dir: str = None,
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
        partition: str = None,
        variable_type: VariableType = None,
        clean_block_uuid: bool = True,
    ) -> None:
        if type(data) is pd.DataFrame:
            variable_type = VariableType.DATAFRAME
        elif is_spark_dataframe(data):
            variable_type = VariableType.SPARK_DATAFRAME
        elif is_geo_dataframe(data):
            variable_type = VariableType.GEO_DATAFRAME
        variable = Variable(
            clean_name(variable_uuid),
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
            clean_block_uuid=clean_block_uuid,
        )

        # Delete data if it exists
        variable.delete()
        variable.variable_type = variable_type
        variable.write_data(data)
        if is_debug():
            print(
                f'Variable {variable_uuid} ({variable_type or "no type"}) for block {block_uuid} '
                f'in pipeline {pipeline_uuid} '
                f'stored in {variable.variable_path}'
            )

    def build_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        partition: str = None,
        variable_type: VariableType = None,
        clean_variable_uuid: bool = True,
    ) -> Variable:
        return Variable(
            clean_name(variable_uuid) if clean_variable_uuid else variable_uuid,
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
        )

    async def add_variable_async(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        data: Any,
        partition: str = None,
        variable_type: VariableType = None,
        clean_block_uuid: bool = True,
    ) -> None:
        if type(data) is pd.DataFrame:
            variable_type = VariableType.DATAFRAME
        elif is_spark_dataframe(data):
            variable_type = VariableType.SPARK_DATAFRAME
        elif is_geo_dataframe(data):
            variable_type = VariableType.GEO_DATAFRAME
        variable = Variable(
            clean_name(variable_uuid),
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
            clean_block_uuid=clean_block_uuid,
        )
        # Delete data if it exists
        variable.delete()
        variable.variable_type = variable_type
        await variable.write_data_async(data)

    def clean_variables(
        self,
        pipeline_uuid: str = None
    ):
        from mage_ai.data_preparation.models.pipeline import Pipeline

        repo_config = get_repo_config()
        if not repo_config.variables_retention_period:
            print('Variable retention period is not provided.')
            return
        min_partition = (datetime.utcnow() -
                         str_to_timedelta(repo_config.variables_retention_period)).strftime(
                            format='%Y%m%dT%H%M%S')
        print(f'Clean variables before partition {min_partition}')
        if pipeline_uuid is None:
            pipeline_uuids = Pipeline.get_all_pipelines(self.repo_path)
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
        partition: str = None,
        variable_type: VariableType = None,
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
        ).delete()

    def get_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        dataframe_analysis_keys: List[str] = None,
        partition: str = None,
        variable_type: VariableType = None,
        raise_exception: bool = False,
        sample: bool = False,
        sample_count: int = None,
        spark=None,
        clean_block_uuid: bool = True,
    ) -> Any:
        variable = self.get_variable_object(
            pipeline_uuid,
            block_uuid,
            variable_uuid,
            partition=partition,
            variable_type=variable_type,
            spark=spark,
            clean_block_uuid=clean_block_uuid,
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
        variable_uuid: str,
        partition: str = None,
        variable_type: VariableType = None,
        clean_block_uuid: bool = True,
        spark=None,
    ) -> Variable:
        if variable_type == VariableType.DATAFRAME and spark is not None:
            variable_type = VariableType.SPARK_DATAFRAME
        return Variable(
            variable_uuid,
            self.pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            spark=spark,
            storage=self.storage,
            variable_type=variable_type,
            clean_block_uuid=clean_block_uuid,
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
        partition: str = None,
        clean_block_uuid: bool = True,
    ) -> List[str]:
        variable_dir_path = os.path.join(
            self.pipeline_path(pipeline_uuid),
            VARIABLE_DIR,
            partition or '',
            clean_name(block_uuid) if clean_block_uuid else block_uuid,
        )
        if not self.storage.path_exists(variable_dir_path):
            return []
        variables = self.storage.listdir(variable_dir_path)
        return sorted([v.split('.')[0] for v in variables])

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


def clean_variables(
    pipeline_uuid: str = None
):
    variables_dir = get_variables_dir()
    VariableManager(variables_dir=variables_dir).clean_variables(pipeline_uuid=pipeline_uuid)


def get_global_variables(
    pipeline_uuid: str,
    pipeline=None,
) -> Dict[str, Any]:
    """
    Get all global variables. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline = pipeline or Pipeline.get(pipeline_uuid, all_projects=project_platform_activated())
    if pipeline.variables is not None:
        global_variables = pipeline.variables
    else:
        variables_dir = get_variables_dir()
        variables = VariableManager(variables_dir=variables_dir).get_variables_by_block(
            pipeline_uuid,
            'global',
        )
        global_variables = dict()
        for variable in variables:
            global_variables[variable] = get_global_variable(pipeline_uuid, variable)

    return global_variables


def get_global_variable(
    pipeline_uuid: str,
    key: str,
) -> Any:
    """
    Get global variable by key. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline = Pipeline.get(pipeline_uuid, all_projects=project_platform_activated())
    if pipeline.variables is not None:
        return pipeline.variables.get(key)
    else:
        return VariableManager(variables_dir=get_variables_dir()).get_variable(
            pipeline_uuid,
            'global',
            key,
        )


def get_variable(
    pipeline_uuid: str,
    block_uuid: str,
    key: str,
    **kwargs
) -> Any:
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
) -> None:
    """
    Set global variable by key. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline
    pipeline = Pipeline.get(pipeline_uuid)

    if pipeline.variables is None:
        pipeline.variables = get_global_variables(pipeline_uuid)
    pipeline.update_global_variable(key, value)


def delete_global_variable(
    pipeline_uuid: str,
    key: str,
) -> None:
    """
    Delete global variable by key. Global variables are stored together with project's code.
    """
    from mage_ai.data_preparation.models.pipeline import Pipeline
    pipeline = Pipeline.get(pipeline_uuid)
    if pipeline.variables is not None:
        pipeline.delete_global_variable(key)
    else:
        VariableManager(
            variables_dir=get_variables_dir(),
        ).delete_variable(pipeline_uuid, 'global', key)
