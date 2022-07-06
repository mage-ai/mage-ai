from mage_ai.data_cleaner.shared.utils import clean_name
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    BlockType,
    PIPELINE_CONFIG_FILE,
    PIPELINES_FOLDER,
)
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.templates.template import copy_template_directory
from queue import Queue
import asyncio
import os
import shutil
import yaml


class Pipeline:
    def __init__(self, uuid, repo_path=None):
        self.repo_path = repo_path or get_repo_path()
        self.uuid = uuid
        self.load_config_from_yaml()

    @property
    def config_path(self):
        return os.path.join(
            self.repo_path,
            PIPELINES_FOLDER,
            self.uuid,
            PIPELINE_CONFIG_FILE,
        )

    @property
    def dir_path(self):
        return os.path.join(self.repo_path, PIPELINES_FOLDER, self.uuid)

    @classmethod
    def create(self, name, repo_path):
        """
        1. Create a new folder for pipeline
        2. Create a new yaml file to store pipeline config
        3. Create other files: requirements.txt, __init__.py
        """
        uuid = clean_name(name)
        pipeline_path = os.path.join(repo_path, PIPELINES_FOLDER, uuid)
        if os.path.exists(pipeline_path):
            raise Exception(f'Pipeline {name} alredy exists.')
        # Copy pipeline files from template folder
        copy_template_directory('pipeline', pipeline_path)
        # Update metadata.yaml with pipeline config
        with open(os.path.join(pipeline_path, 'metadata.yaml'), 'w') as fp:
            yaml.dump(dict(name=name, uuid=uuid), fp)
        return Pipeline(uuid, repo_path)

    @classmethod
    def get_all_pipelines(self, repo_path):
        pipelines_folder = os.path.join(repo_path, PIPELINES_FOLDER)
        if not os.path.exists(pipelines_folder):
            os.mkdir(pipelines_folder)
        return [
            d
            for d in os.listdir(pipelines_folder)
            if os.path.isdir(os.path.join(pipelines_folder, d))
        ]

    @classmethod
    def get_pipelines_by_block(self, block, repo_path=None):
        repo_path = repo_path or get_repo_path()
        pipelines_folder = os.path.join(repo_path, PIPELINES_FOLDER)
        pipelines = []
        for entry in os.scandir(pipelines_folder):
            if entry.is_dir():
                try:
                    p = Pipeline(entry.name, repo_path)
                    if block.uuid in p.blocks_by_uuid:
                        pipelines.append(p)
                except Exception:
                    pass
        return pipelines

    def block_deletable(self, block):
        if block.uuid not in self.blocks_by_uuid:
            return True
        return len(self.blocks_by_uuid[block.uuid].downstream_blocks) == 0

    async def execute(self, analyze_outputs=True):
        """
        Async function for parallel processing
        This function will schedule the block execution in topological
        order based on a block's upstream dependencies.
        """
        tasks = dict()
        blocks = Queue()
        for b in self.blocks_by_uuid.values():
            if len(b.upstream_blocks) == 0:
                blocks.put(b)
                tasks[b.uuid] = None
        while not blocks.empty():
            block = blocks.get()
            skip = False
            for upstream_block in block.upstream_blocks:
                if tasks.get(upstream_block.uuid) is None:
                    blocks.put(block)
                    skip = True
                    break
            if skip:
                continue
            await asyncio.gather(*[tasks[u.uuid] for u in block.upstream_blocks])
            task = asyncio.create_task(block.execute(analyze_outputs=analyze_outputs))
            tasks[block.uuid] = task
            for downstream_block in block.downstream_blocks:
                if downstream_block.uuid not in tasks:
                    tasks[downstream_block.uuid] = None
                    blocks.put(downstream_block)
        await asyncio.gather(*tasks.values())

    def load_config_from_yaml(self):
        if not os.path.exists(self.config_path):
            raise Exception(f'Pipeline {self.uuid} does not exist.')
        with open(self.config_path) as fp:
            config = yaml.full_load(fp) or {}
        self.name = config.get('name')
        self.block_configs = config.get('blocks', [])
        blocks = [
            Block.get_block(c.get('name'), c.get('uuid'), c.get('type'), c.get('status'), self)
            for c in self.block_configs
        ]
        self.blocks_by_uuid = {b.uuid: b for b in blocks}
        for b in self.block_configs:
            block = self.blocks_by_uuid[b['uuid']]
            block.downstream_blocks = [
                self.blocks_by_uuid[uuid] for uuid in b.get('downstream_blocks', [])
            ]
            block.upstream_blocks = [
                self.blocks_by_uuid[uuid] for uuid in b.get('upstream_blocks', [])
            ]

    def to_dict(self, include_content=False, include_outputs=False, sample_count=None):
        return dict(
            name=self.name,
            uuid=self.uuid,
            blocks=[b.to_dict(
                        include_content=include_content,
                        include_outputs=include_outputs,
                        sample_count=sample_count,
                    )
                    for b in self.blocks_by_uuid.values()],
        )

    def update(self, data, update_content=False):
        if 'name' in data and data['name'] != self.name:
            """
            Rename pipeline folder
            """
            new_name = data['name']
            new_uuid = clean_name(new_name)
            old_pipeline_path = self.dir_path
            self.name = new_name
            self.uuid = new_uuid
            new_pipeline_path = self.dir_path
            os.rename(old_pipeline_path, new_pipeline_path)
        if update_content and 'blocks' in data:
            for block_data in data['blocks']:
                if 'uuid' in block_data:
                    block = self.blocks_by_uuid.get(block_data['uuid'])
                    if block is None:
                        continue
                    if 'content' in block_data:
                        block.update_content(block_data['content'])
                    if 'outputs' in block_data and block.type == BlockType.SCRATCHPAD:
                        block.save_outputs(block_data['outputs'])

    def add_block(self, block, upstream_block_uuids=[], priority=None):
        upstream_blocks = self.get_blocks(upstream_block_uuids)
        for upstream_block in upstream_blocks:
            upstream_block.downstream_blocks.append(block)
        block.upstream_blocks = upstream_blocks
        block.pipeline = self
        if priority is None or priority >= len(self.blocks_by_uuid.keys()):
            self.blocks_by_uuid[block.uuid] = block
        else:
            block_list = list(self.blocks_by_uuid.items())
            block_list.insert(priority, (block.uuid, block))
            self.blocks_by_uuid = dict(block_list)
        self.__save()
        return block

    def get_block(self, block_uuid):
        return self.blocks_by_uuid.get(block_uuid)

    def get_blocks(self, block_uuids):
        return [self.blocks_by_uuid[uuid] for uuid in block_uuids if uuid in self.blocks_by_uuid]

    def has_block(self, block_uuid):
        return block_uuid in self.blocks_by_uuid

    def update_block(self, block, upstream_block_uuids=None):
        if upstream_block_uuids is not None:
            curr_upstream_block_uuids = set(block.upstream_block_uuids)
            new_upstream_block_uuids = set(upstream_block_uuids)
            if curr_upstream_block_uuids != new_upstream_block_uuids:
                upstream_blocks_added = self.get_blocks(
                    new_upstream_block_uuids - curr_upstream_block_uuids,
                )
                upstream_blocks_removed = self.get_blocks(
                    curr_upstream_block_uuids - new_upstream_block_uuids,
                )
                for b in upstream_blocks_added:
                    b.downstream_blocks.append(block)
                for b in upstream_blocks_removed:
                    b.downstream_blocks = [
                        db for db in b.downstream_blocks if db.uuid != block.uuid
                    ]
                block.upstream_blocks = self.get_blocks(upstream_block_uuids)
        self.blocks_by_uuid[block.uuid] = block
        self.__save()
        return block

    def update_block_uuid(self, block, old_uuid):
        new_uuid = block.uuid
        if new_uuid == old_uuid:
            return
        old_variables_path = Variable.dir_path(self.dir_path, old_uuid)
        if os.path.exists(old_variables_path):
            os.rename(
                old_variables_path,
                Variable.dir_path(self.dir_path, new_uuid),
            )
        if old_uuid in self.blocks_by_uuid:
            self.blocks_by_uuid = \
                {new_uuid if k == old_uuid else k: v for k, v in self.blocks_by_uuid.items()}
        self.__save()
        return block

    def delete(self):
        pass

    def delete_block(self, block):
        if block.uuid not in self.blocks_by_uuid:
            raise Exception(f'Block {block.uuid} is not in pipeline {self.uuid}.')
        if len(block.downstream_blocks) > 0:
            downstream_block_uuids = [b.uuid for b in block.downstream_blocks]
            raise Exception(
                f'Blocks {downstream_block_uuids} are depending on block {block.uuid}'
                '. Please remove these blocks first.'
            )
        upstream_blocks = block.upstream_blocks
        for upstream_block in upstream_blocks:
            upstream_block.downstream_blocks = [
                b for b in upstream_block.downstream_blocks if b.uuid != block.uuid
            ]
        variables_path = Variable.dir_path(self.dir_path, block.uuid)
        if os.path.exists(variables_path):
            shutil.rmtree(variables_path)
        del self.blocks_by_uuid[block.uuid]
        self.__save()
        return block

    def __save(self):
        pipeline_dict = self.to_dict()
        with open(self.config_path, 'w') as fp:
            yaml.dump(pipeline_dict, fp)
