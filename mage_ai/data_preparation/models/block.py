from enum import Enum
from mage_ai.data_cleaner.shared.utils import clean_name
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
    def __init__(self, name, uuid, block_type, status=BlockStatus.NOT_EXECUTED):
        self.name = name or uuid
        self.uuid = uuid
        self.type = block_type
        self.status = status
        self.upstream_blocks = []
        self.downstream_blocks = []

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
        return Block(name, uuid, block_type,)

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

    def to_dict(self):
        return dict(
            name=self.name,
            uuid=self.uuid,
            type=self.type.value if type(self.type) is not str else self.type,
            status=self.status.value if type(self.status) is not str else self.status,
            upstream_blocks=[b.uuid for b in self.upstream_blocks],
            downstream_blocks=[b.uuid for b in self.downstream_blocks]
        )

    def execute(self):
        self.status = BlockStatus.executed
        # TODO: implement execution logic

    def update(self):
        pass

    def delete(self):
        pass


class DataLoaderBlock(Block):
    def execute(self):
        pass


class DataExporterBlock(Block):
    def execute(self):
        pass


class TransformerBlock(Block):
    def execute(self):
        pass
