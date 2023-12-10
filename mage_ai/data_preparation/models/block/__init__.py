import asyncio
import functools
import importlib.util
import inspect
import json
import logging
import os
import sys
import time
import traceback
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from datetime import datetime
from inspect import Parameter, isfunction, signature
from logging import Logger
from queue import Queue
from typing import Any, Callable, Dict, Generator, List, Set, Tuple, Union

import pandas as pd
import simplejson
import yaml
from jinja2 import Template

import mage_ai.data_preparation.decorators
from mage_ai.cache.block import BlockCache
from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_integrations.sources.constants import SQL_SOURCES_MAPPING
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.data_integration.mixins import (
    DataIntegrationMixin,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    execute_data_integration,
)
from mage_ai.data_preparation.models.block.errors import HasDownstreamDependencies
from mage_ai.data_preparation.models.block.extension.utils import handle_run_tests
from mage_ai.data_preparation.models.block.spark.mixins import SparkBlock
from mage_ai.data_preparation.models.block.utils import (
    clean_name,
    fetch_input_variables,
    input_variables,
    is_dynamic_block,
    is_dynamic_block_child,
    is_output_variable,
    is_valid_print_variable,
    output_variables,
    should_reduce_output,
)
from mage_ai.data_preparation.models.constants import (
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    CALLBACK_STATUSES,
    CUSTOM_EXECUTION_BLOCK_TYPES,
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_ANALYSIS_MAX_ROWS,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
    NON_PIPELINE_EXECUTABLE_BLOCK_TYPES,
    BlockColor,
    BlockLanguage,
    BlockStatus,
    BlockType,
    CallbackStatus,
    ExecutorType,
    PipelineType,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.data_integrations.utils import get_templates
from mage_ai.data_preparation.templates.template import load_template
from mage_ai.data_preparation.templates.utils import get_variable_for_template
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.services.spark.config import SparkConfig
from mage_ai.services.spark.spark import get_spark_session
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.constants import ENV_DEV, ENV_TEST
from mage_ai.shared.environments import get_env, is_debug
from mage_ai.shared.hash import extract, ignore_keys, merge_dict
from mage_ai.shared.logger import BlockFunctionExec
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.strings import format_enum
from mage_ai.shared.utils import clean_name as clean_name_orig
from mage_ai.shared.utils import is_spark_env

PYTHON_COMMAND = 'python3'
BLOCK_EXISTS_ERROR = '[ERR_BLOCK_EXISTS]'


async def run_blocks(
    root_blocks: List['Block'],
    analyze_outputs: bool = False,
    build_block_output_stdout: Callable[..., object] = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    parallel: bool = True,
    run_sensors: bool = True,
    run_tests: bool = True,
    selected_blocks: Set[str] = None,
    update_status: bool = True,
) -> None:
    tries_by_block_uuid = {}
    tasks = dict()
    blocks = Queue()
    if global_vars is None:
        global_vars = dict()

    def create_block_task(block: 'Block') -> asyncio.Task:
        async def execute_and_run_tests() -> None:
            with BlockFunctionExec(
                block.uuid,
                f'Executing {block.type} block...',
                build_block_output_stdout=build_block_output_stdout,
            ):
                variables = global_vars
                if from_notebook:
                    logger = logging.getLogger(f'{block.uuid}_test')
                    logger.setLevel('INFO')
                    if 'logger' not in variables:
                        variables = {
                            'logger': logger,
                            **variables,
                        }
                await block.execute(
                    analyze_outputs=analyze_outputs,
                    build_block_output_stdout=build_block_output_stdout,
                    global_vars=variables,
                    run_all_blocks=True,
                    run_sensors=run_sensors,
                    update_status=update_status,
                    parallel=parallel,
                )

                if run_tests:
                    block.run_tests(
                        build_block_output_stdout=build_block_output_stdout,
                        global_vars=global_vars,
                        update_tests=False,
                    )

        return asyncio.create_task(execute_and_run_tests())

    for block in root_blocks:
        blocks.put(block)
        tasks[block.uuid] = None

    while not blocks.empty():
        block = blocks.get()

        if block.type in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES or \
                not run_sensors and block.type == BlockType.SENSOR:
            continue

        if tries_by_block_uuid.get(block.uuid, None) is None:
            tries_by_block_uuid[block.uuid] = 0

        tries_by_block_uuid[block.uuid] += 1
        tries = tries_by_block_uuid[block.uuid]
        if tries >= 1000:
            raise Exception(f'Block {block.uuid} has tried to execute {tries} times; exiting.')

        skip = False
        for upstream_block in block.upstream_blocks:
            if tasks.get(upstream_block.uuid) is None:
                blocks.put(block)
                skip = True
                break
        if skip:
            continue
        upstream_tasks = [tasks[u.uuid] for u in block.upstream_blocks]
        await asyncio.gather(*upstream_tasks)
        block_task = create_block_task(block)
        tasks[block.uuid] = block_task
        for downstream_block in block.downstream_blocks:
            if downstream_block.uuid not in tasks and (
                selected_blocks is None or upstream_block.uuid in selected_blocks
            ):
                tasks[downstream_block.uuid] = None
                blocks.put(downstream_block)
    remaining_tasks = filter(lambda task: task is not None, tasks.values())
    await asyncio.gather(*remaining_tasks)


def run_blocks_sync(
    root_blocks: List['Block'],
    analyze_outputs: bool = False,
    build_block_output_stdout: Callable[..., object] = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    run_sensors: bool = True,
    run_tests: bool = True,
    selected_blocks: Set[str] = None,
    update_status: bool = True,
) -> None:
    tries_by_block_uuid = {}
    tasks = dict()
    blocks = Queue()

    if global_vars is None:
        global_vars = dict()

    for block in root_blocks:
        blocks.put(block)
        tasks[block.uuid] = False

    while not blocks.empty():
        block = blocks.get()

        if block.type in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES:
            continue

        if tries_by_block_uuid.get(block.uuid, None) is None:
            tries_by_block_uuid[block.uuid] = 0

        tries_by_block_uuid[block.uuid] += 1
        tries = tries_by_block_uuid[block.uuid]
        if tries >= 1000:
            raise Exception(f'Block {block.uuid} has tried to execute {tries} times; exiting.')

        skip = False
        for upstream_block in block.upstream_blocks:
            upstream_task_status = tasks.get(upstream_block.uuid)
            if upstream_task_status is None or not upstream_task_status:
                blocks.put(block)
                skip = True
                break
        if skip:
            continue
        with BlockFunctionExec(
            block.uuid,
            f'Executing {block.type} block...',
            build_block_output_stdout=build_block_output_stdout,
        ):
            if from_notebook:
                logger = logging.getLogger(f'{block.uuid}_test')
                logger.setLevel('INFO')
                if 'logger' not in global_vars:
                    global_vars = {
                        'logger': logger,
                        **global_vars,
                    }
            block.execute_sync(
                analyze_outputs=analyze_outputs,
                build_block_output_stdout=build_block_output_stdout,
                from_notebook=not run_sensors,
                global_vars=global_vars,
                run_all_blocks=True,
                update_status=update_status,
            )

            if run_tests:
                block.run_tests(
                    build_block_output_stdout=build_block_output_stdout,
                    global_vars=global_vars,
                    update_tests=False,
                )
        tasks[block.uuid] = True
        for downstream_block in block.downstream_blocks:
            if downstream_block.uuid not in tasks and (
                selected_blocks is None or downstream_block.uuid in selected_blocks
            ):
                tasks[downstream_block.uuid] = None
                blocks.put(downstream_block)


class Block(DataIntegrationMixin, SparkBlock):
    def __init__(
        self,
        name: str,
        uuid: str,
        block_type: BlockType,
        block_color: BlockColor = None,
        content: str = None,
        executor_config: Dict = None,
        executor_type: ExecutorType = ExecutorType.LOCAL_PYTHON,
        extension_uuid: str = None,
        status: BlockStatus = BlockStatus.NOT_EXECUTED,
        pipeline=None,
        replicated_block: str = None,
        retry_config: Dict = None,
        language: BlockLanguage = BlockLanguage.PYTHON,
        configuration: Dict = None,
        has_callback: bool = False,
        hook=None,
        repo_config=None,
        timeout: int = None,
    ) -> None:
        if configuration is None:
            configuration = dict()
        self.name = name or uuid
        self._uuid = uuid
        self.type = block_type
        self._content = content
        self.executor_config = executor_config
        self.executor_type = executor_type
        self.extension_uuid = extension_uuid
        self.status = status
        self.pipeline = pipeline
        self.language = language or BlockLanguage.PYTHON
        self.color = block_color
        self.configuration = configuration
        self.has_callback = has_callback
        self.timeout = timeout
        self.retry_config = retry_config
        self.already_exists = None

        self._outputs = None
        self._outputs_loaded = False
        self.conditional_blocks = []
        self.callback_blocks = []
        self.upstream_blocks = []
        self.downstream_blocks = []
        self.test_functions = []
        self.global_vars = {}
        self.template_runtime_configuration = {}

        self.dynamic_block_index = None
        self.dynamic_block_uuid = None
        self.dynamic_upstream_block_uuids = None

        # Spark session
        self.spark = None
        self.spark_init = False

        # Replicate block
        self.replicated_block = replicated_block
        self.replicated_block_object = None
        if replicated_block:
            self.replicated_block_object = Block(
                self.replicated_block,
                self.replicated_block,
                self.type,
                language=self.language,
            )

        # Module for the block functions. Will be set when the block is executed from a notebook.
        self.module = None

        # This is used to memoize source UUID, destination UUID, selected streams, config, catalog
        self._data_integration = None
        self._data_integration_loaded = False
        # Used when interpolating upstream block outputs in YAML files
        self.fetched_inputs_from_blocks = None

        self.execution_timestamp_start = None
        self.execution_timestamp_end = None
        self.execution_uuid = None
        self._compute_service_uuid = None
        self._repo_config = repo_config
        self._spark_session_current = None
        self.global_vars = None
        self.hook = hook

    @property
    def uuid(self) -> str:
        return self._uuid

    @property
    def repo_config(self):
        if self._repo_config:
            return self._repo_config

        if self.pipeline:
            self._repo_config = self.pipeline.repo_config

        return self._repo_config

    @property
    def uuid_replicated(self) -> str:
        if self.replicated_block:
            return f'{self.uuid}:{self.replicated_block}'

    @uuid.setter
    def uuid(self, x) -> None:
        self._uuid = x

    @property
    def content(self) -> str:
        if self.replicated_block:
            self._content = self.replicated_block_object.content

        if self._content is None:
            self._content = self.file.content()

        return self._content

    @property
    def callback_block(self) -> 'CallbackBlock':
        if self.has_callback:
            callback_block_uuid = f'{clean_name_orig(self.uuid)}_callback'
            return CallbackBlock(
                callback_block_uuid,
                callback_block_uuid,
                BlockType.CALLBACK,
                pipeline=self.pipeline,
            )
        return None

    async def content_async(self) -> str:
        if self.replicated_block:
            self._content = await self.replicated_block_object.content_async()

        if self._content is None:
            self._content = await self.file.content_async()

        return self._content

    async def metadata_async(self) -> Dict:
        if self.is_data_integration():
            grouped_templates = get_templates(group_templates=True)

            if BlockLanguage.YAML == self.language:
                content = await self.content_async()
                if content:
                    variables = {}
                    if self.pipeline and self.pipeline.variables:
                        variables.update(self.pipeline.variables)

                    def _block_output(
                        block_uuid: str,
                        parse: str = None,
                        current_block=self,
                        global_vars=variables,
                    ) -> Any:
                        data = None

                        if not self.fetched_inputs_from_blocks:
                            input_vars_fetched, _kwargs_vars, _upstream_block_uuids = \
                                self.fetch_input_variables_and_catalog(
                                    None,
                                    None,
                                    global_vars=global_vars,
                                    from_notebook=True,
                                )
                            self.fetched_inputs_from_blocks = input_vars_fetched

                        if block_uuid in self.upstream_block_uuids and \
                                self.data_integration_inputs and \
                                block_uuid in self.data_integration_inputs:

                            up_uuids = [i for i in
                                        self.upstream_block_uuids if i in
                                        self.data_integration_inputs]

                            index = up_uuids.index(block_uuid)
                            data = self.fetched_inputs_from_blocks[index]

                        if parse:
                            results = {}
                            exec(f'_parse_func = {parse}', results)
                            try:
                                return results['_parse_func'](data)
                            except Exception:
                                pass

                        return data

                    text = Template(content).render(
                        block_output=_block_output,
                        variables=lambda x, p=None, v=variables: get_variable_for_template(
                            x,
                            parse=p,
                            variables=v,
                        ),
                        **get_template_vars(),
                    )

                    settings = yaml.safe_load(text)
                    uuid = settings.get('source') or settings.get('destination')
                    mapping = grouped_templates.get(uuid) or {}

                    di_metadata = merge_dict(
                        extract(mapping or {}, ['name']),
                        settings,
                    )
                    di_metadata['sql'] = uuid in SQL_SOURCES_MAPPING

                    return dict(
                        data_integration=di_metadata,
                    )
            elif BlockLanguage.PYTHON == self.language:
                try:
                    di_settings = self.get_data_integration_settings(
                        data_integration_uuid_only=True,
                        from_notebook=True,
                        global_vars=self.pipeline.variables if self.pipeline else None,
                    )
                    uuid = di_settings.get('data_integration_uuid')
                    mapping = grouped_templates.get(uuid) or {}

                    di_metadata = merge_dict(
                        extract(mapping or {}, ['name']),
                        ignore_keys(di_settings or {}, [
                            'catalog',
                            'config',
                            'data_integration_uuid',
                        ]),
                    )
                    di_metadata['sql'] = uuid in SQL_SOURCES_MAPPING

                    return dict(
                        data_integration=di_metadata,
                    )
                except Exception as err:
                    if is_debug():
                        print(f'[ERROR] Block.metadata_async: {err}')

        return {}

    @property
    def executable(self) -> bool:
        return (
            self.type not in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES
            and (self.pipeline is None or self.pipeline.type != PipelineType.STREAMING)
        )

    @property
    def outputs(self) -> List:
        if not self._outputs_loaded:
            if self._outputs is None or len(self._outputs) == 0:
                self._outputs = self.get_outputs()
        return self._outputs

    async def __outputs_async(self) -> List:
        if not self._outputs_loaded:
            if self._outputs is None or len(self._outputs) == 0:
                self._outputs = await self.__get_outputs_async()
        return self._outputs

    @property
    def callback_block_uuids(self) -> List[str]:
        return [b.uuid for b in self.callback_blocks]

    @property
    def conditional_block_uuids(self) -> List[str]:
        return [b.uuid for b in self.conditional_blocks]

    @property
    def upstream_block_uuids(self) -> List[str]:
        return [b.uuid for b in self.upstream_blocks]

    @property
    def downstream_block_uuids(self) -> List[str]:
        return [b.uuid for b in self.downstream_blocks]

    @property
    def repo_path(self) -> str:
        return self.pipeline.repo_path if self.pipeline is not None else get_repo_path()

    @property
    def file_path(self) -> str:
        file_extension = BLOCK_LANGUAGE_TO_FILE_EXTENSION[self.language]
        block_directory = f'{self.type}s' if self.type != BlockType.CUSTOM else self.type

        return os.path.join(
            self.repo_path or os.getcwd(),
            block_directory,
            f'{self.uuid}.{file_extension}',
        )

    @property
    def file(self) -> File:
        return File.from_path(self.file_path)

    @property
    def table_name(self) -> str:
        if self.configuration and self.configuration.get('data_provider_table'):
            return self.configuration['data_provider_table']

        table_name = f'{self.pipeline.uuid}_{clean_name_orig(self.uuid)}_'\
                     f'{self.pipeline.version_name}'

        env = (self.global_vars or dict()).get('env')
        if env == ENV_DEV:
            table_name = f'dev_{table_name}'
        elif env == ENV_TEST:
            table_name = f'test_{table_name}'

        return table_name

    @property
    def full_table_name(self) -> str:
        from mage_ai.data_preparation.models.block.sql.utils.shared import (
            extract_create_statement_table_name,
            extract_insert_statement_table_names,
            extract_update_statement_table_names,
        )

        if not self.content:
            return None

        table_name = extract_create_statement_table_name(self.content)
        if table_name:
            return table_name

        matches = extract_insert_statement_table_names(self.content)
        if len(matches) == 0:
            matches = extract_update_statement_table_names(self.content)

        if len(matches) == 0:
            return None

        return matches[len(matches) - 1]

    @classmethod
    def after_create(self, block: 'Block', **kwargs) -> None:
        widget = kwargs.get('widget')
        pipeline = kwargs.get('pipeline')
        if pipeline is not None:
            priority = kwargs.get('priority')
            downstream_block_uuids = kwargs.get('downstream_block_uuids', [])
            upstream_block_uuids = kwargs.get('upstream_block_uuids', [])

            if BlockType.DBT == block.type and block.language == BlockLanguage.SQL:
                upstream_dbt_blocks = block.upstream_dbt_blocks() or []
                upstream_dbt_blocks_by_uuid = {
                    block.uuid: block
                    for block in upstream_dbt_blocks
                }
                pipeline.blocks_by_uuid.update(upstream_dbt_blocks_by_uuid)
                pipeline.validate('A cycle was formed while adding a block')
                pipeline.save()
            else:
                pipeline.add_block(
                    block,
                    downstream_block_uuids=downstream_block_uuids,
                    upstream_block_uuids=upstream_block_uuids,
                    priority=priority,
                    widget=widget,
                )

    @classmethod
    def block_class_from_type(self, block_type: str, language=None, pipeline=None) -> 'Block':
        from mage_ai.data_preparation.models.block.constants import BLOCK_TYPE_TO_CLASS
        from mage_ai.data_preparation.models.block.integration import (
            DestinationBlock,
            SourceBlock,
            TransformerBlock,
        )
        from mage_ai.data_preparation.models.block.r import RBlock
        from mage_ai.data_preparation.models.block.sql import SQLBlock
        from mage_ai.data_preparation.models.widget import Widget

        if BlockType.CHART == block_type:
            return Widget
        elif BlockType.DBT == block_type:
            from mage_ai.data_preparation.models.block.dbt import DBTBlock

            return DBTBlock
        elif pipeline and PipelineType.INTEGRATION == pipeline.type:
            if BlockType.CALLBACK == block_type:
                return CallbackBlock
            elif BlockType.CONDITIONAL == block_type:
                return ConditionalBlock
            elif BlockType.DATA_LOADER == block_type:
                return SourceBlock
            elif BlockType.DATA_EXPORTER == block_type:
                return DestinationBlock
            else:
                return TransformerBlock
        elif BlockLanguage.SQL == language:
            return SQLBlock
        elif BlockLanguage.R == language:
            return RBlock
        return BLOCK_TYPE_TO_CLASS.get(block_type)

    @classmethod
    def create(
        self,
        name: str,
        block_type: str,
        repo_path: str,
        color: str = None,
        configuration: Dict = None,
        extension_uuid: str = None,
        language: str = None,
        pipeline=None,
        priority: int = None,
        replicated_block: str = None,
        require_unique_name: bool = False,
        upstream_block_uuids: List[str] = None,
        config: Dict = None,
        widget: bool = False,
        downstream_block_uuids: List[str] = None,
    ) -> 'Block':
        """
        1. Create a new folder for block_type if not exist
        2. Create a new python file with code template
        """
        if upstream_block_uuids is None:
            upstream_block_uuids = []
        if config is None:
            config = {}

        uuid = clean_name(name)
        language = language or BlockLanguage.PYTHON
        already_exists = False

        # Don’t create a file if block is replicated from another block.

        # Only create a file on the filesystem if the block type isn’t a global data product
        # because global data products reference a data product which already has its
        # own files.
        if not replicated_block and \
                (BlockType.DBT != block_type or BlockLanguage.YAML == language) and \
                BlockType.GLOBAL_DATA_PRODUCT != block_type:

            block_directory = self.file_directory_name(block_type)
            block_dir_path = os.path.join(repo_path, block_directory)
            if not os.path.exists(block_dir_path):
                os.mkdir(block_dir_path)
                with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
                    pass

            file_extension = BLOCK_LANGUAGE_TO_FILE_EXTENSION[language]
            file_path = os.path.join(block_dir_path, f'{uuid}.{file_extension}')
            if os.path.exists(file_path):
                already_exists = True
                if (pipeline is not None and pipeline.has_block(
                    uuid,
                    block_type=block_type,
                    extension_uuid=extension_uuid,
                )) or require_unique_name:
                    """
                    The BLOCK_EXISTS_ERROR constant is used on the frontend to identify when
                    a user is trying to create a new block with an existing block name, and
                    link them to the existing block file so the user can choose to add the
                    existing block to their pipeline.
                    """
                    raise Exception(f'{BLOCK_EXISTS_ERROR} Block {uuid} already exists. \
                                    Please use a different name.')
            else:
                load_template(
                    block_type,
                    config,
                    file_path,
                    language=language,
                    pipeline_type=pipeline.type if pipeline is not None else None,
                )

        block = self.block_class_from_type(block_type, pipeline=pipeline)(
            name,
            uuid,
            block_type,
            block_color=color,
            configuration=configuration,
            extension_uuid=extension_uuid,
            language=language,
            pipeline=pipeline,
            replicated_block=replicated_block,
        )
        block.already_exists = already_exists

        if BlockType.DBT == block.type:
            if block.file_path and not block.file.exists():
                block.file.create_parent_directories(block.file_path)
                block.file.update_content('')

        self.after_create(
            block,
            config=config,
            pipeline=pipeline,
            priority=priority,
            upstream_block_uuids=upstream_block_uuids,
            widget=widget,
            downstream_block_uuids=downstream_block_uuids,
        )
        return block

    @classmethod
    def file_directory_name(self, block_type: BlockType) -> str:
        return f'{block_type}s' if block_type != BlockType.CUSTOM else block_type

    @classmethod
    def block_type_from_path(self, block_file_absolute_path: str) -> BlockType:
        file_path = str(block_file_absolute_path).replace(get_repo_path(), '')
        if file_path.startswith(os.sep):
            file_path = file_path[1:]

        file_path_parts = file_path.split(os.path.sep)
        dir_name = file_path_parts[0]

        for block_type in BlockType:
            if BlockType.CUSTOM == block_type and dir_name == block_type:
                return BlockType.CUSTOM
            elif dir_name == f'{block_type}s':
                return block_type

    @classmethod
    def get_all_blocks(self, repo_path) -> Dict:
        block_uuids = dict()
        for t in BlockType:
            block_dir = os.path.join(repo_path, f'{t.value}s')
            if not os.path.exists(block_dir):
                continue
            block_uuids[t.value] = []
            for f in os.listdir(block_dir):
                if (f.endswith('.py') or f.endswith('.sql')) and f != '__init__.py':
                    block_uuids[t.value].append(f.split('.')[0])
        return block_uuids

    @classmethod
    def get_block(
        self,
        name,
        uuid,
        block_type,
        configuration=None,
        content=None,
        language=None,
        pipeline=None,
        status=BlockStatus.NOT_EXECUTED,
    ) -> 'Block':
        block_class = self.block_class_from_type(
            block_type,
            language=language,
            pipeline=pipeline,
        ) or Block
        return block_class(
            name,
            uuid,
            block_type,
            configuration=configuration,
            content=content,
            language=language,
            pipeline=pipeline,
            status=status,
        )

    def all_upstream_blocks_completed(
        self,
        completed_block_uuids: Set[str],
        upstream_block_uuids: List[str] = None,
    ) -> bool:
        arr = []

        if upstream_block_uuids:
            arr += upstream_block_uuids
        else:
            for b in self.upstream_blocks:
                uuid = b.uuid
                # Replicated block’s have a block_run block_uuid value with this convention:
                # [block_uuid]:[replicated_block_uuid]
                if b.replicated_block:
                    uuid = f'{uuid}:{b.replicated_block}'
                arr.append(uuid)

        return all(uuid in completed_block_uuids for uuid in arr)

    def delete(
        self,
        widget: bool = False,
        commit: bool = True,
        force: bool = False,
    ) -> None:
        """
        1. If pipeline is not None, delete the block from the pipeline but not delete the block
        file.
        2. If pipeline is None, check whether block is used in any pipelines. If block is being
        used, throw error. Otherwise, delete the block files.
        """
        from mage_ai.data_preparation.models.pipeline import Pipeline

        if self.pipeline is not None:
            self.pipeline.delete_block(
                self,
                widget=widget,
                commit=commit,
                force=force,
            )
            # For block_type SCRATCHPAD and MARKDOWN, also delete the file if possible
            if self.type in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES:
                pipelines = Pipeline.get_pipelines_by_block(self, widget=widget)
                pipelines = [
                    pipeline for pipeline in pipelines if self.pipeline.uuid != pipeline.uuid
                ]
                if len(pipelines) == 0:
                    os.remove(self.file_path)
            return
        # If pipeline is not specified, delete the block from all pipelines and delete the file.
        pipelines = Pipeline.get_pipelines_by_block(self, widget=widget)
        if not force:
            for p in pipelines:
                if not p.block_deletable(self):
                    raise HasDownstreamDependencies(
                        f'Block {self.uuid} has downstream dependencies in pipeline {p.uuid}. '
                        'Please remove the dependencies before deleting the block.'
                    )
        for p in pipelines:
            p.delete_block(
                p.get_block(self.uuid, widget=widget),
                widget=widget,
                commit=commit,
                force=force,
            )
        os.remove(self.file_path)

    def execute_with_callback(
        self,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        execution_uuid: str = None,
        from_notebook: bool = False,
        **kwargs
    ) -> Dict:
        """
        This method will execute the block and run the callback functions if they exist
        for this block. This function should only be used when running a block from the
        websocket as a way to test the code in the callback. To run a block in a pipeline
        run, use a BlockExecutor.
        """
        if execution_uuid:
            self.execution_uuid = execution_uuid

        if logging_tags is None:
            logging_tags = dict()

        if self.conditional_blocks and len(self.conditional_blocks) > 0:
            conditional_message = ''
            result = True
            for conditional_block in self.conditional_blocks:
                block_result = conditional_block.execute_conditional(
                    self,
                    global_vars=global_vars,
                    logger=logger,
                    logging_tags=logging_tags,
                )
                conditional_message += \
                    f'Conditional block {conditional_block.uuid} evaluated to {block_result}.\n'
                result = result and block_result

            # Print result to block output
            if not result:
                conditional_message += 'This block would not be executed in a trigger run.\n'
            conditional_json = json.dumps(dict(
                message=conditional_message,
            ))
            print(f'[__internal_test__]{conditional_json}')

        callback_arr = []
        if self.callback_block:
            callback_arr.append(self.callback_block)
        if self.callback_blocks:
            callback_arr += self.callback_blocks

        try:
            output = self.execute_sync(
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
                from_notebook=from_notebook,
                **kwargs
            )
        except Exception as error:
            for callback_block in callback_arr:
                callback_block.execute_callback(
                    'on_failure',
                    callback_kwargs=dict(__error=error),
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                    logger=logger,
                    logging_tags=logging_tags,
                    parent_block=self,
                )
            raise

        for callback_block in callback_arr:
            callback_block.execute_callback(
                'on_success',
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
                parent_block=self,
                from_notebook=from_notebook,
            )

        return output

    def execute_sync(
        self,
        analyze_outputs: bool = False,
        block_run_outputs_cache: Dict[str, List] = None,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        run_all_blocks: bool = False,
        update_status: bool = True,
        store_variables: bool = True,
        verify_output: bool = True,
        input_from_output: Dict = None,
        runtime_arguments: Dict = None,
        dynamic_block_index: int = None,
        dynamic_block_indexes: Dict = None,
        dynamic_block_uuid: str = None,
        dynamic_upstream_block_uuids: List[str] = None,
        run_settings: Dict = None,
        output_messages_to_logs: bool = False,
        disable_json_serialization: bool = False,
        data_integration_runtime_settings: Dict = None,
        execution_partition_previous: str = None,
        **kwargs,
    ) -> Dict:
        if logging_tags is None:
            logging_tags = dict()

        try:
            if not run_all_blocks:
                not_executed_upstream_blocks = list(
                    filter(lambda b: b.status == BlockStatus.NOT_EXECUTED, self.upstream_blocks)
                )
                all_upstream_is_dbt = all([BlockType.DBT == b.type
                                           for b in not_executed_upstream_blocks])
                if not all_upstream_is_dbt and len(not_executed_upstream_blocks) > 0:
                    upstream_block_uuids = list(map(lambda b: b.uuid, not_executed_upstream_blocks))
                    raise Exception(
                        f"Block {self.uuid}'s upstream blocks have not been executed yet. "
                        f'Please run upstream blocks {upstream_block_uuids} '
                        'before running the current block.'
                    )
            global_vars = self.__enrich_global_vars(global_vars)

            if output_messages_to_logs and not logger:
                from mage_ai.data_preparation.models.block.constants import (
                    LOG_PARTITION_EDIT_PIPELINE,
                )

                logger_manager = LoggerManagerFactory.get_logger_manager(
                    block_uuid=datetime.utcnow().strftime(format='%Y%m%dT%H%M%S'),
                    partition=LOG_PARTITION_EDIT_PIPELINE,
                    pipeline_uuid=self.pipeline.uuid if self.pipeline else None,
                    subpartition=clean_name(self.uuid),
                )
                logger = DictLogger(logger_manager.logger)
                logging_tags = dict(
                    block_type=self.type,
                    block_uuid=self.uuid,
                    pipeline_uuid=self.pipeline.uuid if self.pipeline else None,
                )

            output = self.execute_block(
                block_run_outputs_cache=block_run_outputs_cache,
                build_block_output_stdout=build_block_output_stdout,
                custom_code=custom_code,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
                input_from_output=input_from_output,
                runtime_arguments=runtime_arguments,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                run_settings=run_settings,
                data_integration_runtime_settings=data_integration_runtime_settings,
                execution_partition_previous=execution_partition_previous,
                **kwargs,
            )

            block_output = self.post_process_output(output)
            variable_mapping = dict()

            if BlockType.CHART == self.type:
                variable_mapping = block_output
                output = dict(
                    output=simplejson.dumps(
                        block_output,
                        default=encode_complex,
                        ignore_nan=True,
                    ) if not disable_json_serialization else block_output,
                )
            else:
                output_count = len(block_output)
                variable_keys = [f'output_{idx}' for idx in range(output_count)]
                variable_mapping = dict(zip(variable_keys, block_output))

            if store_variables and \
                    self.pipeline and \
                    self.pipeline.type != PipelineType.INTEGRATION:

                try:
                    self.store_variables(
                        variable_mapping,
                        execution_partition=execution_partition,
                        override_outputs=True,
                        spark=self.__get_spark_session_from_global_vars(global_vars=global_vars),
                        dynamic_block_uuid=dynamic_block_uuid,
                    )
                except ValueError as e:
                    if str(e) == 'Circular reference detected':
                        raise ValueError(
                            'Please provide dataframe or json serializable data as output.'
                        )
                    raise e
            # Reset outputs cache
            self._outputs = None

            if update_status:
                self.status = BlockStatus.EXECUTED

            if BlockType.CHART != self.type:
                if analyze_outputs:
                    self.analyze_outputs(variable_mapping)
                else:
                    self.analyze_outputs(variable_mapping, shape_only=True)
        except Exception as err:
            if update_status:
                self.status = BlockStatus.FAILED
            raise err
        finally:
            if update_status:
                self.__update_pipeline_block(widget=BlockType.CHART == self.type)

        return output

    def post_process_output(self, output: Dict) -> List:
        return output['output'] or []

    async def execute(
        self,
        analyze_outputs: bool = False,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        global_vars=None,
        run_all_blocks: bool = False,
        run_sensors: bool = True,
        update_status: bool = True,
        parallel: bool = True,
    ) -> None:
        if parallel:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                functools.partial(
                    self.execute_sync,
                    analyze_outputs=analyze_outputs,
                    build_block_output_stdout=build_block_output_stdout,
                    custom_code=custom_code,
                    from_notebook=not run_sensors,
                    global_vars=global_vars,
                    run_all_blocks=run_all_blocks,
                    update_status=update_status,
                )
            )
        else:
            self.execute_sync(
                analyze_outputs=analyze_outputs,
                build_block_output_stdout=build_block_output_stdout,
                custom_code=custom_code,
                from_notebook=not run_sensors,
                global_vars=global_vars,
                run_all_blocks=run_all_blocks,
                update_status=update_status,
            )

    def _validate_execution(self, decorated_functions, input_vars):
        """
        Validate whether the number of function arguments matches the upstream blocks.
        Only perform the validation for Python functions.
        """
        if self.type not in CUSTOM_EXECUTION_BLOCK_TYPES:
            return None

        if BlockLanguage.PYTHON != self.language:
            return None

        if len(decorated_functions) == 0:
            raise Exception(
                f'Block {self.uuid} does not have any decorated functions. '
                f'Make sure that a function in the block is decorated with @{self.type}.'
            )
        else:
            block_function = decorated_functions[0]
            sig = signature(block_function)

            num_args = sum(
                arg.kind not in (Parameter.VAR_POSITIONAL, Parameter.VAR_KEYWORD)
                for arg in sig.parameters.values()
            )
            num_inputs = len(input_vars)
            num_upstream = len(self.upstream_block_uuids)

            has_var_args = num_args != len(sig.parameters)

            if num_args > num_inputs:
                if num_upstream < num_args:
                    raise Exception(
                        f'Block {self.uuid} may be missing upstream dependencies. '
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} '
                        f'arguments, but only received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number '
                        'of arguments.'
                    )
                else:
                    raise Exception(
                        f'Block {self.uuid} is missing input arguments. '
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} '
                        f'arguments, but only received {num_inputs}. '
                        f'Double check the @{self.type} method declaration has the correct number '
                        'of arguments and that the upstream blocks have been executed.'
                    )
            elif num_args < num_inputs and not has_var_args:
                if num_upstream > num_args:
                    raise Exception(
                        f'Block {self.uuid} may have too many upstream dependencies. '
                        f'It expected to have {num_args} arguments, but received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number '
                        'of arguments.'
                    )
                else:
                    raise Exception(
                        f'Block {self.uuid} has too many input arguments. '
                        f'It expected to have {num_args} arguments, but received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number '
                        'of arguments.'
                    )

            return block_function

    def execute_block(
        self,
        block_run_outputs_cache: Dict[str, List] = None,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_args: List = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        input_from_output: Dict = None,
        runtime_arguments: Dict = None,
        dynamic_block_index: int = None,
        dynamic_block_indexes: Dict = None,
        dynamic_upstream_block_uuids: List[str] = None,
        run_settings: Dict = None,
        data_integration_runtime_settings: str = None,
        execution_partition_previous: str = None,
        **kwargs,
    ) -> Dict:
        if logging_tags is None:
            logging_tags = dict()

        # Add pipeline uuid and block uuid to global_vars
        global_vars = merge_dict(
            global_vars or dict(),
            dict(
                pipeline_uuid=self.pipeline.uuid if self.pipeline else None,
                block_uuid=self.uuid,
            ),
        )

        with self._redirect_streams(
            build_block_output_stdout=build_block_output_stdout,
            from_notebook=from_notebook,
            logger=logger,
            logging_tags=logging_tags,
        ):
            # Fetch input variables

            # Only fetch the input variables that the destination block explicitly declares.
            # If all the input variables are fetched, there is a chance that a lot of data from
            # an upstream source block is loaded just to be used as inputs for the block’s
            # decorated functions. Only do this for the notebook because
            if from_notebook and self.is_data_integration():
                input_vars, kwargs_vars, upstream_block_uuids = \
                    self.fetch_input_variables_and_catalog(
                        input_args,
                        execution_partition,
                        global_vars,
                        dynamic_block_index=dynamic_block_index,
                        dynamic_block_indexes=dynamic_block_indexes,
                        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                        from_notebook=from_notebook,
                    )
            else:
                input_vars, kwargs_vars, upstream_block_uuids = self.fetch_input_variables(
                    input_args,
                    block_run_outputs_cache=block_run_outputs_cache,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_block_indexes=dynamic_block_indexes,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    execution_partition=execution_partition,
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                )

            outputs_from_input_vars = {}
            if input_args is None:
                upstream_block_uuids_length = len(upstream_block_uuids)
                for idx, input_var in enumerate(input_vars):
                    if idx < upstream_block_uuids_length:
                        upstream_block_uuid = upstream_block_uuids[idx]
                        outputs_from_input_vars[upstream_block_uuid] = input_var
                        outputs_from_input_vars[f'df_{idx + 1}'] = input_var
            else:
                outputs_from_input_vars = dict()

            global_vars_copy = global_vars.copy()
            for kwargs_var in kwargs_vars:
                if kwargs_var:
                    global_vars_copy.update(kwargs_var)

            outputs = self._execute_block(
                outputs_from_input_vars,
                custom_code=custom_code,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars_copy,
                input_vars=input_vars,
                logger=logger,
                logging_tags=logging_tags,
                input_from_output=input_from_output,
                runtime_arguments=runtime_arguments,
                upstream_block_uuids=upstream_block_uuids,
                run_settings=run_settings,
                data_integration_runtime_settings=data_integration_runtime_settings,
                execution_partition_previous=execution_partition_previous,
                **kwargs,
            )

        return dict(output=outputs)

    @contextmanager
    def _redirect_streams(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        from_notebook: bool = False,
        logger: Logger = None,
        logging_tags: Dict = None,
    ) -> Generator[None, None, None]:
        """
        Redirect stdout and stderr based on the input arguments. If no input arguments are
        passed in, then stdout and stderr will be redirected to system stdout.

        Args:
            build_block_output_stdout (optional): A function that returns a file-like object.
            from_notebook (optional): Whether the block is being executed from the notebook.
                Defaults to False.
            logger (optional): A logger object.
            logging_tags (optional): A dictionary of logging tags.

        Returns:
            Generator: A contextmanager generator that yields the redirected stdout and stderr.
                The return value is meant to be used in a with statement.
        """
        if build_block_output_stdout:
            stdout = build_block_output_stdout(self.uuid)
        elif logger is not None and not from_notebook:
            stdout = StreamToLogger(logger, logging_tags=logging_tags)
        else:
            stdout = sys.stdout

        with redirect_stdout(stdout) as out, redirect_stderr(stdout) as err:
            yield (out, err)

    def _execute_block(
        self,
        outputs_from_input_vars,
        custom_code: str = None,
        dynamic_block_index: int = None,
        dynamic_block_indexes: Dict = None,
        dynamic_upstream_block_uuids: List[str] = None,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_vars: List = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        input_from_output: Dict = None,
        runtime_arguments: Dict = None,
        upstream_block_uuids: List[str] = None,
        run_settings: Dict = None,
        data_integration_runtime_settings: str = None,
        execution_partition_previous: str = None,
        **kwargs,
    ) -> List:
        if logging_tags is None:
            logging_tags = dict()

        if input_vars is None:
            input_vars = list()

        if self.get_data_integration_settings(
            dynamic_block_index=dynamic_block_index,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            from_notebook=from_notebook,
            global_vars=global_vars,
            input_vars=input_vars,
            partition=execution_partition,
        ):
            return execute_data_integration(
                self,
                outputs_from_input_vars=outputs_from_input_vars,
                custom_code=custom_code,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                execution_partition=execution_partition,
                execution_partition_previous=execution_partition_previous,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_vars=input_vars,
                logger=logger,
                logging_tags=logging_tags,
                input_from_output=input_from_output,
                runtime_arguments=runtime_arguments,
                upstream_block_uuids=upstream_block_uuids,
                run_settings=run_settings,
                data_integration_runtime_settings=data_integration_runtime_settings,
                **kwargs,
            )

        decorated_functions = []
        preprocesser_functions = []
        test_functions = []

        results = merge_dict({
            'preprocesser': self._block_decorator(preprocesser_functions),
            'test': self._block_decorator(test_functions),
            self.type: self._block_decorator(decorated_functions),
        }, outputs_from_input_vars)

        if custom_code is not None and custom_code.strip():
            if BlockType.CHART != self.type:
                exec(custom_code, results)
        elif self.content is not None:
            exec(self.content, results)
        elif os.path.exists(self.file_path):
            with open(self.file_path) as file:
                exec(file.read(), results)

        outputs = None

        if preprocesser_functions:
            for preprocesser_function in preprocesser_functions:
                self.execute_block_function(
                    preprocesser_function,
                    input_vars,
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                )

        block_function = self._validate_execution(decorated_functions, input_vars)
        if block_function is not None:
            if logger and 'logger' not in global_vars:
                global_vars['logger'] = logger

            track_spark = from_notebook and self.should_track_spark()

            if track_spark:
                self.clear_spark_jobs_cache()
                self.cache_spark_application()
                self.set_spark_job_execution_start()

            outputs = self.execute_block_function(
                block_function,
                input_vars,
                from_notebook=from_notebook,
                global_vars=global_vars,
            )

            if track_spark:
                self.set_spark_job_execution_end()

        self.test_functions = test_functions

        if outputs is None:
            outputs = []
        if type(outputs) is not list:
            outputs = [outputs]

        return outputs

    def execute_block_function(
        self,
        block_function: Callable,
        input_vars: List,
        from_notebook: bool = False,
        global_vars: Dict = None,
        initialize_decorator_modules: bool = True,
    ) -> Dict:
        block_function_updated = block_function

        if from_notebook and initialize_decorator_modules:
            block_function_updated = self.__initialize_decorator_modules(
                block_function,
                [self.type],
            )

        sig = signature(block_function)
        has_kwargs = any([p.kind == p.VAR_KEYWORD for p in sig.parameters.values()])

        if has_kwargs and global_vars is not None and len(global_vars) != 0:
            output = block_function_updated(*input_vars, **global_vars)
        else:
            output = block_function_updated(*input_vars)

        return output

    def __initialize_decorator_modules(
        self,
        block_function: Callable,
        decorator_module_names: List[str],
    ) -> Callable:
        # Initialize module
        block_uuid = self.uuid
        block_file_path = self.file_path
        if self.replicated_block:
            block_uuid = self.replicated_block
            block_file_path = self.replicated_block_object.file_path

        spec = importlib.util.spec_from_file_location(block_uuid, block_file_path)
        module = importlib.util.module_from_spec(spec)

        for module_name in decorator_module_names:
            # Set the decorators in the module in case they are not defined in the block code
            setattr(
                module,
                module_name,
                getattr(mage_ai.data_preparation.decorators, module_name),
            )

        module.test = mage_ai.data_preparation.decorators.test

        try:
            spec.loader.exec_module(module)
            block_function_updated = getattr(module, block_function.__name__)
            self.module = module

            return block_function_updated
        except Exception as err:
            print(f'[WARNING] Block.initialize_decorator_modules: {err}')
            print('Falling back to default block execution...')

        return block_function

    def exists(self) -> bool:
        return os.path.exists(self.file_path)

    def fetch_input_variables(
        self,
        input_args,
        block_run_outputs_cache: Dict[str, List] = None,
        data_integration_settings_mapping: Dict = None,
        dynamic_block_index: int = None,
        dynamic_block_indexes: Dict = None,
        dynamic_upstream_block_uuids: List[str] = None,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        upstream_block_uuids: List[str] = None,
    ) -> Tuple[List, List, List]:
        """
        Fetch input variables for the current block's execution.

        Args:
            input_args: The input arguments required for the block's execution.
            block_run_outputs_cache (Optional[Dict[str, List]]): A dictionary mapping block run
                UUIDs to their outputs.
            data_integration_settings_mapping (Optional[Dict]): A dictionary containing data
                integration settings.
            dynamic_block_index (Optional[int]): The index of the dynamic block, if applicable.
            dynamic_upstream_block_uuids (Optional[List[str]]): The UUIDs of the dynamic upstream
                blocks.
            execution_partition (Optional[str]): The execution partition for the block.
            from_notebook (Optional[bool]): A boolean indicating whether the execution is
                triggered from a notebook.
            global_vars (Optional[Dict]): A dictionary containing global variables.
            upstream_block_uuids (Optional[List[str]]): List of UUIDs of upstream blocks.

        Returns:
            Tuple[List, List, List]: A tuple containing the input variables, kwargs variables, and
                upstream block UUIDs.
        """
        variables = fetch_input_variables(
            self.pipeline,
            upstream_block_uuids or self.upstream_block_uuids,
            input_args,
            block_run_outputs_cache=block_run_outputs_cache,
            data_integration_settings_mapping=data_integration_settings_mapping,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            execution_partition=execution_partition,
            from_notebook=from_notebook,
            global_vars=global_vars,
        )

        return variables

    def get_analyses(self) -> List:
        if self.status == BlockStatus.NOT_EXECUTED:
            return []
        output_variable_objects = self.output_variable_objects()
        if len(output_variable_objects) == 0:
            return []
        analyses = []
        for v in output_variable_objects:
            if v.variable_type != VariableType.DATAFRAME:
                continue
            data = self.pipeline.variable_manager.get_variable(
                self.pipeline.uuid,
                self.uuid,
                v.uuid,
                variable_type=VariableType.DATAFRAME_ANALYSIS,
            )
            data['variable_uuid'] = v.uuid
            analyses.append(data)
        return analyses

    def get_variables_by_block(
        self,
        block_uuid: str,
        dynamic_block_index: int = None,
        partition: str = None,
    ):
        variable_manager = self.pipeline.variable_manager

        block_uuid_use = block_uuid
        clean_block_uuid = True
        if dynamic_block_index is not None or is_dynamic_block_child(self):
            block_uuid_use = os.path.join(*block_uuid.split(':'))
            clean_block_uuid = False

        return variable_manager.get_variables_by_block(
            self.pipeline.uuid,
            block_uuid=block_uuid_use,
            clean_block_uuid=clean_block_uuid,
            partition=partition,
        )

    def get_variable(
        self,
        block_uuid: str,
        variable_uuid: str,
        dynamic_block_index: int = None,
        partition: str = None,
        raise_exception: bool = False,
        spark=None,
    ):
        variable_manager = self.pipeline.variable_manager

        block_uuid_use = block_uuid
        clean_block_uuid = True
        if dynamic_block_index is not None or is_dynamic_block_child(self):
            block_uuid_use = os.path.join(*block_uuid.split(':'))
            clean_block_uuid = False

        return variable_manager.get_variable(
            self.pipeline.uuid,
            block_uuid=block_uuid_use,
            clean_block_uuid=clean_block_uuid,
            partition=partition,
            raise_exception=raise_exception,
            spark=spark,
            variable_uuid=variable_uuid,
        )

    def get_variable_object(
        self,
        block_uuid: str,
        variable_uuid: str = None,
        dynamic_block_index: int = None,
        partition: str = None,
    ):
        variable_manager = self.pipeline.variable_manager

        block_uuid_use = block_uuid
        clean_block_uuid = True
        if dynamic_block_index is not None or is_dynamic_block_child(self):
            block_uuid_use = os.path.join(*block_uuid.split(':'))
            clean_block_uuid = False

        return variable_manager.get_variable_object(
            self.pipeline.uuid,
            block_uuid=block_uuid_use,
            clean_block_uuid=clean_block_uuid,
            partition=partition,
            spark=self.get_spark_session(),
            variable_uuid=variable_uuid,
        )

    def get_raw_outputs(
        self,
        block_uuid: str,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
    ) -> List[Any]:
        all_variables = self.get_variables_by_block(
            block_uuid=block_uuid,
            partition=execution_partition,
        )

        outputs = []

        for variable_uuid in all_variables:
            variable = self.pipeline.get_block_variable(
                block_uuid,
                variable_uuid,
                from_notebook=from_notebook,
                global_vars=global_vars,
                partition=execution_partition,
                raise_exception=True,
                spark=self.__get_spark_session_from_global_vars(global_vars),
            )
            outputs.append(variable)

        return outputs

    def get_outputs(
        self,
        execution_partition: str = None,
        include_print_outputs: bool = True,
        csv_lines_only: bool = False,
        sample: bool = True,
        sample_count: int = DATAFRAME_SAMPLE_COUNT_PREVIEW,
        variable_type: VariableType = None,
        block_uuid: str = None,
        selected_variables: List[str] = None,
    ) -> List[Dict]:
        if self.pipeline is None:
            return

        if not block_uuid:
            block_uuid = self.uuid

        data_products = []
        outputs = []
        variable_manager = self.pipeline.variable_manager

        all_variables = self.get_variables_by_block(
            block_uuid=block_uuid,
            partition=execution_partition,
        )

        if not include_print_outputs:
            all_variables = self.output_variables(
                execution_partition=execution_partition,
            )

        for v in all_variables:
            if selected_variables and v not in selected_variables:
                continue

            variable_object = self.get_variable_object(
                block_uuid=block_uuid,
                partition=execution_partition,
                variable_uuid=v,
            )

            if variable_type is not None and variable_object.variable_type != variable_type:
                continue

            data = variable_object.read_data(
                sample=sample,
                sample_count=sample_count,
                spark=self.get_spark_session(),
            )
            if type(data) is pd.DataFrame:
                if csv_lines_only:
                    data = dict(
                        table=data.to_csv(header=True, index=False).strip('\n').split('\n')
                    )
                else:
                    try:
                        analysis = variable_manager.get_variable(
                            self.pipeline.uuid,
                            block_uuid,
                            v,
                            dataframe_analysis_keys=['metadata', 'statistics'],
                            partition=execution_partition,
                            variable_type=VariableType.DATAFRAME_ANALYSIS,
                        )
                    except Exception:
                        analysis = None
                    if analysis is not None and \
                            (analysis.get('statistics') or analysis.get('metadata')):

                        stats = analysis.get('statistics', {})
                        column_types = (analysis.get('metadata') or {}).get('column_types', {})
                        row_count = stats.get('original_row_count', stats.get('count'))
                        column_count = stats.get('original_column_count', len(column_types))
                    else:
                        row_count, column_count = data.shape

                    columns_to_display = data.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
                    data = dict(
                        sample_data=dict(
                            columns=columns_to_display,
                            rows=json.loads(
                                data[columns_to_display].to_json(orient='split')
                            )['data']
                        ),
                        shape=[row_count, column_count],
                        type=DataType.TABLE,
                        variable_uuid=v,
                    )
                data_products.append(data)
                continue
            elif is_geo_dataframe(data):
                data = dict(
                    text_data=f'''Use the code in a scratchpad to get the output of the block:

from mage_ai.data_preparation.variable_manager import get_variable
df = get_variable('{self.pipeline.uuid}', '{self.uuid}', 'df')
''',
                    type=DataType.TEXT,
                    variable_uuid=v,
                )
            elif type(data) is str:
                data = dict(
                    text_data=data,
                    type=DataType.TEXT,
                    variable_uuid=v,
                )
            elif type(data) is dict or type(data) is list:
                data = dict(
                    text_data=simplejson.dumps(
                        data,
                        default=datetime.isoformat,
                        ignore_nan=True,
                    ),
                    type=DataType.TEXT,
                    variable_uuid=v,
                )
            elif is_spark_dataframe(data):
                df = data.toPandas()
                columns_to_display = df.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
                data = dict(
                    sample_data=dict(
                        columns=columns_to_display,
                        rows=json.loads(df[columns_to_display].to_json(orient='split'))['data']
                    ),
                    type=DataType.TABLE,
                    variable_uuid=v,
                )
                data_products.append(data)
                continue
            outputs.append(data)
        return outputs + data_products

    async def __get_outputs_async(
        self,
        execution_partition: str = None,
        include_print_outputs: bool = True,
        sample_count: int = DATAFRAME_SAMPLE_COUNT_PREVIEW,
        variable_type: VariableType = None,
        block_uuid: str = None,
    ) -> List[Dict]:
        if self.pipeline is None:
            return

        if not block_uuid:
            block_uuid = self.uuid

        data_products = []
        outputs = []
        variable_manager = self.pipeline.variable_manager

        all_variables = variable_manager.get_variables_by_block(
            self.pipeline.uuid,
            block_uuid,
            partition=execution_partition,
        )

        if not include_print_outputs:
            all_variables = self.output_variables(execution_partition=execution_partition)

        for v in all_variables:
            variable_object = variable_manager.get_variable_object(
                self.pipeline.uuid,
                block_uuid,
                v,
                partition=execution_partition,
                spark=self.get_spark_session(),
            )

            if variable_type is not None and variable_object.variable_type != variable_type:
                continue

            data = await variable_object.read_data_async(
                sample=True,
                sample_count=sample_count,
                spark=self.get_spark_session(),
            )
            if type(data) is pd.DataFrame:
                try:
                    analysis = variable_manager.get_variable(
                        self.pipeline.uuid,
                        block_uuid,
                        v,
                        dataframe_analysis_keys=['metadata', 'statistics'],
                        partition=execution_partition,
                        variable_type=VariableType.DATAFRAME_ANALYSIS,
                    )
                except Exception:
                    analysis = None
                if analysis is not None:
                    stats = analysis.get('statistics', {})
                    column_types = (analysis.get('metadata') or {}).get('column_types', {})
                    row_count = stats.get('original_row_count', stats.get('count'))
                    column_count = stats.get('original_column_count', len(column_types))
                else:
                    row_count, column_count = data.shape

                columns_to_display = data.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
                data = dict(
                    sample_data=dict(
                        columns=columns_to_display,
                        rows=json.loads(data[columns_to_display].to_json(orient='split'))['data']
                    ),
                    shape=[row_count, column_count],
                    type=DataType.TABLE,
                    variable_uuid=v,
                )
                data_products.append(data)
                continue
            elif is_geo_dataframe(data):
                data = dict(
                    text_data=f'''Use the code in a scratchpad to get the output of the block:

from mage_ai.data_preparation.variable_manager import get_variable
df = get_variable('{self.pipeline.uuid}', '{block_uuid}', 'df')
''',
                    type=DataType.TEXT,
                    variable_uuid=v,
                )
            elif type(data) is str:
                data = dict(
                    text_data=data,
                    type=DataType.TEXT,
                    variable_uuid=v,
                )
            elif type(data) is dict or type(data) is list:
                data = dict(
                    text_data=simplejson.dumps(
                        data,
                        default=datetime.isoformat,
                        ignore_nan=True,
                    ),
                    type=DataType.TEXT,
                    variable_uuid=v,
                )
            elif is_spark_dataframe(data):
                df = data.toPandas()
                columns_to_display = df.columns.tolist()[:DATAFRAME_ANALYSIS_MAX_COLUMNS]
                data = dict(
                    sample_data=dict(
                        columns=columns_to_display,
                        rows=json.loads(df[columns_to_display].to_json(orient='split'))['data']
                    ),
                    type=DataType.TABLE,
                    variable_uuid=v,
                )
                data_products.append(data)
                continue
            outputs.append(data)
        return outputs + data_products

    def __save_outputs_prepare(self, outputs, override_output_variable: bool = False) -> Dict:
        variable_mapping = dict()
        for o in outputs:
            if o is None:
                continue

            if not isinstance(o, dict):
                continue

            if all(k in o for k in ['variable_uuid', 'text_data']) and \
                    (not is_output_variable(o['variable_uuid']) or
                        BlockType.SCRATCHPAD == self.type or
                        override_output_variable):
                variable_mapping[o['variable_uuid']] = o['text_data']

        self._outputs = outputs
        self._outputs_loaded = True
        return variable_mapping

    def save_outputs(
        self,
        outputs,
        override: bool = False,
        execution_partition: str = None,
        override_output_variable: bool = False,
    ) -> None:
        variable_mapping = self.__save_outputs_prepare(
            outputs,
            override_output_variable=override_output_variable,
        )
        self.store_variables(
            variable_mapping,
            execution_partition=execution_partition,
            override=override,
        )

    async def save_outputs_async(
        self,
        outputs,
        override: bool = False,
        override_outputs: bool = False,
    ) -> None:
        variable_mapping = self.__save_outputs_prepare(outputs)
        await self.store_variables_async(
            variable_mapping,
            override=override,
            override_outputs=override_outputs,
        )

    def get_executor_type(self) -> str:
        if self.executor_type:
            return Template(self.executor_type).render(**get_template_vars())
        return self.executor_type

    def get_pipelines_from_cache(self) -> List[Dict]:
        return BlockCache().get_pipelines(self)

    def to_dict_base(
        self,
        include_callback_blocks: bool = False,
        include_conditional_blocks: bool = False,
    ) -> Dict:
        language = self.language
        if language and type(self.language) is not str:
            language = self.language.value

        data = dict(
            all_upstream_blocks_executed=all(
                block.status == BlockStatus.EXECUTED for block in self.get_all_upstream_blocks()
            ),
            color=self.color,
            configuration=self.configuration or {},
            downstream_blocks=self.downstream_block_uuids,
            executor_config=self.executor_config,
            executor_type=format_enum(self.executor_type) if self.executor_type else None,
            has_callback=self.has_callback,
            name=self.name,
            language=language,
            retry_config=self.retry_config,
            status=format_enum(self.status) if self.status else None,
            timeout=self.timeout,
            type=format_enum(self.type) if self.type else None,
            upstream_blocks=self.upstream_block_uuids,
            uuid=self.uuid,
        )

        if include_callback_blocks:
            data['callback_blocks'] = self.callback_block_uuids

        if include_conditional_blocks:
            data['conditional_blocks'] = self.conditional_block_uuids

        if self.replicated_block:
            data['replicated_block'] = self.replicated_block

        return data

    def to_dict(
        self,
        include_block_catalog: bool = False,
        include_callback_blocks: bool = False,
        include_content: bool = False,
        include_outputs: bool = False,
        include_outputs_spark: bool = False,
        sample_count: int = None,
        check_if_file_exists: bool = False,
        **kwargs,
    ) -> Dict:
        data = self.to_dict_base(include_callback_blocks=include_callback_blocks)

        if include_content:
            data['content'] = self.content
            if self.callback_block is not None:
                data['callback_content'] = self.callback_block.content

        if include_block_catalog and self.is_data_integration() and self.pipeline:
            data['catalog'] = self.get_catalog_from_file()

        if include_outputs:
            include_outputs_use = include_outputs
            if self.is_using_spark() and self.compute_management_enabled():
                include_outputs_use = include_outputs_use and include_outputs_spark

            if include_outputs_use:
                data['outputs'] = self.outputs

                if check_if_file_exists and not \
                        self.replicated_block and \
                        BlockType.GLOBAL_DATA_PRODUCT != self.type:

                    file_path = self.file.file_path
                    if not os.path.isfile(file_path):
                        data['error'] = dict(
                            error='No such file or directory',
                            message='You may have moved it or changed its filename. '
                            'Delete the current block to remove it from the pipeline '
                            'or write code and save the pipeline to create a new file at '
                            f'{file_path}.',
                        )

        return data

    async def to_dict_async(
        self,
        include_block_catalog: bool = False,
        include_block_metadata: bool = False,
        include_block_pipelines: bool = False,
        include_block_tags: bool = False,
        include_callback_blocks: bool = False,
        include_conditional_blocks: bool = False,
        include_content: bool = False,
        include_outputs: bool = False,
        include_outputs_spark: bool = False,
        sample_count: int = None,
        check_if_file_exists: bool = False,
        **kwargs,
    ) -> Dict:
        data = self.to_dict_base(
            include_callback_blocks=include_callback_blocks,
            include_conditional_blocks=include_conditional_blocks,
        )

        if include_content:
            data['content'] = await self.content_async()
            if self.callback_block is not None:
                data['callback_content'] = await self.callback_block.content_async()

        if include_block_catalog and self.is_data_integration() and self.pipeline:
            data['catalog'] = await self.get_catalog_from_file_async()

        if include_outputs:
            include_outputs_use = include_outputs
            if self.is_using_spark() and self.compute_management_enabled():
                include_outputs_use = include_outputs_use and include_outputs_spark

            if include_outputs_use:
                data['outputs'] = await self.__outputs_async()

                if check_if_file_exists and not \
                        self.replicated_block and \
                        BlockType.GLOBAL_DATA_PRODUCT != self.type:

                    file_path = self.file.file_path
                    if not os.path.isfile(file_path):
                        data['error'] = dict(
                            error='No such file or directory',
                            message='You may have moved it or changed its filename. '
                            'Delete the current block to remove it from the pipeline '
                            'or write code and save the pipeline to create a new file at '
                            f'{file_path}.',
                        )

        if include_block_metadata:
            data['metadata'] = await self.metadata_async()

        if include_block_tags:
            data['tags'] = self.tags()

        if include_block_pipelines:
            data['pipelines'] = self.get_pipelines_from_cache()

        return data

    def update(self, data, **kwargs) -> 'Block':
        if 'name' in data and data['name'] != self.name:
            detach = kwargs.get('detach', False)
            self.__update_name(data['name'], detach=detach)

        if (
            'type' in data
            and self.type == BlockType.SCRATCHPAD
            and data['type'] != BlockType.SCRATCHPAD
        ):
            self.__update_type(data['type'])

        if 'color' in data and data['color'] != self.color:
            self.color = data['color']
            self.__update_pipeline_block()

        check_upstream_block_order = kwargs.get('check_upstream_block_order', False)
        if 'upstream_blocks' in data and (
            (check_upstream_block_order and
                data['upstream_blocks'] != self.upstream_block_uuids) or
            set(data['upstream_blocks']) != set(self.upstream_block_uuids)
        ):
            self.__update_upstream_blocks(
                data['upstream_blocks'],
                check_upstream_block_order=check_upstream_block_order,
            )

        if 'downstream_blocks' in data and self.pipeline:
            self.pipeline.update_block(
                self,
                downstream_block_uuids=data.get('downstream_blocks') or [],
                widget=BlockType.CHART == self.type,
            )

        if 'callback_blocks' in data and set(data['callback_blocks']) != set(
            self.callback_block_uuids
        ):
            self.__update_callback_blocks(data['callback_blocks'])

        if 'conditional_blocks' in data and set(data['conditional_blocks']) != set(
            self.conditional_block_uuids
        ):
            self.__update_conditional_blocks(data['conditional_blocks'])

        if 'configuration' in data and data['configuration'] != self.configuration:
            self.configuration = data['configuration']
            self.__update_pipeline_block()

        if 'executor_type' in data and data['executor_type'] != self.executor_type:
            self.executor_type = data['executor_type']
            self.__update_pipeline_block()

        if 'has_callback' in data and data['has_callback'] != self.has_callback:
            self.has_callback = data['has_callback']
            if self.has_callback:
                CallbackBlock.create(self.uuid)
            self.__update_pipeline_block()

        if 'retry_config' in data and data['retry_config'] != self.retry_config:
            self.retry_config = data['retry_config']
            self.__update_pipeline_block()

        if 'timeout' in data and data['timeout'] != self.timeout:
            self.timeout = data['timeout']
            self.__update_pipeline_block()

        if 'catalog' in data and self.pipeline:
            self.update_catalog_file(data.get('catalog'))

        return self

    def update_callback_blocks(self, callback_blocks: List[Any]) -> None:
        self.callback_blocks = callback_blocks

    def update_conditional_blocks(self, conditional_blocks: List[Any]) -> None:
        self.conditional_blocks = conditional_blocks

    def update_upstream_blocks(self, upstream_blocks: List[Any], **kwargs) -> None:
        self.upstream_blocks = upstream_blocks

    def update_content(
        self,
        content: str,
        widget=False,
        error_if_file_missing: bool = True,
    ) -> 'Block':
        if error_if_file_missing and not self.file.exists():
            raise Exception(f'File for block {self.uuid} does not exist at {self.file.file_path}.')

        if content != self.content:
            self.status = BlockStatus.UPDATED
            self._content = content
            self.file.update_content(content)
            self.__update_pipeline_block(widget=widget)
        return self

    async def update_content_async(self, content, widget=False) -> 'Block':
        block_content = await self.content_async()
        if content != block_content:
            self.status = BlockStatus.UPDATED
            self._content = content
            await self.file.update_content_async(content)
            self.__update_pipeline_block(widget=widget)
        return self

    def update_status(self, status: BlockStatus) -> None:
        self.status = status
        self.__update_pipeline_block(widget=BlockType.CHART == self.type)

    def get_all_upstream_blocks(self) -> List['Block']:
        queue = Queue()
        visited = set()
        queue.put(self)
        while not queue.empty():
            current_block = queue.get()
            for block in current_block.upstream_blocks:
                if block.uuid == self.uuid:
                    continue
                if block.uuid not in visited:
                    queue.put(block)
                    visited.add(block)
        return list(visited)

    def get_all_downstream_blocks(self) -> List['Block']:
        queue = Queue()
        visited = set()
        queue.put(self)
        while not queue.empty():
            current_block = queue.get()
            for block in current_block.downstream_blocks:
                if block.uuid == self.uuid:
                    continue
                if block.uuid not in visited:
                    queue.put(block)
                    visited.add(block)
        return list(visited)

    def run_upstream_blocks(
        self,
        from_notebook: bool = False,
        incomplete_only: bool = False,
        **kwargs
    ) -> None:
        def process_upstream_block(
            block: 'Block',
            root_blocks: List['Block'],
        ) -> List[str]:
            if len(block.upstream_blocks) == 0:
                root_blocks.append(block)
            return block.uuid

        upstream_blocks = list(filter(
            lambda x: not incomplete_only or BlockStatus.EXECUTED != x.status,
            self.get_all_upstream_blocks(),
        ))
        root_blocks = []
        upstream_block_uuids = list(
            map(lambda x: process_upstream_block(x, root_blocks), upstream_blocks),
        )

        run_blocks_sync(
            root_blocks,
            from_notebook=from_notebook,
            selected_blocks=upstream_block_uuids,
            **kwargs,
        )

    def run_tests(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        outputs: List[Any] = None,
        update_tests: bool = True,
        dynamic_block_uuid: str = None,
    ) -> None:
        if global_vars is None:
            global_vars = dict()
        if logging_tags is None:
            logging_tags = dict()

        self.dynamic_block_uuid = dynamic_block_uuid

        if self.pipeline \
            and PipelineType.INTEGRATION == self.pipeline.type \
                and self.type in [BlockType.DATA_LOADER, BlockType.DATA_EXPORTER]:

            return

        test_functions = []
        if update_tests:
            results = {
                'test': self._block_decorator(test_functions),
            }
            if custom_code is not None:
                exec(custom_code, results)
            elif os.path.exists(self.file_path):
                with open(self.file_path) as file:
                    exec(file.read(), results)
        else:
            test_functions = self.test_functions

        if outputs is None:
            outputs = self.get_raw_outputs(
                dynamic_block_uuid or self.uuid,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars,
            )

        if logger and 'logger' not in global_vars:
            global_vars['logger'] = logger

        with self._redirect_streams(
            build_block_output_stdout=build_block_output_stdout,
            from_notebook=from_notebook,
            logger=logger,
            logging_tags=logging_tags,
        ):
            if test_functions and len(test_functions) >= 0:
                tests_passed = 0
                for func in test_functions:
                    test_function = func
                    if from_notebook and self.module:
                        test_function = getattr(self.module, func.__name__)
                    try:
                        sig = signature(test_function)
                        has_kwargs = any([p.kind == p.VAR_KEYWORD for p in sig.parameters.values()])
                        if has_kwargs and global_vars is not None and len(global_vars) != 0:
                            test_function(*outputs, **global_vars)
                        else:
                            test_function(*outputs)
                        tests_passed += 1
                    except AssertionError as err:
                        error_message = f'FAIL: {test_function.__name__} (block: {self.uuid})'
                        stacktrace = traceback.format_exc()

                        if from_notebook:
                            error_json = json.dumps(dict(
                                error=str(err),
                                message=error_message,
                                stacktrace=stacktrace.split('\n'),
                            ))
                            print(f'[__internal_test__]{error_json}')
                        else:
                            print('==============================================================')
                            print(error_message)
                            print('--------------------------------------------------------------')
                            print(stacktrace)

                message = f'{tests_passed}/{len(test_functions)} tests passed.'
                if from_notebook:
                    if len(test_functions) >= 1:
                        success_json = json.dumps(dict(
                            message=message,
                        ))
                        print(f'[__internal_test__]{success_json}')
                else:
                    print('--------------------------------------------------------------')
                    print(message)

                if tests_passed != len(test_functions):
                    raise Exception(f'Failed to pass tests for block {self.uuid}')

            handle_run_tests(
                self,
                dynamic_block_uuid=dynamic_block_uuid,
                execution_partition=execution_partition,
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
            )

    def analyze_outputs(self, variable_mapping, shape_only: bool = False) -> None:
        if self.pipeline is None:
            return
        for uuid, data in variable_mapping.items():
            if type(data) is pd.DataFrame:
                if data.shape[1] > DATAFRAME_ANALYSIS_MAX_COLUMNS or shape_only:
                    self.pipeline.variable_manager.add_variable(
                        self.pipeline.uuid,
                        self.uuid,
                        uuid,
                        dict(
                            statistics=dict(
                                original_row_count=data.shape[0],
                                original_column_count=data.shape[1],
                            ),
                        ),
                        variable_type=VariableType.DATAFRAME_ANALYSIS,
                    )
                    continue
                if data.shape[0] > DATAFRAME_ANALYSIS_MAX_ROWS:
                    data_for_analysis = data.sample(DATAFRAME_ANALYSIS_MAX_ROWS).reset_index(
                        drop=True,
                    )
                else:
                    data_for_analysis = data.reset_index(drop=True)
                try:
                    from mage_ai.data_cleaner.data_cleaner import clean as clean_data
                    analysis = clean_data(
                        data_for_analysis,
                        df_original=data,
                        transform=False,
                        verbose=False,
                    )
                    self.pipeline.variable_manager.add_variable(
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
                    pass
                    # TODO: we use to silently fail, but it looks bad when using BigQuery
                    # print('\nFailed to analyze dataframe:')
                    # print(traceback.format_exc())

    def set_global_vars(self, global_vars: Dict) -> None:
        self.global_vars = global_vars
        for upstream_block in self.upstream_blocks:
            upstream_block.global_vars = global_vars

    def __consolidate_variables(self, variable_mapping: Dict) -> Dict:
        # Consolidate print variables
        output_variables = {k: v for k, v in variable_mapping.items() if is_output_variable(k)}
        print_variables = {k: v for k, v in variable_mapping.items()
                           if is_valid_print_variable(k, v, self.uuid)}

        print_variables_keys = sorted(print_variables.keys(), key=lambda k: int(k.split('_')[-1]))

        consolidated_print_variables = dict()
        state = dict(
            msg_key=None,
            msg_value=None,
            msg_type=None,
            consolidated_data=None,
        )

        def save_variable_and_reset_state() -> None:
            if state['msg_key'] is not None and state['msg_value'] is not None:
                state['msg_value']['data'] = state['consolidated_data']
                consolidated_print_variables[state['msg_key']] = json.dumps(state['msg_value'])
            state['msg_key'] = None
            state['msg_value'] = None
            state['msg_type'] = None
            state['consolidated_data'] = None

        for k in print_variables_keys:
            value = print_variables[k]
            try:
                json_value = json.loads(value)
            except Exception:
                consolidated_print_variables[k] = value
                save_variable_and_reset_state()
                continue

            if 'msg_type' not in json_value or 'data' not in json_value:
                consolidated_print_variables[k] = value
                save_variable_and_reset_state()
                continue

            if state['msg_key'] is not None and json_value['msg_type'] != state['msg_type']:
                save_variable_and_reset_state()

            data = json_value['data'] if type(json_value['data']) is list else [json_value['data']]
            if state['msg_key'] is None:
                state['msg_key'] = k
                state['msg_type'] = json_value['msg_type']
                state['msg_value'] = json_value
                state['consolidated_data'] = data
            else:
                if state['consolidated_data'][-1] == '':
                    # New line
                    state['consolidated_data'] = state['consolidated_data'][:-1] + data
                else:
                    # Not new line
                    state['consolidated_data'][-1] += data[0]
                    state['consolidated_data'] += data[1:]
        save_variable_and_reset_state()

        variable_mapping = merge_dict(output_variables, consolidated_print_variables)
        return variable_mapping

    def __enrich_global_vars(self, global_vars: Dict = None) -> Dict:
        """
        Enriches the provided global variables dictionary with additional context, Spark session,
        environment, configuration, and an empty context dictionary.

        Args:
            global_vars (Optional[Dict]): A dictionary of global variables to be enriched.
                If not provided, an empty dictionary is created.

        Returns:
            Dict: The enriched global variables dictionary.

        This method checks if the pipeline type is DATABRICKS or if the environment is a Spark
        environment. If true, it adds the Spark session to the global variables if not already
        present.

        If 'env' is not in the global variables, it adds the environment information using the
        'get_env()' function.

        Adds the block configuration to the global variables.

        If 'context' is not in global_vars, it adds an empty context dictionary.

        The final enriched global variables dictionary is assigned to the object's 'global_vars'
        attribute and returned.
        """
        if global_vars is None:
            global_vars = dict()
        if ((self.pipeline is not None and self.pipeline.type == PipelineType.DATABRICKS) or
                is_spark_env()):
            if not global_vars.get('spark'):
                spark = self.get_spark_session()
                if spark is not None:
                    global_vars['spark'] = spark
        if 'env' not in global_vars:
            global_vars['env'] = get_env()
        global_vars['configuration'] = self.configuration
        if 'context' not in global_vars:
            global_vars['context'] = dict()

        self.global_vars = global_vars

        return global_vars

    def get_spark_session(self):
        if self.spark_init and (not self.pipeline or
                                not self.pipeline.spark_config):
            return self.spark

        try:
            if self.pipeline and self.pipeline.spark_config:
                spark_config = SparkConfig.load(
                    config=self.pipeline.spark_config)
            else:
                repo_config = RepoConfig(repo_path=self.repo_path)
                spark_config = SparkConfig.load(
                    config=repo_config.spark_config)
            self.spark = get_spark_session(spark_config)
        except Exception:
            self.spark = None

        if not self.spark and self.global_vars and self.global_vars.get('spark'):
            self.spark = self.global_vars.get('spark')

        self.spark_init = True
        return self.spark

    def __get_spark_session_from_global_vars(self, global_vars: Dict = None):
        if global_vars is None:
            global_vars = dict()
        spark = global_vars.get('spark')
        if self.pipeline and self.pipeline.spark_config:
            spark_config = self.pipeline.spark_config
        else:
            repo_config = RepoConfig(repo_path=self.repo_path)
            spark_config = repo_config.spark_config
        if not spark_config:
            return spark
        spark_config = SparkConfig.load(config=spark_config)
        if spark_config.use_custom_session:
            return global_vars.get('context', dict()).get(
                spark_config.custom_session_var_name, spark)
        return spark

    def __store_variables_prepare(
        self,
        variable_mapping: Dict,
        execution_partition: str = None,
        override: bool = False,
        override_outputs: bool = False,
        dynamic_block_uuid: str = None,
    ) -> Dict:
        self.dynamic_block_uuid = dynamic_block_uuid

        block_uuid = self.uuid
        clean_block_uuid = True
        if dynamic_block_uuid is not None:
            block_uuid = os.path.join(*dynamic_block_uuid.split(':'))
            clean_block_uuid = False

        if self.pipeline is None:
            return

        all_variables = self.pipeline.variable_manager.get_variables_by_block(
            self.pipeline.uuid,
            block_uuid=block_uuid,
            partition=execution_partition,
            clean_block_uuid=clean_block_uuid,
        )

        variable_mapping = self.__consolidate_variables(variable_mapping)

        variable_names = [clean_name_orig(v) for v in variable_mapping]
        removed_variables = []
        for v in all_variables:
            if v in variable_names:
                continue

            is_output_var = is_output_variable(v)
            if (override and not is_output_var) or (override_outputs and is_output_var):
                removed_variables.append(v)

        return dict(
            removed_variables=removed_variables,
            variable_mapping=variable_mapping,
        )

    def store_variables(
        self,
        variable_mapping: Dict,
        execution_partition: str = None,
        override: bool = False,
        override_outputs: bool = False,
        spark=None,
        dynamic_block_uuid: str = None,
    ) -> None:
        variables_data = self.__store_variables_prepare(
            variable_mapping,
            execution_partition,
            override,
            override_outputs,
            dynamic_block_uuid=dynamic_block_uuid,
        )

        block_uuid = self.uuid
        clean_block_uuid = True
        if dynamic_block_uuid is not None:
            block_uuid = os.path.join(*dynamic_block_uuid.split(':'))
            clean_block_uuid = False

        for uuid, data in variables_data['variable_mapping'].items():
            if spark is not None and self.pipeline.type == PipelineType.PYSPARK \
                    and type(data) is pd.DataFrame:
                data = spark.createDataFrame(data)

            self.pipeline.variable_manager.add_variable(
                self.pipeline.uuid,
                block_uuid,
                uuid,
                data,
                partition=execution_partition,
                clean_block_uuid=clean_block_uuid,
            )

        for uuid in variables_data['removed_variables']:
            self.pipeline.variable_manager.delete_variable(
                self.pipeline.uuid,
                block_uuid,
                uuid,
            )

    async def store_variables_async(
        self,
        variable_mapping: Dict,
        execution_partition: str = None,
        override: bool = False,
        override_outputs: bool = False,
        spark=None,
        dynamic_block_uuid: str = None,
    ) -> None:
        variables_data = self.__store_variables_prepare(
            variable_mapping,
            execution_partition,
            override,
            override_outputs,
            dynamic_block_uuid,
        )

        block_uuid = self.uuid
        clean_block_uuid = True
        if dynamic_block_uuid is not None:
            block_uuid = os.path.join(*dynamic_block_uuid.split(':'))
            clean_block_uuid = False

        for uuid, data in variables_data['variable_mapping'].items():
            if spark is not None and type(data) is pd.DataFrame:
                data = spark.createDataFrame(data)

            await self.pipeline.variable_manager.add_variable_async(
                self.pipeline.uuid,
                block_uuid,
                uuid,
                data,
                partition=execution_partition,
                clean_block_uuid=clean_block_uuid,
            )

        for uuid in variables_data['removed_variables']:
            self.pipeline.variable_manager.delete_variable(
                self.pipeline.uuid,
                block_uuid,
                uuid,
                clean_block_uuid=clean_block_uuid,
            )

    def input_variables(self, execution_partition: str = None) -> Dict[str, List[str]]:
        """Get input variables from upstream blocks' output variables.
        Args:
            execution_partition (str, optional): The execution paratition string.

        Returns:
            Dict[str, List[str]]: Mapping from upstream block uuid to a list of variable names
        """
        return input_variables(self.pipeline, self.upstream_block_uuids, execution_partition)

    def input_variable_objects(self, execution_partition: str = None) -> List:
        """Get input variable objects from upstream blocks' output variables.

        Args:
            execution_partition (str, optional): The execution paratition string.

        Returns:
            List: List of input variable objects.
        """
        objs = []
        for b in self.upstream_blocks:
            for v in b.output_variables(execution_partition=execution_partition):
                objs.append(
                    self.pipeline.variable_manager.get_variable_object(
                        self.pipeline.uuid,
                        b.uuid,
                        v,
                        partition=execution_partition,
                    ),
                )
        return objs

    def output_variables(
        self,
        execution_partition: str = None,
        dynamic_block_index: int = None,
        dynamic_upstream_block_uuids: List[str] = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_args: List[Any] = None,
        block_uuid: str = None,
    ) -> List[str]:
        return output_variables(
            self.pipeline,
            block_uuid or self.uuid,
            execution_partition,
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            from_notebook=from_notebook,
            global_vars=global_vars,
            input_args=input_args,
        )

    def output_variable_objects(
        self,
        execution_partition: str = None,
        variable_type: VariableType = None,
    ) -> List:
        """Get output variable objects.

        Args:
            execution_partition (str, optional): The execution paratition string.

        Returns:
            List: List of output variable objects.
        """
        if self.pipeline is None:
            return []

        output_variables = self.output_variables(execution_partition=execution_partition)

        if len(output_variables) == 0:
            return []

        variable_objects = [self.pipeline.variable_manager.get_variable_object(
            self.pipeline.uuid,
            self.uuid,
            v,
            partition=execution_partition,
        ) for v in output_variables]
        if variable_type is not None:
            variable_objects = [v for v in variable_objects if v.variable_type == variable_type]
        return variable_objects

    def tags(self) -> List[str]:
        from mage_ai.data_preparation.models.block.constants import (
            TAG_DYNAMIC,
            TAG_DYNAMIC_CHILD,
            TAG_REDUCE_OUTPUT,
            TAG_REPLICA,
        )

        arr = []

        if is_dynamic_block(self):
            arr.append(TAG_DYNAMIC)

        if is_dynamic_block_child(self):
            arr.append(TAG_DYNAMIC_CHILD)

        if should_reduce_output(self):
            arr.append(TAG_REDUCE_OUTPUT)

        if self.replicated_block:
            arr.append(TAG_REPLICA)

        return arr

    def variable_object(
        self,
        variable_uuid: str,
        execution_partition: str = None,
    ) -> Any:
        if self.pipeline is None:
            return []
        return self.pipeline.variable_manager.get_variable_object(
            self.pipeline.uuid,
            self.uuid,
            variable_uuid,
            partition=execution_partition,
        )

    def _block_decorator(self, decorated_functions) -> Callable:
        def custom_code(function) -> Callable:
            decorated_functions.append(function)
            return function

        return custom_code

    # TODO: Update all pipelines that use this block
    def __update_name(
        self,
        name: str,
        detach: bool = False,
    ) -> None:
        """
        1. Rename block file
        2. Update the folder of variable
        3. Update upstream and downstream relationships
        """
        old_uuid = self.uuid
        # This has to be here
        old_file_path = self.file_path
        block_content = self.content

        new_uuid = clean_name(name)
        self.name = name
        self.uuid = new_uuid
        # This has to be here
        new_file_path = self.file_path

        if self.pipeline is not None:
            if self.pipeline.has_block(
                new_uuid,
                block_type=self.type,
                extension_uuid=self.extension_uuid,
            ):
                raise Exception(
                    f'Block {new_uuid} already exists in pipeline. Please use a different name.'
                )

        if not self.replicated_block and BlockType.GLOBAL_DATA_PRODUCT != self.type:
            if os.path.exists(new_file_path):
                raise Exception(f'Block {new_uuid} already exists. Please use a different name.')

            parent_dir = os.path.dirname(new_file_path)
            os.makedirs(parent_dir, exist_ok=True)

            if detach:
                """"
                Detaching a block creates a copy of the block file while keeping the existing block
                file the same. Without detaching a block, the existing block file is simply renamed.
                """
                with open(new_file_path, 'w') as f:
                    f.write(block_content)
            else:
                os.rename(old_file_path, new_file_path)

        if self.pipeline is not None:
            self.pipeline.update_block_uuid(self, old_uuid, widget=BlockType.CHART == self.type)

            cache = BlockCache()
            if detach:
                """"
                New block added to pipeline, so it must be added to the block cache.
                Old block no longer in pipeline, so it must be removed from block cache.
                """
                cache.add_pipeline(self, self.pipeline)
                old_block = self.get_block(
                    old_uuid,
                    old_uuid,
                    self.type,
                    language=self.language,
                    pipeline=self.pipeline,
                )
                cache.remove_pipeline(old_block, self.pipeline.uuid)
            else:
                cache.move_pipelines(self, dict(
                    type=self.type,
                    uuid=old_uuid,
                ))

    def __update_pipeline_block(self, widget=False) -> None:
        if self.pipeline is None:
            return
        self.pipeline.update_block(self, widget=widget)

    def __update_type(self, block_type) -> None:
        """
        1. Move block file to another folder
        2. Update the block type in pipeline metadata.yaml
        3. Update the code in block file
        """
        old_file_path = self.file_path
        self.type = block_type
        new_file_path = self.file_path
        if os.path.exists(new_file_path):
            raise Exception(
                f'Block {self.type}{os.sep}{self.uuid} already exists.'
                ' Please rename it before changing the type.'
            )
        os.rename(old_file_path, new_file_path)
        if self.pipeline is not None:
            self.pipeline.update_block(self)
        with open(new_file_path) as f:
            existing_code = f.read()
        load_template(
            block_type,
            dict(existing_code='    ' + existing_code.replace('\n', '\n    ')),
            new_file_path,
            language=self.language,
        )

    def __update_upstream_blocks(
        self,
        upstream_blocks,
        check_upstream_block_order: bool = False,
    ) -> None:
        if self.pipeline is None:
            return
        self.pipeline.update_block(
            self,
            check_upstream_block_order=check_upstream_block_order,
            upstream_block_uuids=upstream_blocks,
            widget=BlockType.CHART == self.type,
        )

    def __update_callback_blocks(self, block_uuids: List[str]) -> None:
        if self.pipeline is None:
            return

        self.pipeline.update_block(
            self,
            callback_block_uuids=block_uuids,
            widget=BlockType.CHART == self.type,
        )

    def __update_conditional_blocks(self, block_uuids: List[str]) -> None:
        if self.pipeline is None:
            return

        self.pipeline.update_block(
            self,
            conditional_block_uuids=block_uuids,
            widget=BlockType.CHART == self.type,
        )


class SensorBlock(Block):
    def execute_block_function(
        self,
        block_function: Callable,
        input_vars: List,
        from_notebook: bool = False,
        global_vars: Dict = None,
    ) -> List:
        if from_notebook:
            return super().execute_block_function(
                block_function,
                input_vars,
                from_notebook=from_notebook,
                global_vars=global_vars,
            )
        else:
            sig = signature(block_function)
            has_args = any([p.kind == p.VAR_POSITIONAL for p in sig.parameters.values()])
            has_kwargs = any([p.kind == p.VAR_KEYWORD for p in sig.parameters.values()])
            use_global_vars = has_kwargs and global_vars is not None and len(global_vars) != 0
            args = input_vars if has_args else []
            while True:
                condition = block_function(*args, **global_vars) \
                            if use_global_vars else block_function()
                if condition:
                    break
                print('Sensor sleeping for 1 minute...')
                time.sleep(60)
            return []


class AddonBlock(Block):
    def _create_global_vars(
        self,
        global_vars: Dict,
        parent_block: Block,
        **kwargs,
    ) -> Dict:
        pipeline_run = kwargs.get('pipeline_run')
        global_vars = merge_dict(
            global_vars or dict(),
            dict(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=self.uuid,
                pipeline_run=pipeline_run,
            ),
        )
        if parent_block:
            global_vars['parent_block_uuid'] = parent_block.uuid

        if parent_block and \
                parent_block.pipeline and \
                PipelineType.INTEGRATION == parent_block.pipeline.type:

            template_runtime_configuration = parent_block.template_runtime_configuration
            index = template_runtime_configuration.get('index', None)
            is_last_block_run = template_runtime_configuration.get('is_last_block_run', False)
            selected_streams = template_runtime_configuration.get('selected_streams', [])
            stream = selected_streams[0] if len(selected_streams) >= 1 else None
            destination_table = template_runtime_configuration.get('destination_table', stream)

            global_vars['index'] = index
            global_vars['is_last_block_run'] = is_last_block_run
            global_vars['stream'] = stream
            global_vars['destination_table'] = destination_table

        return global_vars


class ConditionalBlock(AddonBlock):
    def execute_conditional(
        self,
        parent_block: Block,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        execution_partition: str = None,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        **kwargs
    ) -> bool:
        with self._redirect_streams(
            logger=logger,
            logging_tags=logging_tags,
        ):
            global_vars = self._create_global_vars(
                global_vars,
                parent_block,
                **kwargs,
            )

            condition_functions = []

            results = dict(
                condition=self._block_decorator(condition_functions),
            )
            exec(self.content, results)

            global_vars_copy = global_vars.copy()
            input_vars = []
            # Fetch input variables for parent block
            if parent_block is not None:
                input_vars, kwargs_vars, _ = parent_block.fetch_input_variables(
                    None,
                    execution_partition=execution_partition,
                    global_vars=global_vars,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                )

                for kwargs_var in kwargs_vars:
                    global_vars_copy.update(kwargs_var)

            result = True
            for condition_function in condition_functions:
                result = condition_function(*input_vars, **global_vars_copy) and result

            return result


class CallbackBlock(AddonBlock):
    @classmethod
    def create(cls, orig_block_name) -> 'CallbackBlock':
        return Block.create(
            f'{clean_name_orig(orig_block_name)}_callback',
            BlockType.CALLBACK,
            get_repo_path(),
            language=BlockLanguage.PYTHON,
        )

    def execute_callback(
        self,
        callback: str,
        callback_kwargs: Dict = None,
        dynamic_block_index: Union[int, None] = None,
        dynamic_block_indexes: Dict = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        execution_partition: str = None,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        parent_block: Block = None,
        from_notebook: bool = False,
        **kwargs
    ) -> None:
        with self._redirect_streams(
            logger=logger,
            logging_tags=logging_tags,
        ):
            if callback_kwargs is None:
                callback_kwargs = dict()
            global_vars = self._create_global_vars(
                global_vars,
                parent_block,
                **kwargs
            )

            callback_functions = []
            failure_functions = []
            success_functions = []

            results = dict(
                callback=self._block_decorator(callback_functions),
                on_failure=super()._block_decorator(failure_functions),
                on_success=super()._block_decorator(success_functions),
            )
            exec(self.content, results)

            callback_functions_legacy = []
            callback_status = None

            if 'on_failure' == callback:
                callback_functions_legacy = failure_functions
                callback_status = CallbackStatus.FAILURE
            elif 'on_success' == callback:
                callback_functions_legacy = success_functions
                callback_status = CallbackStatus.SUCCESS

            # Fetch input variables
            input_vars, kwargs_vars, upstream_block_uuids = self.fetch_input_variables(
                None,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars,
                upstream_block_uuids=[parent_block.uuid] if parent_block else None,
            )

            # Copied logic from the method self.execute_block
            outputs_from_input_vars = {}
            upstream_block_uuids_length = len(upstream_block_uuids)
            for idx, input_var in enumerate(input_vars):
                if idx < upstream_block_uuids_length:
                    upstream_block_uuid = upstream_block_uuids[idx]
                    outputs_from_input_vars[upstream_block_uuid] = input_var
                    outputs_from_input_vars[f'df_{idx + 1}'] = input_var

            global_vars_copy = global_vars.copy()
            for kwargs_var in kwargs_vars:
                global_vars_copy.update(kwargs_var)

            callback_kwargs = merge_dict(
                callback_kwargs,
                global_vars_copy,
            )

            for callback_function in callback_functions_legacy:
                callback_function(**callback_kwargs)

            for callback_function in callback_functions:
                inner_function = callback_function(callback_status)
                if inner_function is not None:
                    sig = inspect.signature(inner_function)
                    # As of version 0.8.81, callback functions have access to the parent block’s
                    # data output. If the callback function has any positional arguments, we will
                    # pass in the input variables as positional arguments.
                    if not input_vars or any(
                        [
                            p.kind not in [p.KEYWORD_ONLY, p.VAR_KEYWORD]
                            for p in sig.parameters.values()
                        ]
                    ):
                        inner_function(
                            *input_vars,
                            **callback_kwargs,
                        )
                    # This else block will make the above code backwards compatible in case
                    # a user has already written callback functions with only keyword arguments.
                    else:
                        inner_function(
                            **merge_dict(callback_kwargs, dict(
                                __input=outputs_from_input_vars,
                            )),
                        )

    def update_content(self, content, widget=False) -> 'CallbackBlock':
        if not self.file.exists():
            raise Exception(f'File for block {self.uuid} does not exist at {self.file.file_path}.')

        if content != self.content:
            self._content = content
            self.file.update_content(content)
        return self

    async def update_content_async(self, content, widget=False) -> 'CallbackBlock':
        block_content = await self.content_async()
        if content != block_content:
            self._content = content
            await self.file.update_content_async(content)
        return self

    def _block_decorator(self, decorated_functions) -> Callable:
        def custom_code(callback_status: CallbackStatus = CallbackStatus.SUCCESS, *args, **kwargs):
            # If the decorator is just @callback with no arguments, default to success callback
            if isfunction(callback_status):
                def func(callback_status_inner, *args, **kwargs):
                    if callback_status_inner == CallbackStatus.SUCCESS:
                        return callback_status(*args, **kwargs)
                decorated_functions.append(func)
                return func

            if callback_status not in CALLBACK_STATUSES:
                raise Exception(
                    f"Callback status '{callback_status}' in @callback decorator must be 1 of: "
                    f"{', '.join(CALLBACK_STATUSES)}",
                )

            def inner(function):
                def func(callback_status_inner):
                    if callback_status_inner == callback_status:
                        return function
                decorated_functions.append(func)

            return inner

        return custom_code
