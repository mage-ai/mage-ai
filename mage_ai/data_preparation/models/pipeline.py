from mage_ai.data_preparation.models.block import Block, run_blocks, run_blocks_sync
from mage_ai.data_preparation.models.constants import (
    BlockType,
    ExecutorType,
    PipelineType,
    PIPELINE_CONFIG_FILE,
    PIPELINES_FOLDER,
)
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config, get_repo_path
from mage_ai.data_preparation.templates.utils import copy_template_directory
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.shared.hash import extract
from mage_ai.shared.strings import format_enum
from mage_ai.shared.utils import clean_name
from typing import Callable, List
import asyncio
import os
import shutil
import yaml


CYCLE_DETECTION_ERR_MESSAGE = 'A cycle was detected in this pipeline'
METADATA_FILE_NAME = 'metadata.yaml'


class Pipeline:
    pipelines_cache = dict()

    def __init__(self, uuid, repo_path=None, config=None, repo_config=None):
        self.block_configs = []
        self.blocks_by_uuid = {}
        self.name = None
        self.repo_path = repo_path or get_repo_path()
        self.uuid = uuid
        self.type = PipelineType.PYTHON
        self.widget_configs = []
        if config is None:
            self.load_config_from_yaml()
        else:
            self.load_config(config)
        if repo_config is None:
            self.repo_config = get_repo_config(repo_path=self.repo_path)
        elif type(repo_config) is dict:
            self.repo_config = RepoConfig.from_dict(repo_config)
        else:
            self.repo_config = repo_config
        self.variable_manager = VariableManager.get_manager(
            self.repo_path,
            self.variables_dir,
        )

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

    @property
    def variables_dir(self):
        return self.repo_config.variables_dir

    @property
    def remote_variables_dir(self):
        return self.repo_config.remote_variables_dir

    @property
    def version(self):
        return 1

    @property
    def version_name(self):
        return f'v{self.version}'

    @classmethod
    def create(self, name, pipeline_type=PipelineType.PYTHON, repo_path=None):
        """
        1. Create a new folder for pipeline
        2. Create a new yaml file to store pipeline config
        3. Create other files: requirements.txt, __init__.py
        """
        uuid = clean_name(name)
        pipeline_path = os.path.join(repo_path, PIPELINES_FOLDER, uuid)
        if os.path.exists(pipeline_path):
            raise Exception(f'Pipeline {name} already exists.')
        # Copy pipeline files from template folder
        copy_template_directory('pipeline', pipeline_path)
        # Update metadata.yaml with pipeline config
        with open(os.path.join(pipeline_path, METADATA_FILE_NAME), 'w') as fp:
            yaml.dump(dict(
                name=name,
                uuid=uuid,
                type=format_enum(pipeline_type or PipelineType.PYTHON),
            ), fp)
        pipeline = Pipeline(
            uuid,
            repo_path=repo_path,
        )
        self.pipelines_cache[pipeline.uuid] = pipeline
        return pipeline

    @classmethod
    def duplicate(cls, source_pipeline: 'Pipeline', duplicate_pipeline_name: str):
        duplicate_pipeline = cls.create(
            duplicate_pipeline_name,
            pipeline_type=source_pipeline.type,
            repo_path=source_pipeline.repo_path,
        )
        # first pass to load blocks
        for block_uuid in source_pipeline.blocks_by_uuid:
            source_block = source_pipeline.blocks_by_uuid[block_uuid]
            if source_block.type == BlockType.SCRATCHPAD:
                continue
            new_block = Block.get_block(source_block.name, source_block.uuid, source_block.type)
            duplicate_pipeline.add_block(new_block)
        # second pass to make connections
        for block_uuid in source_pipeline.blocks_by_uuid:
            source_block = source_pipeline.blocks_by_uuid[block_uuid]
            if source_block.type == BlockType.SCRATCHPAD:
                continue
            duplicate_block = duplicate_pipeline.blocks_by_uuid[block_uuid]
            duplicate_block.upstream_blocks = duplicate_pipeline.get_blocks(
                source_block.upstream_block_uuids
            )
            duplicate_block.downstream_blocks = duplicate_pipeline.get_blocks(
                source_block.downstream_block_uuids
            )
        # Add widgets
        for widget_uuid in source_pipeline.widgets_by_uuid:
            source_widget = source_pipeline.widgets_by_uuid[widget_uuid]
            new_widget = Widget.get_block(
                source_widget.name,
                source_widget.uuid,
                source_widget.type,
                configuration=source_widget.configuration,
            )
            duplicate_pipeline.add_block(
                new_widget, source_widget.upstream_block_uuids, widget=True
            )
        duplicate_pipeline.save()
        return duplicate_pipeline

    @classmethod
    def get(self, uuid, repo_path: str = None):
        return Pipeline(uuid, repo_path=repo_path)

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
                    p = Pipeline(entry.name, repo_path=repo_path)
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
        build_block_output_stdout: Callable[..., object] = None,
        global_vars=None,
        parallel: bool = True,
        run_sensors: bool = True,
        run_tests: bool = True,
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

        execution_task = asyncio.create_task(
            run_blocks(
                root_blocks,
                analyze_outputs=analyze_outputs,
                build_block_output_stdout=build_block_output_stdout,
                global_vars=global_vars,
                parallel=parallel,
                run_sensors=run_sensors,
                run_tests=run_tests,
                update_status=update_status,
            )
        )
        await execution_task

    def execute_sync(
        self,
        analyze_outputs: bool = True,
        build_block_output_stdout: Callable[..., object] = None,
        global_vars=None,
        run_sensors: bool = True,
        run_tests: bool = True,
    ) -> None:
        """
        Function for synchronous block processing.
        This function will schedule the block execution in topological
        order based on a block's upstream dependencies.
        """
        if self.type == PipelineType.STREAMING:
            from mage_ai.data_preparation.executors.streaming_pipeline_executor \
                import StreamingPipelineExecutor
            StreamingPipelineExecutor(self).execute(
                build_block_output_stdout=build_block_output_stdout,
            )
        else:
            root_blocks = []
            for block in self.blocks_by_uuid.values():
                if len(block.upstream_blocks) == 0 and block.type in [
                    BlockType.DATA_EXPORTER,
                    BlockType.DATA_LOADER,
                    BlockType.TRANSFORMER,
                    BlockType.SENSOR,
                ]:
                    root_blocks.append(block)

            run_blocks_sync(
                root_blocks,
                analyze_outputs=analyze_outputs,
                build_block_output_stdout=build_block_output_stdout,
                global_vars=global_vars,
                run_sensors=run_sensors,
                run_tests=run_tests,
            )

    def get_config_from_yaml(self):
        if not os.path.exists(self.config_path):
            raise Exception(f'Pipeline {self.uuid} does not exist.')
        with open(self.config_path) as fp:
            config = yaml.full_load(fp) or {}
        return config

    def load_config_from_yaml(self):
        self.load_config(self.get_config_from_yaml())

    def load_config(self, config):
        self.name = config.get('name')
        self.type = config.get('type') or self.type

        self.block_configs = config.get('blocks') or []
        self.widget_configs = config.get('widgets') or []

        def build_shared_args_kwargs(c, block_class):
            block_type = c.get('type')
            return block_class.block_class_from_type(block_type)(
                c.get('name'),
                c.get('uuid'),
                block_type,
                configuration=c.get('configuration'),
                content=c.get('content'),
                executor_config=c.get('executor_config'),
                executor_type=c.get('executor_type', ExecutorType.LOCAL_PYTHON),
                language=c.get('language'),
                pipeline=self,
                status=c.get('status'),
            )

        blocks = [build_shared_args_kwargs(c, Block) for c in self.block_configs]
        widgets = [build_shared_args_kwargs(c, Widget) for c in self.widget_configs]
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

        self.validate('A cycle was detected in the loaded pipeline')

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
                if uuid in all_blocks_by_uuid
            ]
            block.upstream_blocks = [
                all_blocks_by_uuid[uuid] for uuid in b.get('upstream_blocks', [])
                if uuid in all_blocks_by_uuid
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
            type=self.type.value if type(self.type) is not str else self.type,
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

        if 'type' in data and data['type'] != self.type:
            """
            Update kernel
            """
            self.type = data['type']
            self.save()

        if update_content:
            block_uuid_mapping = dict()
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
                            if 'outputs' in block_data:
                                block.save_outputs(block_data['outputs'], override=True)

                            should_save = False
                            name = block_data.get('name')

                            if block_data.get('configuration'):
                                block.configuration = block_data['configuration']
                                should_save = True

                            if widget:
                                keys_to_update = []

                                if name and name != block.name:
                                    keys_to_update.append('name')

                                if block_data.get('upstream_blocks'):
                                    keys_to_update.append('upstream_blocks')
                                    block_data['upstream_blocks'] = [
                                        block_uuid_mapping.get(b, b)
                                        for b in block_data['upstream_blocks']
                                    ]

                                if len(keys_to_update) >= 1:
                                    block.update(extract(block_data, keys_to_update))

                                should_save = True
                            elif name and name != block.name:
                                block.update(extract(block_data, ['name']))
                                block_uuid_mapping[block_data.get('uuid')] = block.uuid
                                should_save = True

                            if should_save:
                                self.save(widget=widget)

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
                # All blocks will depend on non-widget type blocks
                upstream_blocks=self.get_blocks(upstream_block_uuids, widget=False),
                priority=priority,
            )
        else:
            self.blocks_by_uuid = self.__add_block_to_mapping(
                self.blocks_by_uuid,
                block,
                upstream_blocks=self.get_blocks(upstream_block_uuids),
                priority=priority,
            )

        self.validate('A cycle was formed while adding a block')
        self.save()
        return block

    def get_block(self, block_uuid, widget=False):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
        return mapping.get(block_uuid)

    def get_blocks(self, block_uuids, widget=False):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
        return [mapping[uuid] for uuid in block_uuids if uuid in mapping]

    def get_executable_blocks(self):
        return [b for b in self.blocks_by_uuid.values() if b.executable]

    def has_block(self, block_uuid):
        return block_uuid in self.blocks_by_uuid

    def update_block(self, block, upstream_block_uuids=None, widget=False):
        save_kwargs = dict()

        if upstream_block_uuids is not None:
            curr_upstream_block_uuids = set(block.upstream_block_uuids)
            new_upstream_block_uuids = set(upstream_block_uuids)
            if curr_upstream_block_uuids != new_upstream_block_uuids:
                # There are currently no upstream blocks that are widgets (e.g. chart)
                upstream_blocks_added = self.get_blocks(
                    new_upstream_block_uuids - curr_upstream_block_uuids,
                    widget=False,
                )
                # There are currently no upstream blocks that are widgets (e.g. chart)
                upstream_blocks_removed = self.get_blocks(
                    curr_upstream_block_uuids - new_upstream_block_uuids,
                    widget=False,
                )
                for b in upstream_blocks_added:
                    b.downstream_blocks.append(block)
                for b in upstream_blocks_removed:
                    b.downstream_blocks = [
                        db for db in b.downstream_blocks if db.uuid != block.uuid
                    ]

                # All blocks will depend on non-widget type blocks
                block.upstream_blocks = self.get_blocks(upstream_block_uuids, widget=False)
        else:
            save_kwargs['block_uuid'] = block.uuid

        if widget:
            self.widgets_by_uuid[block.uuid] = block
        else:
            self.blocks_by_uuid[block.uuid] = block

        self.validate('A cycle was formed while updating a block')
        self.save(**save_kwargs, widget=widget)

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
        for block_uuid in list(self.blocks_by_uuid.keys()):
            block = self.blocks_by_uuid[block_uuid]
            if block.type == BlockType.SCRATCHPAD:
                self.delete_block(block)
                os.remove(block.file_path)
        shutil.rmtree(self.dir_path)
        if self.uuid in Pipeline.pipelines_cache:
            del Pipeline.pipelines_cache[self.uuid]

    def delete_block(self, block, widget=False, commit=True):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid

        if block.uuid not in mapping:
            raise Exception(f'Block {block.uuid} is not in pipeline {self.uuid}.')
        if len(block.downstream_blocks) > 0:
            downstream_block_uuids = [
                b.uuid for b in block.downstream_blocks if b.type != BlockType.CHART
            ]
            if len(downstream_block_uuids) > 0:
                raise Exception(
                    f'Block(s) {downstream_block_uuids} are depending on block {block.uuid}'
                    '. Please remove the downstream blocks first.'
                )
            for downstream_block in block.downstream_blocks:
                downstream_block.delete(commit=False)

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
        if commit:
            self.save()
        return block

    def save(self, block_uuid: str = None, widget: bool = False):
        if block_uuid is not None:
            current_pipeline = Pipeline(self.uuid, self.repo_path)
            block = self.get_block(block_uuid, widget=widget)
            if widget:
                current_pipeline.widgets_by_uuid[block_uuid] = block
            else:
                current_pipeline.blocks_by_uuid[block_uuid] = block
            pipeline_dict = current_pipeline.to_dict()
        else:
            pipeline_dict = self.to_dict()
        with open(self.config_path, 'w') as fp:
            yaml.dump(pipeline_dict, fp)
        Pipeline.pipelines_cache[self.uuid] = self

    def validate(self, error_msg=CYCLE_DETECTION_ERR_MESSAGE) -> None:
        """
        Validates whether pipeline is valid; there must exist no cycles in the pipeline.

        Args:
            error_msg (str): Error message to print if cycle is found.
            Defaults to 'A cycle was detected'
        """
        combined_blocks = dict()
        combined_blocks.update(self.blocks_by_uuid)
        combined_blocks.update(self.widgets_by_uuid)
        status = {uuid: 'unvisited' for uuid in combined_blocks}

        def __print_cycle(start_uuid: str, virtual_stack: List[StackFrame]):
            index = 0
            while index < len(virtual_stack) and virtual_stack[index].uuid != start_uuid:
                index += 1

            cycle = [frame.uuid for frame in virtual_stack[index:]]
            return " --> ".join(cycle)

        def __check_cycle(block: Block):
            virtual_stack = [StackFrame(block)]
            while len(virtual_stack) > 0:
                frame = virtual_stack[-1]
                if status[frame.uuid] == 'validated':
                    virtual_stack.pop()
                    continue
                if not frame.accessed:
                    if status[frame.uuid] == 'processing':
                        cycle = __print_cycle(frame.uuid, virtual_stack)
                        raise InvalidPipelineError(f'{error_msg}: {cycle}')
                    frame.accessed = True
                    status[frame.uuid] = 'processing'
                if len(frame.children) == 0:
                    status[frame.uuid] = 'validated'
                    virtual_stack.pop()
                else:
                    child_block = combined_blocks[frame.children.pop()]
                    virtual_stack.append(StackFrame(child_block))

        for uuid in combined_blocks:
            if status[uuid] == 'unvisited' and uuid in self.blocks_by_uuid:
                __check_cycle(self.blocks_by_uuid[uuid])


class StackFrame:
    def __init__(self, block):
        self.uuid = block.uuid
        self.children = block.downstream_block_uuids
        self.accessed = False


class InvalidPipelineError(Exception):
    """
    Invalid pipeline found due to existence of a cycle.
    """

    pass
