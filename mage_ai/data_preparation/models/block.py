from contextlib import redirect_stdout
from inspect import Parameter, signature
from io import StringIO
from mage_ai.data_cleaner.data_cleaner import clean as clean_data
from mage_ai.data_cleaner.shared.utils import clean_name
from mage_ai.data_preparation.models.constants import (
    BlockStatus,
    BlockType,
    CUSTOM_EXECUTION_BLOCK_TYPES,
    DATAFRAME_ANALYSIS_MAX_ROWS,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.templates.template import load_template
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.logger import VerboseFunctionExec
import os
import pandas as pd
import sys
import traceback


class Block:
    def __init__(
        self,
        name,
        uuid,
        block_type,
        status=BlockStatus.NOT_EXECUTED,
        pipeline=None,
    ):
        self.name = name or uuid
        self.uuid = uuid
        self.type = block_type
        self.status = status
        self.pipeline = pipeline
        self.upstream_blocks = []
        self.downstream_blocks = []

    @property
    def input_variables(self):
        return {b.uuid: b.output_variables.keys() for b in self.upstream_blocks}

    @property
    def output_variables(self):
        """
        Return output variables in dictionary.
        The key is the variable name, and the value is variable data type.
        """
        return dict()

    @property
    def upstream_block_uuids(self):
        return [b.uuid for b in self.upstream_blocks]

    @property
    def downstream_block_uuids(self):
        return [b.uuid for b in self.downstream_blocks]

    @property
    def file_path(self):
        repo_path = self.pipeline.repo_path if self.pipeline is not None else get_repo_path()
        return os.path.join(
            repo_path or os.getcwd(),
            f'{self.type}s/{self.uuid}.py',
        )

    @property
    def file(self):
        return File.from_path(self.file_path)

    @classmethod
    def create(
        self,
        name,
        block_type,
        repo_path,
        pipeline=None,
        priority=None,
        upstream_block_uuids=None,
        config=None,
    ):
        """
        1. Create a new folder for block_type if not exist
        2. Create a new python file with code template
        """
        if upstream_block_uuids is None:
            upstream_block_uuids = []
        if config is None:
            config = {}

        uuid = clean_name(name)
        block_dir_path = os.path.join(repo_path, f'{block_type}s')
        if not os.path.exists(block_dir_path):
            os.mkdir(block_dir_path)
            with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
                pass

        file_path = os.path.join(block_dir_path, f'{uuid}.py')
        if os.path.exists(file_path):
            if pipeline is not None and pipeline.has_block(uuid):
                raise Exception(f'Block {uuid} already exists. Please use a different name.')
        else:
            load_template(block_type, config, file_path)

        block = BLOCK_TYPE_TO_CLASS[block_type](name, uuid, block_type, pipeline=pipeline)
        if pipeline is not None:
            pipeline.add_block(block, upstream_block_uuids, priority=priority)
        return block

    @classmethod
    def get_all_blocks(self, repo_path):
        block_uuids = dict()
        for t in BlockType:
            block_dir = os.path.join(repo_path, f'{t.value}s')
            if not os.path.exists(block_dir):
                continue
            block_uuids[t.value] = []
            for f in os.listdir(block_dir):
                if f.endswith('.py') and f != '__init__.py':
                    block_uuids[t.value].append(f.split('.')[0])
        return block_uuids

    @classmethod
    def get_block(self, name, uuid, block_type, status=BlockStatus.NOT_EXECUTED, pipeline=None):
        block_class = BLOCK_TYPE_TO_CLASS.get(block_type, Block)
        return block_class(name, uuid, block_type, status=status, pipeline=pipeline)

    def delete(self):
        """
        1. If pipeline is not None, delete the block from the pipeline but not delete the block
        file.
        2. If pipeline is None, check whether block is used in any pipelines. If block is being
        used, throw error. Otherwise, delete the block files.
        """
        from mage_ai.data_preparation.models.pipeline import Pipeline

        if self.pipeline is not None:
            self.pipeline.delete_block(self)
            # For block_type SCRATCHPAD, also delete the file if possible
            if self.type == BlockType.SCRATCHPAD:
                pipelines = Pipeline.get_pipelines_by_block(self)
                if len(pipelines) == 0:
                    os.remove(self.file_path)
            return
        # If pipeline is not specified, delete the block from all pipelines and delete the file.
        pipelines = Pipeline.get_pipelines_by_block(self)
        for p in pipelines:
            if not p.block_deletable(self):
                raise Exception(
                    f'Block {self.uuid} has downstream dependencies in pipeline {p.uuid}. '
                    'Please remove the dependencies before deleting the block.'
                )
        for p in pipelines:
            p.delete_block(p.get_block(self.uuid))
        os.remove(self.file_path)

    def execute_sync(self, analyze_outputs=True, custom_code=None, redirect_outputs=False):
        try:
            output = self.execute_block(custom_code=custom_code, redirect_outputs=redirect_outputs)
            block_output = output['output']
            self.__verify_outputs(block_output)
            variable_mapping = dict(zip(self.output_variables.keys(), block_output))
            self.__store_variables(variable_mapping)
            self.status = BlockStatus.EXECUTED
            if analyze_outputs:
                self.__analyze_outputs(variable_mapping)
        except Exception as err:
            self.status = BlockStatus.FAILED
            raise Exception(f'Exception encountered in block {self.uuid}') from err
        finally:
            self.__update_pipeline_block()
        return output

    async def execute(self, analyze_outputs=True, custom_code=None, redirect_outputs=False):
        with VerboseFunctionExec(f'Executing {self.type} block: {self.uuid}'):
            return self.execute_sync(
                analyze_outputs=analyze_outputs,
                custom_code=custom_code,
                redirect_outputs=redirect_outputs,
            )

    def __validate_execution(self, decorated_functions, input_vars):
        not_executed_upstream_blocks = list(
            filter(lambda b: b.status == BlockStatus.NOT_EXECUTED, self.upstream_blocks)
        )
        if len(not_executed_upstream_blocks) > 0:
            raise Exception(
                f"Block {self.uuid}'s upstream blocks have not been executed yet. "
                f'Please run upstream blocks {list(map(lambda b: b.uuid, not_executed_upstream_blocks))} '
                'before running the current block.'
            )

        if self.type not in CUSTOM_EXECUTION_BLOCK_TYPES:
            return None

        if len(decorated_functions) == 0:
            raise Exception(
                f'Block {self.uuid} does not have any decorated functions. '
                f'Make sure that a function in the block is decorated with @{self.type}.'
            )
        else:
            block_function = decorated_functions[0]
            sig = signature(block_function)

            num_args = sum(arg.kind != Parameter.VAR_POSITIONAL for arg in sig.parameters.values())
            num_inputs = len(input_vars)
            num_upstream = len(self.upstream_block_uuids)

            has_var_args = num_args != len(sig.parameters)

            if num_args > num_inputs:
                if num_upstream < num_args:
                    raise Exception(
                        f'Block {self.uuid} may be missing upstream dependencies. '
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} arguments, '
                        f'but only received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number of arguments.'
                    )
                else:
                    raise Exception(
                        f'Block {self.uuid} is missing input arguments. '
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} arguments, '
                        f'but only received {num_inputs}. '
                        f'Double check the @{self.type} method declaration has the correct number of arguments '
                        f'and that the upstream blocks have been executed.'
                    )
            elif num_args < num_inputs and not has_var_args:
                if num_upstream > num_args:
                    raise Exception(
                        f'Block {self.uuid} may have too many upstream dependencies. '
                        f'It expected to have {num_args} arguments, but received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number of arguments.'
                    )
                else:
                    raise Exception(
                        f'Block {self.uuid} has too many input arguments. '
                        f'It expected to have {num_args} arguments, but received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number of arguments.'
                    )

            return block_function

    def execute_block(self, custom_code=None, redirect_outputs=False):
        def block_decorator(decorated_functions):
            def custom_code(function):
                decorated_functions.append(function)
                return function

            return custom_code

        input_vars = []
        if self.pipeline is not None:
            repo_path = self.pipeline.repo_path
            for upstream_block_uuid, vars in self.input_variables.items():
                input_vars += [
                    VariableManager(repo_path).get_variable(
                        self.pipeline.uuid,
                        upstream_block_uuid,
                        var,
                    )
                    for var in vars
                ]
        outputs = []
        decorated_functions = []
        stdout = StringIO() if redirect_outputs else sys.stdout
        with redirect_stdout(stdout):
            if custom_code is not None:
                exec(custom_code, {self.type: block_decorator(decorated_functions)})
            elif os.path.exists(self.file_path):
                with open(self.file_path) as file:
                    exec(file.read(), {self.type: block_decorator(decorated_functions)})
            block_function = self.__validate_execution(decorated_functions, input_vars)
            if block_function is not None:
                outputs = block_function(*input_vars)
                if outputs is None:
                    outputs = []
                if type(outputs) is not list:
                    outputs = [outputs]

        output_message = dict(output=outputs)
        if redirect_outputs:
            output_message['stdout'] = stdout.getvalue()
        else:
            output_message['stdout'] = ''

        return output_message

    def exists(self):
        return os.path.exists(self.file_path)

    def get_analyses(self):
        if self.status == BlockStatus.NOT_EXECUTED:
            return []
        if len(self.output_variables) == 0:
            return []
        analyses = []
        variable_manager = VariableManager(self.pipeline.repo_path)
        for v, vtype in self.output_variables.items():
            if vtype is not pd.DataFrame:
                continue
            data = variable_manager.get_variable(
                self.pipeline.uuid,
                self.uuid,
                v,
                variable_type=VariableType.DATAFRAME_ANALYSIS,
            )
            data['variable_uuid'] = v
            analyses.append(data)
        return analyses

    def get_outputs(self, sample_count=None):
        if self.pipeline is None:
            return
        if self.type != BlockType.SCRATCHPAD:
            if self.status == BlockStatus.NOT_EXECUTED:
                return []
            if len(self.output_variables) == 0:
                return []
        outputs = []
        variable_manager = VariableManager(self.pipeline.repo_path)
        if self.type == BlockType.SCRATCHPAD:
            # For scratchpad blocks, return all variables in block variable folder
            all_variables = variable_manager.get_variables_by_block(self.pipeline.uuid, self.uuid)
        else:
            # For non-scratchpad blocks, return all variables in output_variables
            all_variables = self.output_variables.keys()
        for v in all_variables:
            data = variable_manager.get_variable(
                self.pipeline.uuid,
                self.uuid,
                v,
                sample=True,
                sample_count=sample_count,
            )
            if type(data) is pd.DataFrame:
                data = dict(
                    sample_data=dict(
                        columns=data.columns.tolist(),
                        rows=data.to_numpy().tolist(),
                    ),
                    type=DataType.TABLE,
                    variable_uuid=v,
                )
            elif type(data) is str:
                data = dict(
                    text_data=data,
                    type=DataType.TEXT,
                    variable_uuid=v,
                )
            outputs.append(data)
        return outputs

    def save_outputs(self, outputs, override=False):
        variable_mapping = dict()
        for o in outputs:
            if all(k in o for k in ['variable_uuid', 'text_data']):
                variable_mapping[o['variable_uuid']] = o['text_data']
        self.__store_variables(variable_mapping, override=override)

    def to_dict(self, include_content=False, include_outputs=False, sample_count=None):
        data = dict(
            name=self.name,
            uuid=self.uuid,
            type=self.type.value if type(self.type) is not str else self.type,
            status=self.status.value if type(self.status) is not str else self.status,
            upstream_blocks=self.upstream_block_uuids,
            downstream_blocks=self.downstream_block_uuids,
        )
        if include_content:
            data['content'] = self.file.content()
        if include_outputs:
            data['outputs'] = self.get_outputs(sample_count=sample_count)
        return data

    def update(self, data):
        if 'name' in data and data['name'] != self.name:
            self.__update_name(data['name'])
        if 'upstream_blocks' in data and set(data['upstream_blocks']) != set(
            self.upstream_block_uuids
        ):
            self.__update_upstream_blocks(data['upstream_blocks'])
        return self

    def update_content(self, content):
        self.file.update_content(content)
        return self

    def __analyze_outputs(self, variable_mapping):
        if self.pipeline is None:
            return
        for uuid, data in variable_mapping.items():
            vtype = self.output_variables[uuid]
            if vtype is pd.DataFrame:
                if data.shape[0] > DATAFRAME_ANALYSIS_MAX_ROWS:
                    data_for_analysis = data.sample(DATAFRAME_ANALYSIS_MAX_ROWS).reset_index(
                        drop=True,
                    )
                else:
                    data_for_analysis = data.reset_index(drop=True)
                try:
                    analysis = clean_data(
                        data_for_analysis,
                        transform=False,
                        verbose=False,
                    )
                    VariableManager(self.pipeline.repo_path).add_variable(
                        self.pipeline.uuid,
                        self.uuid,
                        uuid,
                        dict(
                            metadata=dict(column_types=analysis['column_types']),
                            statistics=analysis['statistics'],
                            insights=analysis['insights'],
                            suggestions=analysis['suggestions'],
                        ),
                        variable_type=VariableType.DATAFRAME_ANALYSIS,
                    )
                except Exception:
                    print('\nFailed to analyze dataframe:')
                    print(traceback.format_exc())

    def __store_variables(self, variable_mapping, override=False):
        if self.pipeline is None:
            return
        variable_manager = VariableManager(self.pipeline.repo_path)
        all_variables = variable_manager.get_variables_by_block(self.pipeline.uuid, self.uuid)
        removed_variables = [v for v in all_variables if v not in variable_mapping.keys()]
        for uuid, data in variable_mapping.items():
            variable_manager.add_variable(
                self.pipeline.uuid,
                self.uuid,
                uuid,
                data,
            )
        if override:
            for uuid in removed_variables:
                variable_manager.delete_variable(
                    self.pipeline.uuid,
                    self.uuid,
                    uuid,
                )

    # TODO: Update all pipelines that use this block
    def __update_name(self, name):
        """
        1. Rename block file
        2. Update the folder of variable
        3. Update upstream and downstream relationships
        """
        old_uuid = self.uuid
        old_file_path = self.file_path
        new_uuid = clean_name(name)
        self.name = name
        self.uuid = new_uuid
        new_file_path = self.file_path
        if self.pipeline is not None:
            if self.pipeline.has_block(new_uuid):
                raise Exception(
                    f'Block {new_uuid} already exists in pipeline. Please use a different name.'
                )
        if os.path.exists(new_file_path):
            raise Exception(f'Block {new_uuid} already exists. Please use a different name.')
        os.rename(old_file_path, new_file_path)
        if self.pipeline is not None:
            self.pipeline.update_block_uuid(self, old_uuid)

    def __update_pipeline_block(self):
        if self.pipeline is None:
            return
        self.pipeline.update_block(self)

    def __update_upstream_blocks(self, upstream_blocks):
        if self.pipeline is None:
            return
        self.pipeline.update_block(self, upstream_block_uuids=upstream_blocks)

    def __verify_outputs(self, outputs):
        if len(outputs) != len(self.output_variables):
            raise Exception(
                f'Validation error for block {self.uuid}: '
                f'the number of output variables does not match the block type: {self.type} ',
            )
        variable_names = list(self.output_variables.keys())
        variable_dtypes = list(self.output_variables.values())
        for idx, output in enumerate(outputs):
            actual_dtype = type(output)
            expected_dtype = variable_dtypes[idx]
            if type(output) is not variable_dtypes[idx]:
                raise Exception(
                    f'Validation error for block {self.uuid}: '
                    f'the variable {variable_names[idx]} should be {expected_dtype} type, '
                    f'but {actual_dtype} type is returned',
                )


class DataLoaderBlock(Block):
    @property
    def output_variables(self):
        return dict(df=pd.DataFrame)


class DataExporterBlock(Block):
    @property
    def output_variables(self):
        return dict()


class TransformerBlock(Block):
    @property
    def output_variables(self):
        return dict(df=pd.DataFrame)


BLOCK_TYPE_TO_CLASS = {
    BlockType.DATA_EXPORTER: DataExporterBlock,
    BlockType.DATA_LOADER: DataLoaderBlock,
    BlockType.SCRATCHPAD: Block,
    BlockType.TRANSFORMER: TransformerBlock,
}
