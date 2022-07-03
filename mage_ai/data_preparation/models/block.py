from mage_ai.data_cleaner.data_cleaner import clean as clean_data
from mage_ai.data_cleaner.shared.utils import clean_name
from mage_ai.data_preparation.models.constants import BlockStatus, BlockType
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.templates.template import load_template
from mage_ai.data_preparation.variable_manager import VariableManager
import os
import pandas as pd


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
        repo_path = self.pipeline.repo_path if self.pipeline is not None else None
        return os.path.join(
            repo_path or os.getcwd(),
            f'{self.type}s/{self.uuid}.py',
        )

    @classmethod
    def create(
        self, name, block_type, repo_path, pipeline=None, upstream_block_uuids=None, config=None
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
            pipeline.add_block(block, upstream_block_uuids)
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

    async def execute(self, custom_code=None):
        outputs = await self.execute_block(custom_code)
        self.__verify_outputs(outputs)
        variable_mapping = dict(zip(self.output_variables.keys(), outputs))
        self.__store_variables(variable_mapping)
        self.status = BlockStatus.EXECUTED
        self.__update_pipeline_block()
        self.__analyze_outputs(variable_mapping)
        return outputs

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

    def get_outputs(self):
        if self.status == BlockStatus.NOT_EXECUTED:
            return []
        if len(self.output_variables) == 0:
            return []
        outputs = []
        variable_manager = VariableManager(self.pipeline.repo_path)
        for v, _ in self.output_variables.items():
            data = variable_manager.get_variable(
                self.pipeline.uuid,
                self.uuid,
                v,
                sample=True,
            )
            if type(data) is pd.DataFrame:
                data = dict(
                    variable_uuid=v,
                    sample_data=dict(
                        columns=data.columns.tolist(),
                        rows=data.to_numpy().tolist(),
                    ),
                )
            outputs.append(data)
        return outputs

    def to_dict(self, include_outputs=False):
        data = dict(
            name=self.name,
            uuid=self.uuid,
            type=self.type.value if type(self.type) is not str else self.type,
            status=self.status.value if type(self.status) is not str else self.status,
            upstream_blocks=self.upstream_block_uuids,
            downstream_blocks=self.downstream_block_uuids,
        )
        if include_outputs:
            data['outputs'] = self.get_outputs()
        return data

    def update(self, data):
        if 'name' in data and data['name'] != self.name:
            self.__update_name(data['name'])
        if 'upstream_blocks' in data and set(data['upstream_blocks']) != set(
            self.upstream_block_uuids
        ):
            self.__update_upstream_blocks(data['upstream_blocks'])
        return self

    async def execute_block(self, custom_code=None):
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
        if custom_code is not None:
            exec(custom_code, {self.type: block_decorator(decorated_functions)})
        elif os.path.exists(self.file_path):
            with open(self.file_path) as file:
                exec(file.read(), {self.type: block_decorator(decorated_functions)})
        if len(decorated_functions) > 0:
            outputs = decorated_functions[0](*input_vars)
            if outputs is None:
                outputs = []
            if type(outputs) is not list:
                outputs = [outputs]
        return outputs

    def __analyze_outputs(self, variable_mapping):
        if self.pipeline is None:
            return
        for uuid, data in variable_mapping.items():
            vtype = self.output_variables[uuid]
            if vtype is pd.DataFrame:
                analysis = clean_data(
                    data.reset_index(drop=True),
                    transform=False,
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

    def __store_variables(self, variable_mapping):
        if self.pipeline is None:
            return
        for uuid, data in variable_mapping.items():
            VariableManager(self.pipeline.repo_path).add_variable(
                self.pipeline.uuid,
                self.uuid,
                uuid,
                data,
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
                f'The number of output variables does not match the block type: {self.type}',
            )
        variable_names = list(self.output_variables.keys())
        variable_dtypes = list(self.output_variables.values())
        for idx, output in enumerate(outputs):
            actual_dtype = type(output)
            expected_dtype = variable_dtypes[idx]
            if type(output) is not variable_dtypes[idx]:
                raise Exception(
                    f'The variable {variable_names[idx]} should be {expected_dtype} type,'
                    f' but {actual_dtype} type is returned',
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
