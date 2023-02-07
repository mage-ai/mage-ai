from mage_ai.data_preparation.models.block import Block, run_blocks, run_blocks_sync
from mage_ai.data_preparation.models.block.dbt.utils import update_model_settings
from mage_ai.data_preparation.models.block.errors import NoMultipleDynamicUpstreamBlocks
from mage_ai.data_preparation.models.block.utils import is_dynamic_block
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    DATA_INTEGRATION_CATALOG_FILE,
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
from mage_ai.shared.hash import extract, merge_dict
from mage_ai.shared.strings import format_enum
from mage_ai.shared.utils import clean_name
from typing import Callable, Dict, List
import aiofiles
import asyncio
import json
import os
import shutil
import yaml


CYCLE_DETECTION_ERR_MESSAGE = 'A cycle was detected in this pipeline'
METADATA_FILE_NAME = 'metadata.yaml'


class Pipeline:
    def __init__(self, uuid, repo_path=None, config=None, repo_config=None, catalog=None):
        self.block_configs = []
        self.blocks_by_uuid = {}
        self.data_integration = None
        self.name = None
        self.repo_path = repo_path or get_repo_path()
        self.uuid = uuid
        self.type = PipelineType.PYTHON
        self.widget_configs = []
        if config is None:
            self.load_config_from_yaml()
        else:
            self.load_config(config, catalog=catalog)
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
    def catalog_config_path(self):
        return os.path.join(
            self.repo_path,
            PIPELINES_FOLDER,
            self.uuid,
            DATA_INTEGRATION_CATALOG_FILE,
        )

    @property
    def dir_path(self):
        return os.path.join(self.repo_path, PIPELINES_FOLDER, self.uuid)

    @property
    def variables_dir(self):
        return self.repo_config.variables_dir

    @property
    def pipeline_variables_dir(self):
        return os.path.join(
            self.variables_dir,
            PIPELINES_FOLDER,
            self.uuid,
        )

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
        from mage_ai.data_preparation.models.pipelines.integration_pipeline \
            import IntegrationPipeline

        pipeline = self(uuid, repo_path=repo_path)
        if PipelineType.INTEGRATION == pipeline.type:
            pipeline = IntegrationPipeline(uuid, repo_path=repo_path)

        return pipeline

    @classmethod
    async def get_async(self, uuid, repo_path: str = None):
        from mage_ai.data_preparation.models.pipelines.integration_pipeline \
            import IntegrationPipeline
        repo_path = repo_path or get_repo_path()
        config_path = os.path.join(
            repo_path,
            PIPELINES_FOLDER,
            uuid,
            PIPELINE_CONFIG_FILE,
        )

        if not os.path.exists(config_path):
            raise Exception(f'Pipeline {uuid} does not exist.')
        async with aiofiles.open(config_path, mode='r') as f:
            try:
                config = yaml.safe_load(await f.read()) or {}
            except Exception as err:
                config = {}
                print(err)

        if PipelineType.INTEGRATION == config.get('type'):
            catalog = None
            catalog_config_path = os.path.join(
                repo_path,
                PIPELINES_FOLDER,
                uuid,
                DATA_INTEGRATION_CATALOG_FILE,
            )
            if os.path.exists(catalog_config_path):
                async with aiofiles.open(catalog_config_path, mode='r') as f:
                    try:
                        catalog = json.loads(await f.read())
                    except Exception as err:
                        catalog = {}
                        print(err)
            pipeline = IntegrationPipeline(
                uuid,
                catalog=catalog,
                config=config,
                repo_path=repo_path,
            )
        else:
            pipeline = self(uuid, repo_path=repo_path, config=config)
        return pipeline

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
        analyze_outputs: bool = False,
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
        analyze_outputs: bool = False,
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
                    BlockType.DBT,
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

    def get_catalog_from_json(self):
        if not os.path.exists(self.catalog_config_path):
            raise Exception(f'Data integration pipeline {self.uuid} is missing stream data.')
        with open(self.catalog_config_path) as f:
            config = json.load(f)
        return config

    def load_config_from_yaml(self):
        catalog = None
        if os.path.exists(self.catalog_config_path):
            catalog = self.get_catalog_from_json()
        self.load_config(self.get_config_from_yaml(), catalog=catalog)

    def load_config(self, config, catalog=None):
        if catalog is None:
            self.data_integration = config.get('data_integration')
        else:
            self.data_integration = catalog
        self.name = config.get('name')
        self.type = config.get('type') or self.type

        self.block_configs = config.get('blocks') or []
        self.widget_configs = config.get('widgets') or []

        self.variables = config.get('variables')

        def build_shared_args_kwargs(c):
            block_type = c.get('type')
            language = c.get('language')
            return Block.block_class_from_type(block_type, language=language, pipeline=self)(
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

        blocks = [build_shared_args_kwargs(c) for c in self.block_configs]
        widgets = [build_shared_args_kwargs(c) for c in self.widget_configs]
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

    def to_dict_base(self, exclude_data_integration=False) -> Dict:
        base = dict(
            data_integration=self.data_integration if not exclude_data_integration else None,
            name=self.name,
            type=self.type.value if type(self.type) is not str else self.type,
            uuid=self.uuid,
        )
        if self.variables is not None:
            base['variables'] = self.variables
        return base

    def to_dict(
        self,
        include_content=False,
        include_outputs=False,
        sample_count=None,
        exclude_data_integration=False,
    ) -> Dict:
        return merge_dict(
            self.to_dict_base(exclude_data_integration=exclude_data_integration),
            dict(
                blocks=[
                    b.to_dict(
                        include_content=include_content,
                        include_outputs=include_outputs,
                        sample_count=sample_count,
                        check_if_file_exists=True,
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
            ),
        )

    async def to_dict_async(
        self,
        include_content=False,
        include_outputs=False,
        sample_count=None,
    ):
        blocks_data = await asyncio.gather(
            *[b.to_dict_async(
                include_content=include_content,
                include_outputs=include_outputs,
                sample_count=sample_count,
                check_if_file_exists=True,
              ) for b in self.blocks_by_uuid.values()]
        )
        widgets_data = await asyncio.gather(
            *[b.to_dict_async(
                include_content=include_content,
                include_outputs=include_outputs,
                sample_count=sample_count,
              ) for b in self.widgets_by_uuid.values()]
        )
        return merge_dict(self.to_dict_base(), dict(
            blocks=blocks_data,
            widgets=widgets_data,
        ))

    async def update(self, data, update_content=False):
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

        if 'data_integration' in data:
            self.data_integration = data['data_integration']
            self.save()

        if update_content:
            block_uuid_mapping = dict()
            for key in ['blocks', 'widgets']:
                if key in data:
                    for block_data in data[key]:
                        if 'uuid' not in block_data:
                            continue

                        widget = key == 'widgets'
                        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
                        block = mapping.get(block_data['uuid'])
                        if block is None:
                            continue
                        if 'content' in block_data:
                            await block.update_content_async(block_data['content'], widget=widget)
                        if 'outputs' in block_data:
                            await block.save_outputs_async(block_data['outputs'], override=True)

                        should_save = False
                        name = block_data.get('name')

                        configuration = block_data.get('configuration')
                        if configuration:
                            if configuration.get('dynamic') and not is_dynamic_block(block):
                                for downstream_block in block.downstream_blocks:
                                    dynamic_blocks = list(filter(
                                        is_dynamic_block,
                                        downstream_block.upstream_blocks,
                                    ))

                                    if len(dynamic_blocks) >= 1:
                                        db_uuids = [block.uuid] + [b.uuid for b in dynamic_blocks]
                                        raise NoMultipleDynamicUpstreamBlocks(
                                            f'Block {downstream_block.uuid} can only have 1 '
                                            'upstream block that is dynamic. Current request is '
                                            'trying to set the following dynamic blocks as '
                                            f"upstream: {', '.join(db_uuids)}.",
                                        )

                            block.configuration = configuration
                            should_save = True

                        if BlockType.DBT == block.type and BlockLanguage.SQL == block.language:
                            update_model_settings(
                                block,
                                block.upstream_blocks,
                                [],
                                force_update=True,
                            )

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
                            await self.save_async(widget=widget)

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
        block.update_upstream_blocks(upstream_blocks)
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

    def get_block(self, block_uuid, check_template: bool = False, widget: bool = False) -> 'Block':
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
        block = mapping.get(block_uuid)

        if not block:
            block = mapping.get(block_uuid.split(':')[0])

        return block

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
            mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
            dynamic_upstream_blocks = list(filter(
                is_dynamic_block,
                [mapping[b_uuid] for b_uuid in upstream_block_uuids if b_uuid in mapping],
            ))

            if len(dynamic_upstream_blocks) >= 2:
                raise NoMultipleDynamicUpstreamBlocks(
                    f'Block {block.uuid} can only have 1 upstream block that is dynamic. '
                    'Current request is trying to set the following dynamic blocks as upstream: '
                    f"{', '.join([b.uuid for b in dynamic_upstream_blocks])}.",
                )

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
                block.update_upstream_blocks(self.get_blocks(upstream_block_uuids, widget=False))
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

    def update_global_variable(self, key, value):
        if self.variables is None:
            self.variables = {}
        self.variables[key] = value
        self.save()

    def delete_global_variable(self, key):
        del self.variables[key]
        self.save()

    def delete(self):
        for block_uuid in list(self.blocks_by_uuid.keys()):
            block = self.blocks_by_uuid[block_uuid]
            if block.type == BlockType.SCRATCHPAD:
                self.delete_block(block)
                os.remove(block.file_path)
        shutil.rmtree(self.dir_path)

    def delete_block(self, block, widget=False, commit=True):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid

        if block.uuid not in mapping:
            raise Exception(f'Block {block.uuid} is not in pipeline {self.uuid}.')
        if len(block.downstream_blocks) > 0:
            downstream_block_uuids = [
                b.uuid for b in block.downstream_blocks if b.type != BlockType.CHART
            ]
            if self.type == PipelineType.INTEGRATION:
                for downstream_block in block.downstream_blocks:
                    upstream_block_uuids = list(filter(
                        lambda uuid: uuid != block.uuid,
                        downstream_block.upstream_block_uuids
                    ))
                    downstream_block.update(dict(
                        upstream_blocks=[*upstream_block_uuids, *block.upstream_block_uuids]
                    ))
            elif len(downstream_block_uuids) > 0:
                raise Exception(
                    f'Block(s) {downstream_block_uuids} are depending on block {block.uuid}'
                    '. Please remove the downstream blocks first.'
                )
            else:
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
            if self.data_integration is not None:
                with open(self.catalog_config_path, 'w') as fp:
                    json.dump(self.data_integration, fp)
            pipeline_dict = self.to_dict(exclude_data_integration=True)
        with open(self.config_path, 'w') as fp:
            yaml.dump(pipeline_dict, fp)

    async def save_async(self, block_uuid: str = None, widget: bool = False):
        if block_uuid is not None:
            current_pipeline = await Pipeline.get_async(self.uuid, self.repo_path)
            block = self.get_block(block_uuid, widget=widget)
            if widget:
                current_pipeline.widgets_by_uuid[block_uuid] = block
            else:
                current_pipeline.blocks_by_uuid[block_uuid] = block
            pipeline_dict = current_pipeline.to_dict()
        else:
            if self.data_integration is not None:
                async with aiofiles.open(self.catalog_config_path, mode='w') as fp:
                    await fp.write(json.dumps(self.data_integration))
            pipeline_dict = self.to_dict(exclude_data_integration=True)
        async with aiofiles.open(self.config_path, mode='w') as fp:
            await fp.write(yaml.dump(pipeline_dict))

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
