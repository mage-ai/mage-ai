from enum import Enum
from mage_ai.data_cleaner.shared.utils import clean_name
from mage_ai.data_preparation.variable_manager import VariableManager
import os


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
        pipeline=None
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

    @classmethod
    def create(self, name, block_type, repo_path):
        """
        1. Create a new folder for block_type if not exist
        2. Create a new python file with code template
        """
        uuid = clean_name(name)
        block_dir_path = os.path.join(repo_path, f'{block_type}s')
        if not os.path.exists(block_dir_path):
            os.mkdir(block_dir_path)
        # TODO: update the following code to use code template
        with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
            pass
        with open(os.path.join(block_dir_path, f'{uuid}.py'), 'w'):
            pass
        return Block(name, uuid, block_type)

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

    def execute(self):
        outputs = self.__execute()
        if len(outputs) != len(self.output_variables):
            raise Exception(
                f'The number of output variables does not match the block type: {self.type}',
            )
        variable_mapping = dict(zip(self.output_variables, outputs))
        self.__store_variables(variable_mapping)
        self.status = BlockStatus.EXECUTED
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
            self.__update_upstream_blocks()
        if 'downstream_blocks' in data and \
                set(data['downstream_blocks']) != set(self.downstream_block_uuids):
            self.__update_downstream_blocks()
        return self

    def __execute(self):
        # TODO: implement execution logic
        return ()

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

    def __update_upstream_blocks(self, upstream_blocks):
        if self.pipeline is None:
            return
        self.pipeline.update_block(self, upstream_blocks=upstream_blocks)

    def __update_downstream_blocks(self, downstream_blocks):
        if self.pipeline is None:
            return
        self.pipeline.update_block(self, downstream_blocks=downstream_blocks)


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
