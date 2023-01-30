from mage_ai.data_cleaner.shared.utils import (
    is_geo_dataframe,
    is_spark_dataframe,
)
from mage_ai.data_preparation.models.variable import (
    Variable,
    VariableType,
    VARIABLE_DIR,
)
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.data_preparation.repo_manager import (
    get_repo_path,
    get_variables_dir,
)
from mage_ai.shared.constants import S3_PREFIX
from mage_ai.shared.utils import clean_name
from typing import Any, Dict, List
import os
import pandas as pd


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
        else:
            return VariableManager(**manager_args)

    def add_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        data: Any,
        partition: str = None,
        variable_type: VariableType = None
    ) -> None:
        if type(data) is pd.DataFrame:
            variable_type = VariableType.DATAFRAME
        elif is_spark_dataframe(data):
            variable_type = VariableType.SPARK_DATAFRAME
        elif is_geo_dataframe(data):
            variable_type = VariableType.GEO_DATAFRAME
        variable = Variable(
            clean_name(variable_uuid),
            self.__pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
        )
        # Delete data if it exists
        variable.delete()
        variable.variable_type = variable_type
        variable.write_data(data)

    async def add_variable_async(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        data: Any,
        partition: str = None,
        variable_type: VariableType = None
    ) -> None:
        if type(data) is pd.DataFrame:
            variable_type = VariableType.DATAFRAME
        elif is_spark_dataframe(data):
            variable_type = VariableType.SPARK_DATAFRAME
        elif is_geo_dataframe(data):
            variable_type = VariableType.GEO_DATAFRAME
        variable = Variable(
            clean_name(variable_uuid),
            self.__pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
        )
        # Delete data if it exists
        variable.delete()
        variable.variable_type = variable_type
        await variable.write_data_async(data)

    def delete_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        partition: str = None,
        variable_type: VariableType = None,
    ) -> None:
        Variable(
            variable_uuid,
            self.__pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
        ).delete()

    def get_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
        dataframe_analysis_keys: List[str] = None,
        partition: str = None,
        variable_type: VariableType = None,
        sample: bool = False,
        sample_count: int = None,
        spark=None,
    ) -> Any:
        variable = self.get_variable_object(
            pipeline_uuid,
            block_uuid,
            variable_uuid,
            partition=partition,
            variable_type=variable_type,
            spark=spark,
        )
        return variable.read_data(
            dataframe_analysis_keys=dataframe_analysis_keys,
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
        spark=None,
    ) -> Variable:
        if variable_type == VariableType.DATAFRAME and spark is not None:
            variable_type = VariableType.SPARK_DATAFRAME
        return Variable(
            variable_uuid,
            self.__pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            storage=self.storage,
            variable_type=variable_type,
        )

    def get_variables_by_pipeline(self, pipeline_uuid: str) -> Dict[str, List[str]]:
        from mage_ai.data_preparation.models.pipeline import Pipeline
        pipeline = Pipeline.get(pipeline_uuid, repo_path=self.repo_path)
        variable_dir_path = os.path.join(self.__pipeline_path(pipeline_uuid), VARIABLE_DIR)
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
    ) -> List[str]:
        variable_dir_path = os.path.join(
            self.__pipeline_path(pipeline_uuid),
            VARIABLE_DIR,
            partition or '',
            block_uuid,
        )
        if not self.storage.path_exists(variable_dir_path):
            return []
        variables = self.storage.listdir(variable_dir_path)
        return sorted([v.split('.')[0] for v in variables])

    def __pipeline_path(self, pipeline_uuid: str) -> str:
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


def get_global_variables(
    pipeline_uuid: str,
) -> Dict[str, Any]:
    """
    Get all global variables. Global variables are stored together with project's code.
    """
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
    VariableManager(variables_dir=get_variables_dir()).add_variable(
        pipeline_uuid,
        'global',
        key,
        value,
    )


def delete_global_variable(
    pipeline_uuid: str,
    key: str,
) -> None:
    """
    Delete global variable by key. Global variables are stored together with project's code.
    """
    VariableManager(variables_dir=get_variables_dir()).delete_variable(pipeline_uuid, 'global', key)
