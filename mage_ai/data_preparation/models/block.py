from enum import Enum
from mage_ai.data_cleaner.shared.utils import clean_name
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.variable_manager import VariableManager
import os
import pandas as pd


class BlockStatus(str, Enum):
    EXECUTED = 'executed'
    NOT_EXECUTED = 'not_executed'


class BlockType(str, Enum):
    DATA_EXPORTER = 'data_exporter'
    DATA_LOADER = 'data_loader'
    SCRATCHPAD = 'scratchpad'
    TRANSFORMER = 'transformer'


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
        return {b.uuid: b.output_variables for b in self.upstream_blocks}

    @property
    def output_variables(self):
        return []

    @property
    def upstream_block_uuids(self):
        return [b.uuid for b in self.upstream_blocks]

    @property
    def downstream_block_uuids(self):
        return [b.uuid for b in self.downstream_blocks]

    @property
    def file_path(self):
        repo_path = \
            self.pipeline.repo_path if self.pipeline is not None else None
        return os.path.join(
            repo_path or os.getcwd(),
            f'{self.type}s/{self.uuid}.py',
        )

    @classmethod
    def create(self, name, block_type, repo_path, pipeline=None, upstream_block_uuids=[]):
        """
        1. Create a new folder for block_type if not exist
        2. Create a new python file with code template
        """
        uuid = clean_name(name)
        block_dir_path = os.path.join(repo_path, f'{block_type}s')
        if not os.path.exists(block_dir_path):
            os.mkdir(block_dir_path)
            with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
                pass
        # TODO: update the following code to use code template
        file_path = os.path.join(block_dir_path, f'{uuid}.py')
        if os.path.exists(file_path):
            raise Exception(f'Block {uuid} already exists. Please use a different name.')
        with open(os.path.join(block_dir_path, f'{uuid}.py'), 'w'):
            pass
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
    def get_block(
        self,
        name,
        uuid,
        block_type,
        status=BlockStatus.NOT_EXECUTED,
        pipeline=None
    ):
        block_class = BLOCK_TYPE_TO_CLASS.get(block_type, Block)
        return block_class(name, uuid, block_type, status=status, pipeline=pipeline)

    async def execute(self, custom_code=None):
        outputs = await self.execute_block(custom_code)
        if len(outputs) != len(self.output_variables):
            raise Exception(
                f'The number of output variables does not match the block type: {self.type}',
            )
        variable_mapping = dict(zip(self.output_variables, outputs))
        self.__store_variables(variable_mapping)
        self.status = BlockStatus.EXECUTED
        self.__update_pipeline_block()
        return outputs

    def get_analyses(self):
        if self.status == BlockStatus.NOT_EXECUTED:
            return []
        if len(self.output_variables) == 0:
            return []
        analyses = []
        variable_manager = VariableManager(self.pipeline.repo_path)
        for v in self.output_variables:
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
        for v in self.output_variables:
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
                    )
                )
            outputs.append(data)
        return outputs

    def to_dict(self):
        return dict(
            name=self.name,
            uuid=self.uuid,
            type=self.type.value if type(self.type) is not str else self.type,
            status=self.status.value if type(self.status) is not str else self.status,
            upstream_blocks=self.upstream_block_uuids,
            downstream_blocks=self.downstream_block_uuids,
        )

    def update(self, data):
        if 'name' in data and data['name'] != self.name:
            self.__update_name()
        if 'upstream_blocks' in data and \
                set(data['upstream_blocks']) != set(self.upstream_block_uuids):
            self.__update_upstream_blocks(data['upstream_blocks'])
        return self

    # TODO: implement execution logic
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

        decorated_functions = []
        if custom_code is not None:
            exec(custom_code, {self.type: block_decorator(decorated_functions)})
        elif os.path.exists(self.file_path):
            with open(self.file_path) as file:
                exec(file.read(), {self.type: block_decorator(decorated_functions)})
        if len(decorated_functions) > 0:
            return decorated_functions[0](*input_vars)

        return []

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

    # TODO: implement this method
    def __update_name(self):
        """
        1. Rename block file
        2. Update the folder of variable
        3. Update upstream and downstream relationships
        """
        return

    def __update_pipeline_block(self):
        if self.pipeline is None:
            return
        self.pipeline.update_block(self)

    def __update_upstream_blocks(self, upstream_blocks):
        if self.pipeline is None:
            return
        self.pipeline.update_block(self, upstream_block_uuids=upstream_blocks)


class DataLoaderBlock(Block):
    @property
    def output_variables(self):
        return ['df']
  

class DataExporterBlock(Block):
    @property
    def output_variables(self):
        return []


class TransformerBlock(Block):
    @property
    def output_variables(self):
        return ['df']


BLOCK_TYPE_TO_CLASS = {
    BlockType.DATA_EXPORTER: DataExporterBlock,
    BlockType.DATA_LOADER: DataLoaderBlock,
    BlockType.SCRATCHPAD: Block,
    BlockType.TRANSFORMER: TransformerBlock,
}
