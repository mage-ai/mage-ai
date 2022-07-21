from typing import Callable, List, Set
from mage_ai.data_cleaner.shared.utils import clean_name
from mage_ai.data_preparation.models.block import Block, run_blocks
from mage_ai.data_preparation.models.constants import (
    BlockType,
    PIPELINE_CONFIG_FILE,
    PIPELINES_FOLDER,
)
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.templates.template import copy_template_directory
import os
import shutil
import yaml

METADATA_FILE_NAME = 'metadata.yaml'


class Pipeline:
    def __init__(self, uuid, repo_path=None):
        self.block_configs = []
        self.blocks_by_uuid = {}
        self.name = None
        self.repo_path = repo_path or get_repo_path()
        self.uuid = uuid
        self.widget_configs = []
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
        with open(os.path.join(pipeline_path, METADATA_FILE_NAME), 'w') as fp:
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
            if self.is_valid_pipeline(os.path.join(pipelines_folder, d))
        ]

    @classmethod
    def get_pipelines_by_block(self, block, repo_path=None, widget=False):
        repo_path = repo_path or get_repo_path()
        pipelines_folder = os.path.join(repo_path, PIPELINES_FOLDER)
        pipelines = []
        for entry in os.scandir(pipelines_folder):
            if entry.is_dir():
                try:
                    p = Pipeline(entry.name, repo_path)
                    mapping = p.widgets_by_uuid if widget else p.blocks_by_uuid
                    if block.uuid in mapping:
                        pipelines.append(p)
                except Exception:
                    pass
        return pipelines

    @classmethod
    def is_valid_pipeline(self, pipeline_path):
        return os.path.isdir(pipeline_path) and os.path.exists(
            os.path.join(pipeline_path, METADATA_FILE_NAME)
        )

    def block_deletable(self, block, widget=False):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
        if block.uuid not in mapping:
            return True
        return len(mapping[block.uuid].downstream_blocks) == 0

    async def execute(
        self,
        analyze_outputs: bool = True,
        global_vars=None,
        log_func: Callable[[str], None] = None,
        redirect_outputs: bool = False,
        update_status: bool = True,
    ) -> None:
        """
        Async function for parallel processing
        This function will schedule the block execution in topological
        order based on a block's upstream dependencies.
        """
        root_blocks = []
        for block in self.blocks_by_uuid.values():
            if len(block.upstream_blocks) == 0:
                root_blocks.append(block)

        await run_blocks(
            root_blocks,
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            log_func=log_func,
            redirect_outputs=redirect_outputs,
            update_status=update_status,
        )

    def load_config_from_yaml(self):
        if not os.path.exists(self.config_path):
            raise Exception(f'Pipeline {self.uuid} does not exist.')
        with open(self.config_path) as fp:
            config = yaml.full_load(fp) or {}
        self.name = config.get('name')

        self.block_configs = config.get('blocks', [])
        self.widget_configs = config.get('widgets', [])
        blocks = [
            Block.get_block(
                c.get('name'),
                c.get('uuid'),
                c.get('type'),
                c.get('status'),
                self,
            )
            for c in self.block_configs
        ]
        widgets = [
            Widget.get_block(
                c.get('name'),
                c.get('uuid'),
                c.get('type'),
                c.get('status'),
                self,
                configuration=c.get('configuration'),
            )
            for c in self.widget_configs
        ]
        all_blocks = blocks + widgets

        self.blocks_by_uuid = self.__initialize_blocks_by_uuid(
            self.block_configs,
            blocks,
            all_blocks,
        )
        self.widgets_by_uuid = self.__initialize_blocks_by_uuid(
            self.widget_configs,
            widgets,
            all_blocks,
        )

    def __initialize_blocks_by_uuid(
        self,
        configs,
        blocks,
        all_blocks,
    ):
        blocks_by_uuid = {b.uuid: b for b in blocks}
        all_blocks_by_uuid = {b.uuid: b for b in all_blocks}

        for b in configs:
            block = blocks_by_uuid[b['uuid']]
            block.downstream_blocks = [
                all_blocks_by_uuid[uuid] for uuid in b.get('downstream_blocks', [])
            ]
            block.upstream_blocks = [
                all_blocks_by_uuid[uuid] for uuid in b.get('upstream_blocks', [])
            ]

        return blocks_by_uuid

    def to_dict(
        self,
        include_content=False,
        include_outputs=False,
        sample_count=None,
    ):
        return dict(
            name=self.name,
            uuid=self.uuid,
            blocks=[
                b.to_dict(
                    include_content=include_content,
                    include_outputs=include_outputs,
                    sample_count=sample_count,
                )
                for b in self.blocks_by_uuid.values()
            ],
            widgets=[
                b.to_dict(
                    include_content=include_content,
                    include_outputs=include_outputs,
                    sample_count=sample_count,
                )
                for b in self.widgets_by_uuid.values()
            ],
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
            self.save()
        if update_content:
            for key in ['blocks', 'widgets']:
                if key in data:
                    for block_data in data[key]:
                        if 'uuid' in block_data:
                            widget = key == 'widgets'
                            mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
                            block = mapping.get(block_data['uuid'])
                            if block is None:
                                continue
                            if 'content' in block_data:
                                block.update_content(block_data['content'], widget=widget)
                            if 'outputs' in block_data and block.type == BlockType.SCRATCHPAD:
                                block.save_outputs(block_data['outputs'], override=True)

                            if widget:
                                if block_data.get('configuration'):
                                    block.configuration = block_data['configuration']

                                if block_data.get('upstream_blocks'):
                                    block.update(dict(upstream_blocks=block_data['upstream_blocks']))

                                self.save()

    def __add_block_to_mapping(
        self,
        blocks_by_uuid,
        block,
        upstream_blocks,
        priority=None,
    ):
        mapping = blocks_by_uuid.copy()

        for upstream_block in upstream_blocks:
            upstream_block.downstream_blocks.append(block)
        block.upstream_blocks = upstream_blocks
        block.pipeline = self
        if priority is None or priority >= len(mapping.keys()):
            mapping[block.uuid] = block
        else:
            block_list = list(mapping.items())
            block_list.insert(priority, (block.uuid, block))
            mapping = dict(block_list)

        return mapping

    def add_block(self, block, upstream_block_uuids=[], priority=None, widget=False):
        if widget:
            self.widgets_by_uuid = self.__add_block_to_mapping(
                self.widgets_by_uuid,
                block,
                upstream_blocks=self.get_blocks(upstream_block_uuids),
                priority=priority,
            )
        else:
            self.blocks_by_uuid = self.__add_block_to_mapping(
                self.blocks_by_uuid,
                block,
                upstream_blocks=self.get_blocks(upstream_block_uuids),
                priority=priority,
            )

        self.save()
        return block

    def get_block(self, block_uuid, widget=False):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
        return mapping.get(block_uuid)

    def get_blocks(self, block_uuids, widget=False):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
        return [mapping[uuid] for uuid in block_uuids if uuid in mapping]

    def has_block(self, block_uuid):
        return block_uuid in self.blocks_by_uuid

    def update_block(self, block, upstream_block_uuids=None, widget=False):
        save_kwargs = dict()

        if upstream_block_uuids is not None:
            curr_upstream_block_uuids = set(block.upstream_block_uuids)
            new_upstream_block_uuids = set(upstream_block_uuids)
            if curr_upstream_block_uuids != new_upstream_block_uuids:
                upstream_blocks_added = self.get_blocks(
                    new_upstream_block_uuids - curr_upstream_block_uuids,
                    widget=widget,
                )
                upstream_blocks_removed = self.get_blocks(
                    curr_upstream_block_uuids - new_upstream_block_uuids,
                    widget=widget,
                )
                for b in upstream_blocks_added:
                    b.downstream_blocks.append(block)
                for b in upstream_blocks_removed:
                    b.downstream_blocks = [
                        db for db in b.downstream_blocks if db.uuid != block.uuid
                    ]

                block.upstream_blocks = self.get_blocks(upstream_block_uuids, widget=widget)
        else:
            save_kwargs['block_uuid'] = block.uuid

        if widget:
            self.widgets_by_uuid[block.uuid] = block
        else:
            self.blocks_by_uuid[block.uuid] = block

        self.save(**save_kwargs)

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
            self.blocks_by_uuid = {
                new_uuid if k == old_uuid else k: v for k, v in self.blocks_by_uuid.items()
            }
        self.save()
        return block

    def delete(self):
        pass

    def delete_block(self, block, widget=False):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid

        if block.uuid not in mapping:
            raise Exception(f'Block {block.uuid} is not in pipeline {self.uuid}.')
        if len(block.downstream_blocks) > 0:
            downstream_block_uuids = [b.uuid for b in block.downstream_blocks]
            raise Exception(
                f'Blocks {downstream_block_uuids} are depending on block {block.uuid}'
                '. Please remove the downstream blocks first.'
            )
        upstream_blocks = block.upstream_blocks
        for upstream_block in upstream_blocks:
            upstream_block.downstream_blocks = [
                b for b in upstream_block.downstream_blocks if b.uuid != block.uuid
            ]
        variables_path = Variable.dir_path(self.dir_path, block.uuid)
        if os.path.exists(variables_path):
            shutil.rmtree(variables_path)

        if widget:
            del self.widgets_by_uuid[block.uuid]
        else:
            del self.blocks_by_uuid[block.uuid]
        self.save()
        return block

    def save(self, block_uuid: str = None):
        if block_uuid is not None:
            current_pipeline = Pipeline(self.uuid, self.repo_path)
            current_pipeline.blocks_by_uuid[block_uuid] = self.get_block(block_uuid)
            pipeline_dict = current_pipeline.to_dict()
        else:
            pipeline_dict = self.to_dict()
        with open(self.config_path, 'w') as fp:
            yaml.dump(pipeline_dict, fp)
