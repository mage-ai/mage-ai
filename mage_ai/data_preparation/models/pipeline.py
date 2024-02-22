import asyncio
import copy
import json
import os
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Callable, Dict, List, Tuple, Union

import aiofiles
import pytz
import yaml
from jinja2 import Template

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.cache.pipeline import PipelineCache
from mage_ai.data_preparation.models.block import Block, run_blocks, run_blocks_sync
from mage_ai.data_preparation.models.block.data_integration.utils import (
    convert_outputs_to_data,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.block.errors import HasDownstreamDependencies
from mage_ai.data_preparation.models.constants import (
    DATA_INTEGRATION_CATALOG_FILE,
    PIPELINE_CONFIG_FILE,
    PIPELINE_MAX_FILE_SIZE,
    PIPELINES_FOLDER,
    BlockLanguage,
    BlockType,
    ExecutorType,
    PipelineType,
)
from mage_ai.data_preparation.models.errors import (
    FileWriteError,
    InvalidPipelineZipError,
    PipelineZipTooLargeError,
    SerializationError,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipelines.models import PipelineSettings
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.utils import is_yaml_serializable
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.repo_manager import (
    RepoConfig,
    get_project_uuid,
    get_repo_config,
)
from mage_ai.data_preparation.shared.secrets import (
    delete_secrets_dir,
    rename_pipeline_secrets_dir,
)
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.utils import copy_template_directory
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.orchestration.constants import Entity
from mage_ai.settings.platform import build_repo_path_for_all_projects
from mage_ai.settings.platform.constants import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import extract, ignore_keys, index_by, merge_dict
from mage_ai.shared.io import safe_write, safe_write_async
from mage_ai.shared.path_fixer import remove_base_repo_path
from mage_ai.shared.strings import format_enum
from mage_ai.shared.utils import clean_name

CYCLE_DETECTION_ERR_MESSAGE = 'A cycle was detected in this pipeline'


class Pipeline:
    def __init__(
        self,
        uuid,
        repo_path=None,
        config=None,
        repo_config=None,
        catalog=None,
        use_repo_path: bool = False,
    ):
        self.block_configs = []
        self.blocks_by_uuid = {}
        # Can only be set True when run_pipeline_in_one_process is True
        self.cache_block_output_in_memory = False
        self.concurrency_config = dict()
        self.created_at = None
        self.data_integration = None
        self.description = None
        self.executor_config = dict()
        self.executor_type = None
        self.extensions = {}
        self.name = None
        self.notification_config = dict()
        self.repo_path = repo_path or get_repo_path()
        self.retry_config = {}
        self.run_pipeline_in_one_process = False
        self.schedules = []
        self.settings = {}
        self.tags = []
        self.type = PipelineType.PYTHON
        self.use_repo_path = use_repo_path
        self.uuid = uuid
        self.widget_configs = []
        self._executor_count = 1  # Used by streaming pipeline to launch multiple executors

        if repo_config is None:
            self.repo_config = get_repo_config(repo_path=self.repo_path)
        elif type(repo_config) is dict:
            self.repo_config = RepoConfig.from_dict(repo_config)
        else:
            self.repo_config = repo_config

        self.variable_manager = VariableManager.get_manager(
            self.repo_path,
            self.remote_variables_dir or self.variables_dir,
        )

        # Used for showing the operation history. For example: recently viewed pipelines.
        self.history = []

        if config is None:
            self.load_config_from_yaml()
        else:
            self.load_config(config, catalog=catalog)

    @classmethod
    def build_config_path(self, uuid: str, repo_path: str, use_repo_path: bool = False) -> str:
        if project_platform_activated() and not use_repo_path:
            from mage_ai.settings.platform.utils import get_pipeline_config_path

            config_path, _repo_path = get_pipeline_config_path(uuid)
            if config_path:
                return config_path

        return os.path.join(
            repo_path,
            PIPELINES_FOLDER,
            uuid,
            PIPELINE_CONFIG_FILE,
        )

    @property
    def config_path(self):
        return self.build_config_path(self.uuid, self.repo_path, use_repo_path=self.use_repo_path)

    @property
    def catalog_config_path(self):
        if project_platform_activated() and not self.use_repo_path:
            from mage_ai.settings.platform.utils import get_pipeline_config_path

            config_path, _repo_path = get_pipeline_config_path(self.uuid)
            if config_path:
                return os.path.join(os.path.dirname(config_path), DATA_INTEGRATION_CATALOG_FILE)

        return os.path.join(
            self.repo_path,
            PIPELINES_FOLDER,
            self.uuid,
            DATA_INTEGRATION_CATALOG_FILE,
        )

    @property
    def updated_at(self):
        if os.path.exists(self.config_path):
            return datetime.fromtimestamp(os.path.getmtime(self.config_path), tz=timezone.utc)

    @property
    def dir_path(self):
        return os.path.join(self.repo_path, PIPELINES_FOLDER, self.uuid)

    @property
    def executor_count(self):
        if self.type == PipelineType.STREAMING:
            return self._executor_count
        return 1

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
        remote_variables_dir = self.repo_config.remote_variables_dir
        if remote_variables_dir == 's3://bucket/path_prefix':
            # Filter out default value
            return None
        return remote_variables_dir

    @property
    def version(self):
        return 1

    @property
    def version_name(self):
        return f'v{self.version}'

    @property
    def all_block_configs(self) -> List[Dict]:
        return self.block_configs + \
            self.conditional_configs + \
            self.callback_configs + \
            self.widget_configs

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
        with open(os.path.join(pipeline_path, PIPELINE_CONFIG_FILE), 'w') as fp:
            yaml.dump(dict(
                created_at=str(datetime.now(tz=pytz.UTC)),
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
    def import_from_zip(self, zip_content: str, overwrite: bool = False) -> Tuple[File, Dict]:
        with tempfile.TemporaryDirectory() as tmp_dir:
            zip_data = BytesIO(zip_content)
            with zipfile.ZipFile(zip_data, 'r') as zipf:
                zip_size = sum(e.file_size for e in zipf.infolist())  # calc zip size in bytes
                if zip_size / 1000 > PIPELINE_MAX_FILE_SIZE:  # prevention against zip-bombs
                    raise PipelineZipTooLargeError(
                        f'Pipeline zip exceeds size limit {PIPELINE_MAX_FILE_SIZE/1000}Kb')

                # Ignore `__MACOSX` for zips created on macOS systems
                zip_contents = [path for path in zipf.namelist() if not path.startswith('__MACOSX')]
                # Verify if zip contents are part of a root folder
                prefix = os.path.commonpath(zip_contents)

                zipf.extractall(tmp_dir)
                if prefix:
                    inner_path = os.path.join(tmp_dir, prefix)
                    all_files = os.listdir(inner_path)
                    for file in all_files:  # move each file except the folder itself
                        source_path = os.path.join(inner_path, file)
                        destination_path = os.path.join(tmp_dir, file)
                        os.rename(source_path, destination_path)
                    os.removedirs(inner_path)  # remove root folder

            pipeline_files, pipeline_config = self.__update_pipeline_yaml(
                tmp_dir,
                overwrite=overwrite,
            )
            new_pipeline_uuid = pipeline_config['uuid']

            # write all files in bulk
            for source, destination in pipeline_files:
                try:
                    dir_path, file_name = os.path.split(destination)
                    with open(source, 'r') as src:
                        File.create(file_name, dir_path, src.read(), overwrite=overwrite)
                except Exception:
                    raise FileWriteError(f'Failed to write pipeline file to {destination}.')

            # return the pipeline configuration file
            config_destination_path = pipeline_files[0][1]  # First item is the pipeline config path
            ret_file = File.from_path(config_destination_path)
            ret_file.filename = new_pipeline_uuid

            return ret_file, pipeline_config

    @classmethod
    async def duplicate(
        cls,
        source_pipeline: 'Pipeline',
        duplicate_pipeline_name: str = None,
    ):
        duplicate_pipeline_uuid = duplicate_pipeline_name
        pipeline_uuids = cls.get_all_pipelines(source_pipeline.repo_path)
        pipeline_count = len(pipeline_uuids)
        cleaned_source_pipeline_name = clean_name(source_pipeline.name)
        if duplicate_pipeline_uuid is None:
            duplicate_pipeline_uuid = f'{cleaned_source_pipeline_name}_copy'

        identifier = pipeline_count
        while duplicate_pipeline_uuid in pipeline_uuids:
            identifier += 1
            duplicate_pipeline_uuid = f'{cleaned_source_pipeline_name}_copy_{identifier}'

        duplicate_pipeline = cls.create(
            duplicate_pipeline_uuid,
            pipeline_type=source_pipeline.type,
            repo_path=source_pipeline.repo_path,
        )

        if source_pipeline.type == PipelineType.INTEGRATION and \
                source_pipeline.data_integration is not None:
            with open(duplicate_pipeline.catalog_config_path, 'w') as fp:
                json.dump(source_pipeline.data_integration, fp)

        duplicate_pipeline_dict = source_pipeline.to_dict(exclude_data_integration=True)
        duplicate_pipeline_dict['uuid'] = duplicate_pipeline_uuid
        duplicate_pipeline_dict['name'] = duplicate_pipeline_uuid
        safe_write(
            duplicate_pipeline.config_path,
            yaml.dump(duplicate_pipeline_dict)
        )

        tags = duplicate_pipeline_dict.get('tags')
        blocks = duplicate_pipeline_dict.get('blocks')
        if tags:
            from mage_ai.cache.tag import TagCache

            tag_cache = await TagCache.initialize_cache()
            for tag_uuid in tags:
                tag_cache.add_pipeline(tag_uuid, duplicate_pipeline)
        if blocks:
            from mage_ai.cache.block import BlockCache

            block_cache = await BlockCache.initialize_cache()
            for block in blocks:
                block_cache.add_pipeline(block, duplicate_pipeline)

        return cls.get(
            duplicate_pipeline_uuid,
            repo_path=duplicate_pipeline.repo_path,
        )

    @classmethod
    def exists(self, uuid, repo_path: str = None):
        return os.path.exists(
            os.path.join(
                repo_path or get_repo_path(),
                PIPELINES_FOLDER,
                uuid,
            ),
        )

    @classmethod
    def get(
        self,
        uuid,
        repo_path: str = None,
        check_if_exists: bool = False,
        all_projects: bool = False,
        use_repo_path: bool = False,
    ):
        from mage_ai.data_preparation.models.pipelines.integration_pipeline import (
            IntegrationPipeline,
        )

        if all_projects and not use_repo_path and project_platform_activated():
            from mage_ai.settings.platform.utils import get_pipeline_config_path

            config_path, repo_path = get_pipeline_config_path(uuid)
        else:
            repo_path = repo_path or get_repo_path()
            config_path = os.path.join(
                repo_path,
                PIPELINES_FOLDER,
                uuid,
            )

        if check_if_exists and not os.path.exists(config_path):
            return None

        pipeline = self(uuid, repo_path=repo_path, use_repo_path=use_repo_path)
        if PipelineType.INTEGRATION == pipeline.type:
            pipeline = IntegrationPipeline(uuid, repo_path=repo_path)

        return pipeline

    @classmethod
    async def load_metadata(
        self,
        uuid: str,
        repo_path: str = None,
        raise_exception: bool = True,
    ) -> Dict:
        """Load pipeline metadata dictionary.

        Args:
            uuid (str): Pipeline uuid.
            repo_path (str, optional): The project path.
            raise_exception (bool, optional): Whether to raise Exception.
                If raise_exception = False, return None as the config when exception happens.
        """
        include_repo_path = repo_path is not None
        repo_path = repo_path or get_repo_path()
        config_path = os.path.join(
            repo_path,
            PIPELINES_FOLDER,
            uuid,
            PIPELINE_CONFIG_FILE,
        )

        try:
            if not os.path.exists(config_path):
                raise Exception(f'Pipeline {uuid} does not exist.')

            config = None
            async with aiofiles.open(config_path, mode='r') as f:
                config = yaml.safe_load(await f.read()) or {}
        except Exception as e:
            if raise_exception:
                raise e
            config = None

        if include_repo_path and config:
            config['repo_path'] = repo_path

        return config

    @classmethod
    async def get_async(
        self,
        uuid,
        repo_path: str = None,
        all_projects: bool = False,
        use_repo_path: bool = False,
    ):
        from mage_ai.data_preparation.models.pipelines.integration_pipeline import (
            IntegrationPipeline,
        )

        if all_projects and not use_repo_path and project_platform_activated():
            from mage_ai.settings.platform.utils import get_pipeline_config_path

            config_path, repo_path = get_pipeline_config_path(uuid)
        else:
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
            config = yaml.safe_load(await f.read()) or {}

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
                        print('pipeline.get_async')
                        print(err)
            pipeline = IntegrationPipeline(
                uuid,
                catalog=catalog,
                config=config,
                repo_path=repo_path,
                use_repo_path=use_repo_path,
            )
        else:
            pipeline = self(uuid, repo_path=repo_path, config=config, use_repo_path=use_repo_path)
        return pipeline

    @classmethod
    def get_all_pipelines_all_projects(
        self,
        *args,
        **kwargs,
    ) -> Union[List[str], List[Tuple[str, str]]]:
        if project_platform_activated():
            repo_paths = [d.get(
                'full_path',
            ) for d in build_repo_path_for_all_projects(mage_projects_only=True).values()]

            return Pipeline.get_all_pipelines(
                *args,
                repo_paths=repo_paths,
                **kwargs,
            )
        return Pipeline.get_all_pipelines(*args, **kwargs)

    @classmethod
    def get_all_pipelines(
        self,
        repo_path: str = None,
        repo_paths: List[str] = None,
        disable_pipelines_folder_creation: bool = False,
        include_repo_path: bool = False,
    ) -> Union[List[str], List[Tuple[str, str]]]:
        arr = []

        paths = []
        if repo_path:
            paths.append(repo_path)
        if repo_paths:
            paths.extend(repo_paths)

        for path in paths:
            pipelines_folder = os.path.join(path, PIPELINES_FOLDER)
            pipelines_folder_exists = os.path.exists(pipelines_folder)
            if not pipelines_folder_exists and not disable_pipelines_folder_creation:
                if os.path.exists(os.path.dirname(pipelines_folder)):
                    os.mkdir(pipelines_folder)
                    pipelines_folder_exists = True

            if pipelines_folder_exists:
                arr.extend([
                    (d, path) if include_repo_path else d
                    for d in os.listdir(pipelines_folder)
                    if self.is_valid_pipeline(os.path.join(pipelines_folder, d))
                ])

        return arr

    @classmethod
    def get_pipelines_by_block(self, block, repo_path=None, widget=False) -> List['Pipeline']:
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
            os.path.join(pipeline_path, PIPELINE_CONFIG_FILE)
        )

    def block_deletable(self, block, widget=False):
        mapping = {}
        if widget:
            mapping = self.widgets_by_uuid
        elif BlockType.EXTENSION == block.type and block.extension_uuid:
            if block.extension_uuid not in self.extensions:
                self.extensions[block.extension_uuid] = {}
            mapping = self.extensions[block.extension_uuid].get('blocks_by_uuid', {})
        elif BlockType.CALLBACK == block.type:
            mapping = self.callbacks_by_uuid
        else:
            mapping = self.blocks_by_uuid

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
        update_status: bool = True,
    ) -> None:
        """
        Function for synchronous block processing.
        This function will schedule the block execution in topological
        order based on a block's upstream dependencies.
        """
        if self.type == PipelineType.STREAMING:
            from mage_ai.data_preparation.executors.streaming_pipeline_executor import (
                StreamingPipelineExecutor,
            )
            StreamingPipelineExecutor(self).execute(
                build_block_output_stdout=build_block_output_stdout,
                global_vars=global_vars,
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
                update_status=update_status,
            )

    def get_config_from_yaml(self):
        if not os.path.exists(self.config_path):
            raise Exception(f'Pipeline {self.uuid} does not exist in repo_path {self.repo_path}.')
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
        if not config:
            raise Exception(f'Invalid pipeline config: {config}')
        if catalog is None:
            self.data_integration = config.get('data_integration')
        else:
            self.data_integration = catalog
        self.name = config.get('name')
        self.description = config.get('description')
        try:
            self._executor_count = int(config.get('executor_count'))
        except Exception:
            pass
        self.created_at = config.get('created_at')
        self.type = config.get('type') or self.type

        self.block_configs = config.get('blocks') or []
        self.cache_block_output_in_memory = config.get('cache_block_output_in_memory', False)
        self.callback_configs = config.get('callbacks') or []
        self.concurrency_config = config.get('concurrency_config') or dict()
        self.conditional_configs = config.get('conditionals') or []
        self.executor_config = config.get('executor_config') or {}
        self.executor_type = config.get('executor_type')
        self.notification_config = config.get('notification_config') or {}
        self.retry_config = config.get('retry_config') or {}
        self.run_pipeline_in_one_process = config.get('run_pipeline_in_one_process', False)
        self.settings = PipelineSettings.load(**config.get('settings') or {})
        self.spark_config = config.get('spark_config') or {}
        self.tags = config.get('tags') or []
        self.widget_configs = config.get('widgets') or []

        self.variables = config.get('variables')

        def build_shared_args_kwargs(c):
            block_type = c.get('type')

            if block_type not in [b.value for b in BlockType]:
                raise Exception(
                    f'Error loading pipeline ({self.uuid}): Invalid block type ({block_type})',
                )

            language = c.get('language')
            return Block.block_class_from_type(block_type, language=language, pipeline=self)(
                c.get('name'),
                c.get('uuid'),
                block_type,
                block_color=c.get('color'),
                configuration=c.get('configuration'),
                content=c.get('content'),
                executor_config=c.get('executor_config'),
                executor_type=c.get('executor_type', ExecutorType.LOCAL_PYTHON),
                extension_uuid=c.get('extension_uuid'),
                has_callback=c.get('has_callback'),
                language=c.get('language'),
                pipeline=self,
                replicated_block=c.get('replicated_block'),
                repo_config=self.repo_config,
                retry_config=c.get('retry_config'),
                status=c.get('status'),
                timeout=c.get('timeout'),
            )

        blocks = [build_shared_args_kwargs(c) for c in self.block_configs]
        callbacks = [build_shared_args_kwargs(c) for c in self.callback_configs]
        conditionals = [build_shared_args_kwargs(c) for c in self.conditional_configs]
        widgets = [build_shared_args_kwargs(c) for c in self.widget_configs]
        all_blocks = blocks + callbacks + conditionals + widgets

        self.blocks_by_uuid = self.__initialize_blocks_by_uuid(
            self.block_configs,
            blocks,
            all_blocks,
        )
        self.callbacks_by_uuid = self.__initialize_blocks_by_uuid(
            self.callback_configs,
            callbacks,
            all_blocks,
        )
        self.conditionals_by_uuid = self.__initialize_blocks_by_uuid(
            self.conditional_configs,
            conditionals,
            all_blocks,
        )
        self.widgets_by_uuid = self.__initialize_blocks_by_uuid(
            self.widget_configs,
            widgets,
            all_blocks,
        )

        for extension_uuid, extension_config in config.get('extensions', {}).items():
            extension_configs = extension_config.get('blocks') or []
            extension_blocks = [build_shared_args_kwargs(merge_dict(c, dict(
                extension_uuid=extension_uuid,
            ))) for c in extension_configs]

            self.extensions[extension_uuid] = merge_dict(extension_config, dict(
                blocks_by_uuid=self.__initialize_blocks_by_uuid(
                    extension_configs,
                    extension_blocks,
                    all_blocks,
                ),
            ))

        blocks_with_callbacks = {}
        for callback_block in self.callbacks_by_uuid.values():
            for upstream_block in callback_block.upstream_blocks:
                if upstream_block.uuid not in blocks_with_callbacks:
                    blocks_with_callbacks[upstream_block.uuid] = []
                blocks_with_callbacks[upstream_block.uuid].append(callback_block)

        blocks_with_conditionals = {}
        for conditional_block in self.conditionals_by_uuid.values():
            for upstream_block in conditional_block.upstream_blocks:
                if upstream_block.uuid not in blocks_with_conditionals:
                    blocks_with_conditionals[upstream_block.uuid] = []
                blocks_with_conditionals[upstream_block.uuid].append(conditional_block)

        for block in self.blocks_by_uuid.values():
            block.callback_blocks = blocks_with_callbacks.get(block.uuid, [])
            block.conditional_blocks = blocks_with_conditionals.get(block.uuid, [])

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
            cache_block_output_in_memory=self.cache_block_output_in_memory,
            concurrency_config=self.concurrency_config,
            created_at=self.created_at,
            data_integration=self.data_integration if not exclude_data_integration else None,
            description=self.description,
            executor_config=self.executor_config,
            executor_count=self.executor_count,
            executor_type=self.executor_type,
            name=self.name,
            notification_config=self.notification_config,
            remote_variables_dir=self.remote_variables_dir,
            retry_config=self.retry_config,
            run_pipeline_in_one_process=self.run_pipeline_in_one_process,
            settings=self.settings.to_dict() if self.settings else self.settings,
            tags=self.tags,
            type=self.type.value if type(self.type) is not str else self.type,
            uuid=self.uuid,
            variables_dir=self.variables_dir,
        )

        if self.variables is not None:
            base['variables'] = self.variables

        if self.spark_config is not None:
            base['spark_config'] = self.spark_config

        return base

    def to_dict(
        self,
        include_content: bool = False,
        include_extensions: bool = False,
        include_outputs: bool = False,
        include_outputs_spark: bool = False,
        sample_count: int = None,
        exclude_data_integration: bool = False,
    ) -> Dict:
        shared_kwargs = dict(
            include_content=include_content,
            include_outputs=include_outputs,
            sample_count=sample_count,
            check_if_file_exists=True,
        )

        blocks_data = [b.to_dict(**shared_kwargs) for b in self.blocks_by_uuid.values()]
        callbacks_data = [b.to_dict(**shared_kwargs) for b in self.callbacks_by_uuid.values()]
        conditionals_data = [b.to_dict(**shared_kwargs) for b in self.conditionals_by_uuid.values()]
        widgets_data = [b.to_dict(**shared_kwargs) for b in self.widgets_by_uuid.values()]

        data = dict(
            blocks=blocks_data,
            callbacks=callbacks_data,
            conditionals=conditionals_data,
            widgets=widgets_data,
        )

        if include_extensions:
            extensions_data = {}
            for extension_uuid, extension in self.extensions.items():
                blocks = []
                if 'blocks_by_uuid' in extension:
                    blocks = [
                        b.to_dict(
                            include_content=include_content,
                            include_outputs=include_outputs,
                            include_outputs_spark=include_outputs_spark,
                            sample_count=sample_count,
                          ) for b in extension['blocks_by_uuid'].values()
                    ]
                extensions_data[extension_uuid] = merge_dict(
                    ignore_keys(extension, [
                        'blocks',
                        'blocks_by_uuid',
                    ]),
                    dict(
                        blocks=blocks,
                    ),
                )
            data.update(extensions=extensions_data)

        return merge_dict(
            self.to_dict_base(exclude_data_integration=exclude_data_integration),
            data,
        )

    async def to_dict_async(
        self,
        include_block_catalog: bool = False,
        include_block_metadata: bool = False,
        include_block_pipelines: bool = False,
        include_block_tags: bool = False,
        include_callback_blocks: bool = False,
        include_conditional_blocks: bool = False,
        include_content: bool = False,
        include_extensions: bool = False,
        include_outputs: bool = False,
        include_outputs_spark: bool = False,
        sample_count: int = None,
    ):
        shared_kwargs = dict(
            check_if_file_exists=True,
            include_block_metadata=include_block_metadata,
            include_block_tags=include_block_tags,
            include_callback_blocks=include_callback_blocks,
            include_conditional_blocks=include_conditional_blocks,
            include_content=include_content,
            include_outputs=include_outputs,
            sample_count=sample_count,
        )
        blocks_data = await asyncio.gather(
            *[b.to_dict_async(**merge_dict(shared_kwargs, dict(
                include_block_catalog=include_block_catalog,
                include_block_pipelines=include_block_pipelines,
                include_outputs_spark=include_outputs_spark,
            ))) for b in self.blocks_by_uuid.values()]
        )
        callbacks_data = await asyncio.gather(
            *[b.to_dict_async(**shared_kwargs) for b in self.callbacks_by_uuid.values()]
        )
        conditionals_data = await asyncio.gather(
            *[b.to_dict_async(**shared_kwargs) for b in self.conditionals_by_uuid.values()]
        )
        widgets_data = await asyncio.gather(
            *[b.to_dict_async(
                include_content=include_content,
                include_outputs=include_outputs,
                sample_count=sample_count,
              ) for b in self.widgets_by_uuid.values()]
        )
        data = dict(
            blocks=blocks_data,
            callbacks=callbacks_data,
            conditionals=conditionals_data,
            widgets=widgets_data,
        )

        if include_extensions:
            extensions_data = {}
            for extension_uuid, extension in self.extensions.items():
                blocks = []
                if 'blocks_by_uuid' in extension:
                    blocks = await asyncio.gather(
                        *[b.to_dict_async(
                            include_content=include_content,
                            include_outputs=include_outputs,
                            sample_count=sample_count,
                          ) for b in extension['blocks_by_uuid'].values()]
                    )
                extensions_data[extension_uuid] = merge_dict(
                    ignore_keys(extension, [
                        'blocks',
                        'blocks_by_uuid',
                    ]),
                    dict(
                        blocks=blocks,
                    ),
                )
            data.update(extensions=extensions_data)

        return merge_dict(self.to_dict_base(), data)

    async def update(self, data, update_content=False):
        from mage_ai.orchestration.db.models.utils import (
            transfer_related_models_for_pipeline,
        )

        old_uuid = None
        blocks_to_remove_from_cache = []
        block_uuids_to_add_to_cache = []
        should_update_block_cache = False
        should_update_tag_cache = False

        if 'name' in data and self.name and data['name'] != self.name:
            """
            Rename pipeline folder
            """
            old_uuid = self.uuid
            new_name = data['name']
            new_uuid = clean_name(new_name)

            all_pipelines = self.get_all_pipelines(self.repo_path)
            if new_uuid in all_pipelines:
                raise Exception(f'Pipeline {new_uuid} already exists. Choose a different name.')

            old_pipeline_path = self.dir_path
            self.name = new_name
            self.uuid = new_uuid
            new_pipeline_path = self.dir_path
            os.rename(old_pipeline_path, new_pipeline_path)
            await self.save_async()
            transfer_related_models_for_pipeline(old_uuid, new_uuid)

            # Update pipeline secrets directory.
            try:
                rename_pipeline_secrets_dir(get_project_uuid(), old_uuid, new_uuid)
            except Exception as err:
                print(f'Could not rename pipeline secrets directory with error: {str(err)}')

            should_update_block_cache = True
            should_update_tag_cache = True

            cache = PipelineCache()
            cache.move_model(dict(uuid=new_uuid), dict(uuid=old_uuid))

        should_save = False

        if 'extensions' in data:
            for extension_uuid, extension in data['extensions'].items():
                if extension_uuid not in self.extensions:
                    self.extensions[extension_uuid] = {}
                self.extensions[extension_uuid] = merge_dict(
                    self.extensions[extension_uuid],
                    extension,
                )
            should_save = True

        if 'tags' in data:
            new_tags = data.get('tags', [])
            old_tags = self.tags or []

            if sorted(new_tags) != sorted(old_tags):
                self.tags = new_tags
                should_save = True
                should_update_tag_cache = True

        for key in [
            'description',
            'type',
        ]:
            if key in data and data.get(key) != getattr(self, key):
                setattr(self, key, data.get(key))
                should_save = True
                should_update_block_cache = True

        for key in [
            'cache_block_output_in_memory',
            'data_integration',
            'executor_type',
            'retry_config',
            'run_pipeline_in_one_process',
        ]:
            if key in data:
                setattr(self, key, data.get(key))
                should_save = True

        if 'settings' in data:
            self.settings = PipelineSettings.load(**(data.get('settings') or {}))
            should_save = True

        blocks = data.get('blocks', [])

        if blocks:
            should_reorder = self.__update_block_order(blocks)
            if should_reorder and not should_save:
                should_save = True

        if should_save:
            await self.save_async()

        if update_content:
            block_uuid_mapping = dict()

            arr = []

            if blocks:
                arr.append(('blocks', blocks, self.blocks_by_uuid))

            if 'callbacks' in data:
                arr.append(('callbacks', data['callbacks'], self.callbacks_by_uuid))

            if 'conditionals' in data:
                arr.append(('conditionals', data['conditionals'], self.conditionals_by_uuid))

            if 'widgets' in data:
                arr.append(('widgets', data['widgets'], self.widgets_by_uuid))

            if 'extensions' in data:
                for extension_uuid, extension in data['extensions'].items():
                    if 'blocks' in extension:
                        arr.append((
                            'extension_blocks',
                            extension['blocks'],
                            self.extensions.get(extension_uuid, {}).get('blocks_by_uuid', {}),
                        ))

            global_hooks = None
            if len(arr) >= 1:
                if Project.is_feature_enabled_in_root_or_active_project(FeatureUUID.GLOBAL_HOOKS):
                    from mage_ai.data_preparation.models.global_hooks.models import (
                        GlobalHooks,
                    )

                    global_hooks = GlobalHooks.load_from_file()

            for tup in arr:
                key, blocks_arr, mapping = tup
                widget = key == 'widgets'
                should_save_async = False
                cache_block_action_object = None

                for block_data in blocks_arr:
                    if 'uuid' not in block_data:
                        continue

                    block = mapping.get(block_data['uuid'])
                    if block is None:
                        continue

                    if global_hooks:
                        from mage_ai.data_preparation.models.global_hooks.models import (
                            HookOperation,
                            HookStage,
                        )

                        hooks = global_hooks.get_and_run_hooks(
                            operation_resource=block,
                            operation_types=[HookOperation.UPDATE_ANYWHERE],
                            resource_type=EntityName.Block,
                            stage=HookStage.BEFORE,
                            payload=block_data,
                        )

                        if hooks:
                            for hook in (hooks or []):
                                output = hook.output
                                if not output:
                                    continue

                                if output.get('payload'):
                                    value = output.get('payload') or {}
                                    if isinstance(value, dict):
                                        block_data = merge_dict(block_data, value)

                    if 'content' in block_data:
                        from mage_ai.cache.block_action_object import (
                            BlockActionObjectCache,
                        )

                        old_block_content = await block.content_async()
                        if block_data['content'] != old_block_content:
                            if cache_block_action_object is None:
                                cache_block_action_object = \
                                    await BlockActionObjectCache.initialize_cache()

                            await block.update_content_async(block_data['content'], widget=widget)

                            cache_block_action_object.update_block(block)

                    if 'callback_content' in block_data \
                            and block.callback_block:
                        await block.callback_block.update_content_async(
                            block_data['callback_content'],
                            widget=widget,
                        )
                    if 'outputs' in block_data:
                        if not is_dynamic_block(block) and not is_dynamic_block_child(block):
                            await block.save_outputs_async(
                                block_data['outputs'],
                                override=True,
                            )

                    name = block_data.get('name')

                    if block_data.get('has_callback') is not None:
                        block.update(extract(block_data, ['has_callback']))

                    color = block_data.get('color')
                    if color is not None and color != block.color:
                        block.update(extract(block_data, ['color']))

                    configuration = block_data.get('configuration')
                    if configuration:
                        block.configuration = configuration
                        should_save_async = should_save_async or True

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

                        should_save_async = should_save_async or True
                    elif name and name != block.name:
                        from mage_ai.cache.block_action_object import (
                            BlockActionObjectCache,
                        )

                        if cache_block_action_object is None:
                            cache_block_action_object = \
                                await BlockActionObjectCache.initialize_cache()
                        cache_block_action_object.update_block(block, remove=True)

                        block_update_payload = extract(block_data, ['name'])
                        configuration = copy.deepcopy(block_data).get('configuration', {})
                        file_path = (configuration.get('file_source') or {}).get('path')
                        if file_path:
                            # Check for block name with period to avoid replacing a directory name
                            new_file_path = file_path.replace(f'{block.name}.', f'{name}.')
                            configuration['file_source']['path'] = new_file_path
                            block_update_payload['configuration'] = configuration
                        blocks_to_remove_from_cache.append(block.to_dict())
                        block.update(
                            block_update_payload,
                            detach=block_data.get('detach', False)
                        )

                        block_uuids_to_add_to_cache.append(block.uuid)
                        cache_block_action_object.update_block(block)
                        block_uuid_mapping[block_data.get('uuid')] = block.uuid
                        should_update_block_cache = True
                        should_save_async = should_save_async or True

                if should_save_async:
                    await self.save_async(
                        block_type=block.type,
                        widget=widget,
                    )

        # If there are any dbt blocks which could receive an upstream df
        # we need to update mage_sources.yml
        if any(
            (
                BlockType.DBT != block.type and
                block.language in [BlockLanguage.SQL, BlockLanguage.PYTHON, BlockLanguage.R] and
                any(
                    BlockType.DBT == downstream_block.type
                    for downstream_block in block.downstream_blocks
                )
            )
            for _uuid, block in self.blocks_by_uuid.items()
        ):
            from mage_ai.data_preparation.models.block.dbt import DBTBlock

            DBTBlock.update_sources(self.blocks_by_uuid, variables=self.variables)

        if should_update_block_cache:
            from mage_ai.cache.block import BlockCache

            cache = await BlockCache.initialize_cache()

            for block_dict in blocks_to_remove_from_cache:
                cache.remove_pipeline(
                    block_dict,
                    self.uuid,
                    self.repo_path,
                )

            for block in self.blocks_by_uuid.values():
                if block_uuids_to_add_to_cache and block.uuid not in block_uuids_to_add_to_cache:
                    continue

                if old_uuid:
                    cache.remove_pipeline(
                        block.to_dict(),
                        old_uuid,
                        self.repo_path,
                    )
                cache.update_pipeline(block.to_dict(), self)

        if should_update_tag_cache:
            from mage_ai.cache.tag import TagCache

            cache = await TagCache.initialize_cache()

            for tag_uuid in self.tags:
                if old_uuid:
                    cache.remove_pipeline(tag_uuid, old_uuid, self.repo_path)
                cache.add_pipeline(tag_uuid, self)

    @classmethod
    def __find_pipeline_file(
        self,
        root_dir: str,
        file_name: str,
        sub_folder: str = None,
    ) -> str:
        """
        Searches for a file with a specified name in the provided directory and its subdirectories.
        Used in the pipeline import process for looking up files in the pipeline zip.

        Args:
            root_dir (str): The root directory where the search takes place.
            file_name (str): Name of the file to search for.
            sub_folder (str, optional): Folder parameter used for situations where
                the file is enclosed in a child folder,
                e.g., "pipelines/[pipeline_name]/metadata.yaml",
                where `pipelines` is the sub_folder.

        Returns:
            str or None: Path of the found file, or None if not found.

        Examples:
            >>> __find_pipeline_file('path/to/dir', 'file.txt')
            'path/to/dir/file.txt'

            >>> __find_pipeline_file('path/to/dir', 'metadata.yaml', 'pipelines')
            'path/to/dir/pipelines/[pipeline_name]/metadata.yaml'
        """
        file_path = os.path.join(root_dir, file_name)

        if not os.path.exists(file_path) and sub_folder:
            walk_start = os.path.join(root_dir, sub_folder)
            file_gen = (os.path.join(root, file_name) for root, _, _ in os.walk(walk_start))
            file_path = next(
                (potential_path for potential_path in file_gen if os.path.exists(potential_path)),
                None,
            )
        return file_path

    @classmethod
    def __update_pipeline_yaml(
        self, tmp_dir: str, overwrite: bool = False
    ) -> Tuple[List[str], Dict]:
        """
        Updates the pipeline config yaml during the import process.
        Modifies pipeline and block names in case of name conflict.
        Updates each block`s upstream and downstream references.
        Compiles list of files to be writen in bulk at the end of the import process.

        Args:
            tmp_dir (str): the temporary directory in which the pipeline files reside
            overwrite (bool): whether to overwrite any existing pipelines with the same uuid

        Returns:
            tuple:
                - files_to_be_written: a list of tuples containing the source and destination paths
                    for each resource needed to be writen at the end of the import process
                - config (dict): the pipeline config fetched from the zip file
        """
        config_zip_path = self.__find_pipeline_file(
            tmp_dir, PIPELINE_CONFIG_FILE, PIPELINES_FOLDER
        )
        if config_zip_path is None or not os.path.exists(config_zip_path):
            raise InvalidPipelineZipError

        files_to_be_written = []
        with open(config_zip_path, 'r') as pipeline_config:

            config = yaml.safe_load(pipeline_config)

            # check if pipeline exists with same uuid and generate new one if necessary
            if not overwrite:
                uuid = config['uuid']
                index = 0
                while self.exists(uuid):
                    index += 1
                    uuid = f'{config["uuid"]}_{index}'
                config['uuid'] = uuid
                config['name'] = uuid

            pipe_f_path = os.path.join(get_repo_path(), PIPELINES_FOLDER, config['uuid'])
            config_destination_path = os.path.join(pipe_f_path, PIPELINE_CONFIG_FILE)
            files_to_be_written.append((config_zip_path, config_destination_path))

            # retain block upstream and downstream references
            block_hierarchy = {
                block['uuid']: {key: [] for key in ['upstream_blocks', 'downstream_blocks']}
                for block in config['blocks']
            }

            for b_index, block in enumerate(config['blocks']):
                name = block['name']
                uuid = block['uuid']
                block_type = block['type']
                language = block.get('language', 'python')
                configuration = block.get('configuration', {})

                block_inst = Block(name=name, uuid=uuid, block_type=block_type, language=language)

                # check if block exists with same uuid and generate new one if necessary
                if not overwrite:
                    index = 0
                    while block_inst.exists():
                        index += 1
                        block_inst.uuid = f'{block["uuid"]}_{index}'

                # save block
                block_destination_path = block_inst.file_path
                _, file_extension = os.path.splitext(block_destination_path)
                block_directory = os.path.basename(os.path.dirname(block_destination_path))
                block_zip_path = self.__find_pipeline_file(
                    tmp_dir, f'{uuid}{file_extension}', block_directory
                )

                if block_zip_path is None or not os.path.exists(block_zip_path):
                    raise InvalidPipelineZipError(f'Block {uuid} missing from zip file.')

                files_to_be_written.append((block_zip_path, block_destination_path))

                # save new block parameters
                file_path = (configuration.get('file_source') or {}).get('path')
                if file_path:
                    file_path = remove_base_repo_path(block_destination_path)
                    block['configuration']['file_source']['path'] = file_path
                block['uuid'] = block_inst.uuid
                block['name'] = block_inst.uuid
                config['blocks'][b_index] = block

                # modify upstream and downstream referencesd
                for upstr_name in block['upstream_blocks']:
                    block_hierarchy[upstr_name]['downstream_blocks'].append(block['uuid'])
                for downstr_name in block['downstream_blocks']:
                    block_hierarchy[downstr_name]['upstream_blocks'].append(block['uuid'])

            # save upstream and downstream references
            hierarchy_list = list(block_hierarchy.values())
            for b_index, block in enumerate(config['blocks']):
                block['upstream_blocks'] = hierarchy_list[b_index]['upstream_blocks']
                block['downstream_blocks'] = hierarchy_list[b_index]['downstream_blocks']

        # dump new config information back in temp folder
        with open(config_zip_path, 'w') as pipeline_config:
            yaml.dump(config, pipeline_config)

        return files_to_be_written, config

    def __update_block_order(self, blocks: List[Dict]) -> bool:
        uuids_new = [b['uuid'] for b in blocks if b]
        uuids_old = [b['uuid'] for b in self.block_configs if b]

        min_length = min(len(uuids_new), len(uuids_old))

        # If there are no blocks or the order has not changed
        if min_length == 0 or uuids_new[:min_length] == uuids_old[:min_length]:
            return False

        block_configs_by_uuids = index_by(lambda x: x['uuid'], self.block_configs)
        new_indexes_by_uuid = {uuid: index for index, uuid in enumerate(uuids_new)}

        block_configs = []
        blocks_by_uuid = {}

        for block_uuid in uuids_new:
            upstream_blocks = None
            upstream_blocks_reordered = None
            if block_uuid in block_configs_by_uuids:
                block_config = block_configs_by_uuids[block_uuid]

                # Sort upstream_blocks order based on new block order
                upstream_blocks = block_config['upstream_blocks']
                if len(upstream_blocks) > 1:
                    upstream_blocks_reordered = upstream_blocks.copy()
                    upstream_blocks_reordered.sort(key=lambda uuid: new_indexes_by_uuid[uuid])

                block_configs.append(block_config)

            if block_uuid in self.blocks_by_uuid:
                block = self.blocks_by_uuid[block_uuid]
                if upstream_blocks_reordered is not None and \
                        upstream_blocks != upstream_blocks_reordered:
                    block.update(
                        dict(upstream_blocks=upstream_blocks_reordered),
                        check_upstream_block_order=True,
                    )
                blocks_by_uuid[block_uuid] = block

        self.block_configs = block_configs
        self.blocks_by_uuid = blocks_by_uuid

        return True

    def __add_block_to_mapping(
        self,
        blocks_by_uuid,
        block,
        upstream_blocks,
        priority: int = None,
    ):
        mapping = blocks_by_uuid.copy()

        for upstream_block in upstream_blocks:
            upstream_block.downstream_blocks.append(block)
        block.update_upstream_blocks(upstream_blocks, variables=self.variables)
        block.pipeline = self
        if priority is None or priority >= len(mapping.keys()):
            mapping[block.uuid] = block
        else:
            block_list = list(mapping.items())
            block_list.insert(priority, (block.uuid, block))
            mapping = dict(block_list)

        return mapping

    def add_block(
        self,
        block: Block,
        upstream_block_uuids: List[str] = None,
        downstream_block_uuids: List[str] = None,
        priority: int = None,
        widget: bool = False,
    ) -> Block:
        if upstream_block_uuids is None:
            upstream_block_uuids = []

        all_block_uuids = {b.get('uuid') for b in self.all_block_configs}
        if block.uuid in all_block_uuids:
            raise InvalidPipelineError(
                f'Block with uuid {block.uuid} already exists in pipeline {self.uuid}')

        if widget:
            self.widgets_by_uuid = self.__add_block_to_mapping(
                self.widgets_by_uuid,
                block,
                # All blocks will depend on non-widget type blocks
                upstream_blocks=self.get_blocks(upstream_block_uuids, widget=False),
                priority=priority,
            )
        elif BlockType.EXTENSION == block.type:
            extension_uuid = block.extension_uuid
            if extension_uuid not in self.extensions:
                self.extensions[extension_uuid] = {}

            blocks_by_uuid = self.extensions[extension_uuid].get('blocks_by_uuid', {})

            self.extensions[extension_uuid]['blocks_by_uuid'] = self.__add_block_to_mapping(
                blocks_by_uuid,
                block,
                upstream_blocks=self.get_blocks(upstream_block_uuids),
                priority=priority,
            )
        elif BlockType.CALLBACK == block.type:
            self.callbacks_by_uuid = self.__add_block_to_mapping(
                self.callbacks_by_uuid,
                block,
                upstream_blocks=self.get_blocks(upstream_block_uuids),
                priority=priority,
            )
        elif BlockType.CONDITIONAL == block.type:
            self.conditionals_by_uuid = self.__add_block_to_mapping(
                self.conditionals_by_uuid,
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

        if downstream_block_uuids:
            for downstream_block_uuid in downstream_block_uuids:
                downstream_block = self.get_block(downstream_block_uuid)
                if not downstream_block:
                    continue

                self.update_block(
                    downstream_block,
                    upstream_block_uuids=(
                        downstream_block.upstream_block_uuids or []
                    ) + [block.uuid],
                )

        self.validate('A cycle was formed while adding a block')
        self.save()
        return block

    def get_block(
        self,
        block_uuid: str,
        block_type: str = None,
        check_template: bool = False,
        extension_uuid: str = None,
        widget: bool = False,
    ) -> Block:
        mapping = {}
        if widget:
            mapping = self.widgets_by_uuid
        elif extension_uuid:
            mapping = self.extensions.get(extension_uuid, {}).get('blocks_by_uuid', {})
        elif BlockType.CALLBACK == block_type:
            mapping = self.callbacks_by_uuid
        elif BlockType.CONDITIONAL == block_type:
            mapping = self.conditionals_by_uuid
        else:
            mapping = self.blocks_by_uuid

        block = mapping.get(block_uuid)
        if not block:
            # Dynamic blocks have the following block UUID convention: [block_uuid]:[index]
            # Data integration blocks have:
            #   [block UUID]:controller
            #   [block UUID]:[source UUID]:[stream]:[index]
            # Replica blocks have the following block UUID convention:
            # [block_uuid]:[replicated_block_uuid]
            block = mapping.get(block_uuid.split(':')[0])

        if not block:
            print(
                f'[ERROR] Pipeline.get_block: '
                f'block {block_uuid} with type {block_type} does not exist in '
                f'pipeline {self.uuid} for repo_path {self.repo_path}.'
            )

        return block

    def get_block_variable(
        self,
        block_uuid: str,
        variable_name: str,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_args: List[Any] = None,
        partition: str = None,
        raise_exception: bool = False,
        spark=None,
        index: int = None,
        sample_count: int = None,
        dynamic_block_index: int = None,
        dynamic_block_uuid: str = None,
    ):
        block = self.get_block(block_uuid)

        data_integration_settings = block.get_data_integration_settings(
            from_notebook=from_notebook,
            global_vars=global_vars,
            input_vars=input_args,
            partition=partition,
        )

        if data_integration_settings:
            return convert_outputs_to_data(
                block,
                data_integration_settings.get('catalog'),
                from_notebook=from_notebook,
                index=index,
                partition=partition,
                sample_count=sample_count,
                data_integration_uuid=data_integration_settings.get('data_integration_uuid'),
                stream_id=variable_name,
            )

        variable = block.get_variable(
            block_uuid=block_uuid,
            partition=partition,
            raise_exception=raise_exception,
            spark=spark,
            variable_uuid=variable_name,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
        )

        return variable

    def get_blocks(self, block_uuids, widget=False):
        mapping = self.widgets_by_uuid if widget else self.blocks_by_uuid
        return [mapping[uuid] for uuid in block_uuids if uuid in mapping]

    def get_executable_blocks(self):
        return [b for b in self.blocks_by_uuid.values() if b.executable]

    def get_executor_type(self) -> str:
        if self.executor_type:
            return Template(self.executor_type).render(**get_template_vars())
        return self.executor_type

    def has_block(self, block_uuid: str, block_type: str = None, extension_uuid: str = None):
        if extension_uuid:
            return self.extensions and \
                extension_uuid in self.extensions and \
                'blocks_by_uuid' in self.extensions[extension_uuid] and \
                block_uuid in self.extensions[extension_uuid]['blocks_by_uuid']
        elif BlockType.CALLBACK == block_type:
            return block_uuid in self.callbacks_by_uuid
        elif BlockType.CONDITIONAL == block_type:
            return block_uuid in self.conditionals_by_uuid

        return block_uuid in self.blocks_by_uuid

    def update_block(
        self,
        block: Block,
        callback_block_uuids: List[str] = None,
        check_upstream_block_order: bool = False,
        conditional_block_uuids: List[str] = None,
        downstream_block_uuids: List[str] = None,
        upstream_block_uuids: List[str] = None,
        widget: bool = False,
    ):
        save_kwargs = dict()

        extension_uuid = block.extension_uuid
        is_callback = BlockType.CALLBACK == block.type
        is_conditional = BlockType.CONDITIONAL == block.type
        is_extension = BlockType.EXTENSION == block.type

        if upstream_block_uuids is not None:
            curr_upstream_block_uuids = set(block.upstream_block_uuids)
            new_upstream_block_uuids = set(upstream_block_uuids)
            if curr_upstream_block_uuids != new_upstream_block_uuids or \
                (check_upstream_block_order and
                    block.upstream_block_uuids != upstream_block_uuids):
                # Only set upstream block’s downstream to the current block if current block
                # is not an extension block and not a callback/conditional block
                if not is_extension and not is_callback and not is_conditional:
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
                        if not find(lambda x: x.uuid == block.uuid, b.downstream_blocks):
                            b.downstream_blocks.append(block)

                    for b in upstream_blocks_removed:
                        b.downstream_blocks = [
                            db for db in b.downstream_blocks if db.uuid != block.uuid
                        ]

                # All blocks will depend on non-widget type blocks
                block.update_upstream_blocks(
                    self.get_blocks(upstream_block_uuids, widget=False),
                    variables=self.variables,
                )
        elif callback_block_uuids is not None:
            callback_blocks = []
            for callback_block_uuid in callback_block_uuids:
                callback_block = self.callbacks_by_uuid.get(callback_block_uuid)
                if not callback_block:
                    raise Exception(
                        f'Callback block {callback_block_uuid} is not in the {self.uuid} pipeline.',
                    )

                callback_blocks.append(callback_block)

            # Callback blocks don’t have an upstream.
            # The normal block will know about the callback block via the callback_blocks field.
            block.update_callback_blocks(callback_blocks)
        elif conditional_block_uuids is not None:
            conditional_blocks = []
            for conditional_block_uuid in conditional_block_uuids:
                conditional_block = self.callbacks_by_uuid.get(conditional_block_uuid)
                if not conditional_block:
                    raise Exception(
                        f'Conditional block {conditional_block_uuid}'
                        f' is not in the {self.uuid} pipeline.',
                    )

                conditional_blocks.append(conditional_block)

            # Conditional blocks don’t have an upstream.
            # The normal block will know about the conditional block via the
            # conditional_blocks field.
            block.update_conditional_blocks(conditional_blocks)
        elif downstream_block_uuids is not None:
            block_uuids_to_remove = \
                [uuid for uuid in block.downstream_block_uuids
                    if uuid not in downstream_block_uuids]

            for block_uuid in block_uuids_to_remove:
                block_inner = self.get_block(block_uuid)
                if not block_inner:
                    continue
                block_inner.update(
                    dict(
                        upstream_blocks=list(filter(
                            lambda x, uuid=block.uuid: x != uuid,
                            block_inner.upstream_block_uuids or [],
                        )),
                    ),
                    check_upstream_block_order=check_upstream_block_order,
                )

            for block_uuid in downstream_block_uuids:
                block_inner = self.get_block(block_uuid)
                if not block_inner:
                    continue
                block_inner.update(
                    dict(
                        upstream_blocks=(block_inner.upstream_block_uuids or []) + [block.uuid],
                    ),
                    check_upstream_block_order=check_upstream_block_order,
                )
        else:
            save_kwargs['block_uuid'] = block.uuid

        if widget:
            self.widgets_by_uuid[block.uuid] = block
        elif is_extension:
            if 'blocks_by_uuid' not in self.extensions[block.extension_uuid]:
                self.extensions[block.extension_uuid]['blocks_by_uuid'] = {}
            self.extensions[block.extension_uuid]['blocks_by_uuid'].update({
                block.uuid: block,
            })
        elif is_callback:
            self.callbacks_by_uuid[block.uuid] = block
        elif is_conditional:
            self.conditionals_by_uuid[block.uuid] = block
        else:
            self.blocks_by_uuid[block.uuid] = block

        self.validate('A cycle was formed while updating a block')
        self.save(
            block_type=block.type,
            extension_uuid=extension_uuid,
            widget=widget,
            **save_kwargs,
        )

        return block

    def update_block_uuid(self, block: str, old_uuid: str, widget: bool = False):
        new_uuid = block.uuid
        if new_uuid == old_uuid:
            return
        old_variables_path = Variable.dir_path(self.dir_path, old_uuid)
        if os.path.exists(old_variables_path):
            os.rename(
                old_variables_path,
                Variable.dir_path(self.dir_path, new_uuid),
            )

        if widget and old_uuid in self.widgets_by_uuid:
            self.widgets_by_uuid = {
                new_uuid if k == old_uuid else k: v for k, v in self.widgets_by_uuid.items()
            }
        elif BlockType.EXTENSION == block.type:
            blocks_by_uuid = self.extensions[block.extension_uuid].get('blocks_by_uuid', {})
            if old_uuid in blocks_by_uuid:
                self.extensions[block.extension_uuid]['blocks_by_uuid'] = {
                    new_uuid if k == old_uuid else k: v for k, v in blocks_by_uuid.items()
                }
        elif BlockType.CALLBACK == block.type:
            self.callbacks_by_uuid = {
                new_uuid if k == old_uuid else k: v for k, v in self.callbacks_by_uuid.items()
            }
        elif BlockType.CONDITIONAL == block.type:
            self.conditionals_by_uuid = {
                new_uuid if k == old_uuid else k: v for k, v in self.conditionals_by_uuid.items()
            }
        elif old_uuid in self.blocks_by_uuid:
            self.blocks_by_uuid = {
                new_uuid if k == old_uuid else k: v for k, v in self.blocks_by_uuid.items()
            }

        # Update the replicated_block value for all replication blocks for this current block.
        for block in self.blocks_by_uuid.values():
            if block.uuid == new_uuid:
                continue

            if block.replicated_block == old_uuid:
                block.replicated_block = new_uuid

        # Update the block directory name that is under the pipeline directory.
        # This block directory contains the catalog.json. For example:
        # pipelines/[pipeline_uuid]/[block_uuid]/catalog.json
        if block.is_data_integration():
            dir_old = block.get_block_data_integration_settings_directory_path(old_uuid)
            if os.path.isdir(dir_old):
                dir_new = block.get_block_data_integration_settings_directory_path(new_uuid)
                filenames = os.listdir(dir_old)
                if filenames:
                    os.makedirs(dir_new, exist_ok=True)

                for filename in filenames:
                    path_old = os.path.join(dir_old, filename)
                    path_new = os.path.join(dir_new, filename)
                    shutil.move(path_old, path_new)
                shutil.rmtree(dir_old)

        self.save()
        return block

    def update_global_variable(self, key, value):
        if not is_yaml_serializable(key, value):
            raise SerializationError(
                f'Failed to update variable {key} because the value is not serializable.')
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

        if os.path.exists(self.dir_path):
            shutil.rmtree(self.dir_path)

        # Delete secret directory when deleting pipeline
        try:
            delete_secrets_dir(Entity.PIPELINE, get_project_uuid(), self.uuid)
        except Exception as err:
            print(f'Could not delete secrets directory due to {str(err)}')

    def delete_block(
        self,
        block: Block,
        widget: bool = False,
        commit: bool = True,
        force: bool = False,
    ) -> None:
        is_callback = BlockType.CALLBACK == block.type
        is_conditional = BlockType.CONDITIONAL == block.type
        is_extension = BlockType.EXTENSION == block.type

        catalog_file_path = None
        is_data_integration = block.is_data_integration()
        if is_data_integration:
            catalog_file_path = block.get_catalog_file_path()

        mapping = {}
        if widget:
            mapping = self.widgets_by_uuid
        elif is_extension:
            mapping = self.extensions.get(block.extension_uuid, {}).get('blocks_by_uuid', {})
        elif is_callback:
            mapping = self.callbacks_by_uuid
        elif is_conditional:
            mapping = self.conditionals_by_uuid
        else:
            mapping = self.blocks_by_uuid

        if block.uuid not in mapping:
            raise Exception(f'Block {block.uuid} is not in pipeline {self.uuid}.')

        if len(block.downstream_blocks) > 0:
            downstream_block_uuids = [
                b.uuid for b in block.downstream_blocks if b.type != BlockType.CHART
            ]
            if self.type == PipelineType.INTEGRATION or force:
                for downstream_block in block.downstream_blocks:
                    upstream_block_uuids = list(filter(
                        lambda uuid: uuid != block.uuid,
                        downstream_block.upstream_block_uuids
                    ))
                    downstream_block.update(dict(
                        upstream_blocks=[*upstream_block_uuids, *block.upstream_block_uuids]
                    ))
            elif len(downstream_block_uuids) > 0:
                raise HasDownstreamDependencies(
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
        elif is_extension:
            del self.extensions[block.extension_uuid]['blocks_by_uuid'][block.uuid]
        elif is_callback:
            del self.callbacks_by_uuid[block.uuid]
        elif is_conditional:
            del self.conditionals_by_uuid[block.uuid]
        else:
            del self.blocks_by_uuid[block.uuid]

        if commit:
            self.save()

        if is_data_integration and catalog_file_path:
            dir_name = os.path.dirname(catalog_file_path)
            if os.path.exists(dir_name):
                shutil.rmtree(dir_name)

        return block

    def save(
        self,
        block_type: str = None,
        block_uuid: str = None,
        extension_uuid: str = None,
        widget: bool = False,
    ):
        blocks_current = sorted([b.uuid for b in self.blocks_by_uuid.values()])

        if block_uuid is not None:
            current_pipeline = Pipeline(self.uuid, self.repo_path)
            block = self.get_block(
                block_uuid,
                block_type=block_type,
                extension_uuid=extension_uuid,
                widget=widget,
            )

            if widget:
                current_pipeline.widgets_by_uuid[block_uuid] = block
            elif BlockType.EXTENSION == block.type:
                if extension_uuid not in self.extensions:
                    self.extensions[extension_uuid] = {}
                if 'blocks_by_uuid' not in self.extensions[extension_uuid]:
                    self.extensions[extension_uuid]['blocks_by_uuid'] = {}
                self.extensions[extension_uuid]['blocks_by_uuid'][block_uuid] = block
            elif BlockType.CALLBACK == block.type:
                current_pipeline.callbacks_by_uuid[block_uuid] = block
            elif BlockType.CONDITIONAL == block.type:
                current_pipeline.conditionals_by_uuid[block_uuid] = block
            else:
                current_pipeline.blocks_by_uuid[block_uuid] = block
            pipeline_dict = current_pipeline.to_dict(include_extensions=True)
        else:
            if self.data_integration is not None:
                with open(self.catalog_config_path, 'w') as fp:
                    json.dump(self.data_integration, fp)
            pipeline_dict = self.to_dict(
                exclude_data_integration=True,
                include_extensions=True,
            )
        if not pipeline_dict:
            raise Exception('Writing empty pipeline metadata is prevented.')

        blocks_updated = sorted([b['uuid'] for b in pipeline_dict.get('blocks', [])])

        if blocks_current != blocks_updated:
            raise Exception(
                'Blocks cannot be added or removed when saving content, please try again.',
            )

        content = yaml.dump(pipeline_dict)

        safe_write(self.config_path, content)

        File.create(
            PIPELINE_CONFIG_FILE,
            f'{PIPELINES_FOLDER}/{self.uuid}',
            content=content,
            repo_path=self.repo_path,
            file_version_only=True,
        )

    def should_save_trigger_in_code_automatically(self) -> bool:
        from mage_ai.data_preparation.models.project import Project

        if self.settings and \
                self.settings.triggers and \
                self.settings.triggers.save_in_code_automatically is not None:

            return self.settings.triggers.save_in_code_automatically

        project = Project(self.repo_config)

        return project.pipelines and \
            project.pipelines.settings and \
            project.pipelines.settings.triggers and \
            project.pipelines.settings.triggers.save_in_code_automatically

    async def save_async(
        self,
        block_type: str = None,
        block_uuid: str = None,
        extension_uuid: str = None,
        widget: bool = False,
    ) -> None:
        blocks_current = sorted([b.uuid for b in self.blocks_by_uuid.values()])

        if block_uuid is not None:
            current_pipeline = await Pipeline.get_async(self.uuid, self.repo_path)
            block = self.get_block(block_uuid, extension_uuid=extension_uuid, widget=widget)
            if widget:
                current_pipeline.widgets_by_uuid[block_uuid] = block
            elif extension_uuid:
                if extension_uuid not in self.extensions:
                    self.extensions[extension_uuid] = {}
                if 'blocks_by_uuid' not in self.extensions[extension_uuid]:
                    self.extensions[extension_uuid]['blocks_by_uuid'] = {}
                self.extensions[extension_uuid]['blocks_by_uuid'][block_uuid] = block
            elif BlockType.CALLBACK == block_type:
                current_pipeline.callbacks_by_uuid[block_uuid] = block
            elif BlockType.CONDITIONAL == block_type:
                current_pipeline.conditionals_by_uuid[block_uuid] = block
            else:
                current_pipeline.blocks_by_uuid[block_uuid] = block
            pipeline_dict = current_pipeline.to_dict(include_extensions=True)
        else:
            if self.data_integration is not None:
                async with aiofiles.open(self.catalog_config_path, mode='w') as fp:
                    await fp.write(json.dumps(self.data_integration))
            pipeline_dict = self.to_dict(
                exclude_data_integration=True,
                include_extensions=True,
            )
        if not pipeline_dict:
            raise Exception('Writing empty pipeline metadata is prevented.')

        blocks_updated = sorted([b['uuid'] for b in pipeline_dict.get('blocks', [])])

        if blocks_current != blocks_updated:
            raise Exception(
                'Blocks cannot be added or removed when saving content, please try again.',
            )

        content = yaml.dump(pipeline_dict)

        test_path = f'{self.config_path}.test'
        async with aiofiles.open(test_path, mode='w') as fp:
            await fp.write(content)

        if os.path.isfile(test_path):
            success = True
            with open(test_path, mode='r') as fp:
                try:
                    yaml.full_load(fp)
                except yaml.scanner.ScannerError:
                    success = False

            try:
                os.remove(test_path)
            except Exception as err:
                print('pipeline.save_async')
                print(err)

            if not success:
                raise Exception('Invalid pipeline metadata.yaml content, please try saving again.')

        await safe_write_async(self.config_path, content)

        await File.create_async(
            PIPELINE_CONFIG_FILE,
            f'{PIPELINES_FOLDER}/{self.uuid}',
            content=content,
            repo_path=self.repo_path,
            file_version_only=True,
        )

    def validate(self, error_msg=CYCLE_DETECTION_ERR_MESSAGE) -> None:
        """
        Validates whether pipeline is valid; there must exist no cycles in the pipeline.

        Args:
            error_msg (str): Error message to print if cycle is found.
            Defaults to 'A cycle was detected'
        """
        combined_blocks = dict()

        for extension in self.extensions.values():
            if 'blocks_by_uuid' not in extension:
                continue
            combined_blocks.update(extension['blocks_by_uuid'])

        combined_blocks.update(self.widgets_by_uuid)
        combined_blocks.update(self.callbacks_by_uuid)
        combined_blocks.update(self.conditionals_by_uuid)
        combined_blocks.update(self.blocks_by_uuid)
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

        check_block_uuids = set()
        for config in self.all_block_configs:
            uuid = config.get('uuid')
            if uuid in check_block_uuids:
                raise InvalidPipelineError(
                    f'Pipeline is invalid: duplicate blocks with uuid {uuid}')
            check_block_uuids.add(uuid)


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
