from mage_ai.data_cleaner.shared.utils import (
    is_geo_dataframe,
    is_spark_dataframe,
)
from mage_ai.data_preparation.models.variable import Variable, VariableType, VARIABLE_DIR
from mage_ai.data_preparation.repo_manager import get_repo_path
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
        # TODO: implement caching logic

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
            variable_uuid,
            self.__pipeline_path(pipeline_uuid),
            block_uuid,
            partition=partition,
            variable_type=variable_type,
        )
        # Delete data if it exists
        variable.delete()
        variable.variable_type = variable_type
        variable.write_data(data)

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
            variable_type=variable_type,
        ).delete()

    def get_variable(
        self,
        pipeline_uuid: str,
        block_uuid: str,
        variable_uuid: str,
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
        return variable.read_data(sample=sample, sample_count=sample_count, spark=spark)

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
            variable_type=variable_type,
        )

    def get_variables_by_pipeline(self, pipeline_uuid: str) -> Dict[str, List[str]]:
        from mage_ai.data_preparation.models.pipeline import Pipeline
        pipeline = Pipeline.get(pipeline_uuid, repo_path=self.repo_path)
        variable_dir_path = os.path.join(self.__pipeline_path(pipeline_uuid), VARIABLE_DIR)
        if not os.path.exists(variable_dir_path):
            return dict()
        block_dirs = os.listdir(variable_dir_path)
        variables_by_block = dict()
        for d in block_dirs:
            if not pipeline.has_block(d) and d != 'global':
                continue
            block_variables_path = os.path.join(variable_dir_path, d)
            if not os.path.isdir(block_variables_path):
                variables_by_block[d] = []
            else:
                variables = os.listdir(os.path.join(variable_dir_path, d))
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
        if not os.path.exists(variable_dir_path):
            return []
        variables = os.listdir(variable_dir_path)
        return sorted([v.split('.')[0] for v in variables])

    def __pipeline_path(self, pipeline_uuid: str) -> str:
        path = os.path.join(self.variables_dir, 'pipelines', pipeline_uuid)
        if not os.path.exists(path):
            os.makedirs(path, exist_ok=True)
        return path


def get_global_variables(
    pipeline_uuid: str,
    repo_path: str = None,
) -> Dict[str, Any]:
    if repo_path is None:
        repo_path = get_repo_path()
    variables = VariableManager(repo_path).get_variables_by_block(pipeline_uuid, 'global')
    global_variables = dict()
    for variable in variables:
        global_variables[variable] = get_global_variable(pipeline_uuid, variable, repo_path)

    return global_variables


def get_global_variable(
    pipeline_uuid: str,
    key: str,
    repo_path: str = None,
) -> Any:
    if repo_path is None:
        repo_path = get_repo_path()
    return VariableManager(repo_path).get_variable(pipeline_uuid, 'global', key)


def get_variable(
    pipeline_uuid: str,
    block_uuid: str,
    key: str,
    **kwargs
) -> Any:
    return VariableManager(get_repo_path()).get_variable(
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
    if repo_path is None:
        repo_path = get_repo_path()
    VariableManager(repo_path).add_variable(pipeline_uuid, 'global', key, value)


def delete_global_variable(
    pipeline_uuid: str,
    key: str,
    repo_path: str = None,
) -> None:
    if repo_path is None:
        repo_path = get_repo_path()
    VariableManager(repo_path).delete_variable(pipeline_uuid, 'global', key)
