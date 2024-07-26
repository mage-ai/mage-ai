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
from enum import Enum
from inspect import Parameter, isfunction, signature
from logging import Logger
from pathlib import Path
from queue import Queue
from typing import (
    Any,
    Callable,
    Dict,
    Generator,
    Iterable,
    List,
    Optional,
    Set,
    Tuple,
    Union,
)

import inflection
import pandas as pd
import polars as pl
import simplejson
import yaml
from jinja2 import Template

import mage_ai.data_preparation.decorators
from mage_ai.cache.block import BlockCache
from mage_ai.data.constants import InputDataType
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_integrations.sources.constants import SQL_SOURCES_MAPPING
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.content import hydrate_block_outputs
from mage_ai.data_preparation.models.block.data_integration.mixins import (
    DataIntegrationMixin,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    execute_data_integration,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
    uuid_for_output_variables,
)
from mage_ai.data_preparation.models.block.dynamic.variables import (
    LazyVariableSet,
    delete_variable_objects_for_dynamic_child,
    fetch_input_variables_for_dynamic_upstream_blocks,
    get_outputs_for_dynamic_block,
    get_outputs_for_dynamic_block_async,
    get_outputs_for_dynamic_child,
)
from mage_ai.data_preparation.models.block.errors import HasDownstreamDependencies
from mage_ai.data_preparation.models.block.extension.utils import handle_run_tests
from mage_ai.data_preparation.models.block.outputs import (
    format_output_data,
    get_outputs_for_display_async,
    get_outputs_for_display_dynamic_block,
    get_outputs_for_display_sync,
)
from mage_ai.data_preparation.models.block.platform.mixins import (
    ProjectPlatformAccessible,
)
from mage_ai.data_preparation.models.block.platform.utils import from_another_project
from mage_ai.data_preparation.models.block.settings.dynamic.mixins import DynamicMixin
from mage_ai.data_preparation.models.block.settings.global_data_products.mixins import (
    GlobalDataProductsMixin,
)
from mage_ai.data_preparation.models.block.settings.variables.mixins import (
    VariablesMixin,
)
from mage_ai.data_preparation.models.block.settings.variables.models import (
    ChunkKeyTypeUnion,
)
from mage_ai.data_preparation.models.block.spark.mixins import SparkBlock
from mage_ai.data_preparation.models.block.utils import (
    clean_name,
    fetch_input_variables,
    input_variables,
    is_output_variable,
    is_valid_print_variable,
    output_variables,
)
from mage_ai.data_preparation.models.constants import (  # PIPELINES_FOLDER,
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    CALLBACK_STATUSES,
    CUSTOM_EXECUTION_BLOCK_TYPES,
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_ANALYSIS_MAX_ROWS,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
    DYNAMIC_CHILD_BLOCK_SAMPLE_COUNT_PREVIEW,
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
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
from mage_ai.data_preparation.models.utils import is_basic_iterable, warn_for_repo_path
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.variables.cache import (
    AggregateInformation,
    AggregateInformationData,
    InformationData,
    VariableAggregateCache,
)
from mage_ai.data_preparation.models.variables.constants import (
    VariableAggregateDataType,
    VariableAggregateSummaryGroupType,
    VariableType,
)
from mage_ai.data_preparation.models.variables.summarizer import (
    aggregate_summary_info_for_all_variables,
    get_aggregate_summary_info,
)
from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.data_integrations.utils import get_templates
from mage_ai.data_preparation.templates.template import load_template
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.io.base import ExportWritePolicy
from mage_ai.services.spark.config import SparkConfig
from mage_ai.services.spark.spark import SPARK_ENABLED, get_spark_session
from mage_ai.settings.platform.constants import project_platform_activated
from mage_ai.settings.repo import base_repo_path_directory_name, get_repo_path
from mage_ai.settings.server import VARIABLE_DATA_OUTPUT_META_CACHE
from mage_ai.shared.array import is_iterable, unique_by
from mage_ai.shared.constants import ENV_DEV, ENV_TEST
from mage_ai.shared.custom_logger import DX_PRINTER
from mage_ai.shared.environments import get_env, is_debug
from mage_ai.shared.hash import extract, ignore_keys, merge_dict
from mage_ai.shared.logger import BlockFunctionExec
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.path_fixer import (
    add_absolute_path,
    add_root_repo_path_to_relative_path,
    get_path_parts,
    remove_base_repo_path,
)
from mage_ai.shared.strings import format_enum
from mage_ai.shared.utils import clean_name as clean_name_orig
from mage_ai.shared.utils import is_spark_env

# from mage_ai.system.memory.manager import MemoryManager
from mage_ai.system.memory.wrappers import execute_with_memory_tracking
from mage_ai.system.models import ResourceUsage

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

        if (
            block.type in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES
            or not run_sensors
            and block.type == BlockType.SENSOR
        ):
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


class Block(
    DataIntegrationMixin,
    SparkBlock,
    ProjectPlatformAccessible,
    DynamicMixin,
    GlobalDataProductsMixin,
    VariablesMixin,
):
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
        groups: List[str] = None,
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
        self.groups = groups
        self.status = status
        self.pipeline = pipeline
        self.language = language or BlockLanguage.PYTHON
        self.color = block_color
        # Need to set this before using the custom @setter.configuration
        self._configuration = configuration
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
        self.template_runtime_configuration = {}

        self.dynamic_block_index = None
        self.dynamic_block_uuid = None
        self.dynamic_upstream_block_uuids = None

        # Spark session
        self.spark = None
        self.spark_init = False

        # Replicate block
        self.replicated_block = replicated_block
        self.replicated_blocks = {}
        self._replicated_block_object = None

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
        self._project_platform_activated = None

        # Needs to after self._project_platform_activated = None
        self.configuration = configuration

        self.resource_usage = None
        self._store_variables_in_block_function: Optional[
            Callable[..., Optional[List[VariableType]]]
        ] = None

        self._variable_aggregate_cache = None

    @property
    def uuid(self) -> str:
        return self._uuid

    @property
    def configuration(self) -> Dict:
        return self._configuration

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

    @configuration.setter
    def configuration(self, x) -> None:
        self._configuration = self.clean_file_paths(x) if x else x

    def get_original_block(self) -> 'Block':
        if self.replicated_block:
            return self.replicated_block_object.get_original_block()
        return self

    @property
    def replicated_block_object(self) -> 'Block':
        if self._replicated_block_object:
            return self._replicated_block_object

        if self.replicated_block and self.pipeline:
            self._replicated_block_object = self.pipeline.get_block(self.replicated_block)
            if self._replicated_block_object:
                self._replicated_block_object.replicated_blocks[self.uuid] = self

        return self._replicated_block_object

    @property
    def content(self) -> str:
        if self.replicated_block and self.replicated_block_object:
            self._content = self.replicated_block_object.content

        if BlockType.GLOBAL_DATA_PRODUCT == self.type:
            return ''

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

    @property
    def variable_manager(self) -> VariableManager:
        if not self.pipeline:
            return
        return self.pipeline.variable_manager

    @property
    def pipeline_uuid(self) -> str:
        return self.pipeline.uuid if self.pipeline else ''

    def __load_variable_aggregate_cache(self, variable_uuid: str) -> VariableAggregateCache:
        if not self._variable_aggregate_cache:
            self._variable_aggregate_cache = {variable_uuid: VariableAggregateCache()}

        if variable_uuid not in self._variable_aggregate_cache:
            self._variable_aggregate_cache[variable_uuid] = VariableAggregateCache()

        return self._variable_aggregate_cache[variable_uuid]

    def get_variable_aggregate_cache(
        self,
        variable_uuid: str,
        data_type: VariableAggregateDataType,
        default_group_type: Optional[VariableAggregateSummaryGroupType] = None,
        group_type: Optional[VariableAggregateSummaryGroupType] = None,
        infer_group_type: Optional[bool] = None,
        partition: Optional[str] = None,
    ) -> Optional[Union[AggregateInformationData, InformationData]]:
        if not VARIABLE_DATA_OUTPUT_META_CACHE:
            return

        cache = self.__load_variable_aggregate_cache(variable_uuid)
        cache = VariableAggregateCache.load(cache)

        if infer_group_type:
            group_type = (
                VariableAggregateSummaryGroupType.DYNAMIC
                if is_dynamic_block_child(self)
                else VariableAggregateSummaryGroupType.PARTS
            )

        keys = [v.value for v in [group_type, data_type] if v is not None]
        value = functools.reduce(getattr, keys, cache)

        if not value:
            cache_new = get_aggregate_summary_info(
                self.variable_manager,
                self.pipeline_uuid,
                self.uuid,
                variable_uuid,
                data_type,
                default_group_type=default_group_type,
                group_type=group_type,
                partition=partition,
            )
            group_value_use = (group_type.value if group_type else None) or (
                default_group_type.value if default_group_type else None
            )
            if group_value_use is not None:
                cache_group = AggregateInformation.load(getattr(cache, group_value_use))
                cache_group_new = AggregateInformation.load(getattr(cache_new, group_value_use))
                if cache_group_new:
                    for data in VariableAggregateDataType:
                        val = getattr(cache_group, data.value)
                        val_new = getattr(cache_group_new, data.value)
                        cache_group.update_attributes(**{
                            data.value: val_new or val,
                        })
                cache.update_attributes(**{
                    group_value_use: AggregateInformation.load(cache_group)
                })

            for data in VariableAggregateDataType:
                val = getattr(cache, data.value)
                val_new = getattr(cache_new, data.value)
                cache.update_attributes(**{
                    data.value: val_new or val,
                })

            cache = VariableAggregateCache.load(cache)
            self._variable_aggregate_cache = merge_dict(
                self._variable_aggregate_cache or {},
                {variable_uuid: cache},
            )
            value = functools.reduce(getattr, keys, cache)

        return value

    def get_resource_usage(
        self,
        block_uuid: Optional[str] = None,
        index: Optional[int] = None,
        partition: Optional[str] = None,
        variable_uuid: Optional[str] = None,
    ) -> Optional[ResourceUsage]:
        try:
            if not VARIABLE_DATA_OUTPUT_META_CACHE:
                variable = self.get_variable_object(
                    block_uuid or self.uuid, partition=partition, variable_uuid=variable_uuid
                )
                return variable.get_resource_usage(index=index)

            values = self.get_variable_aggregate_cache(
                variable_uuid,
                VariableAggregateDataType.RESOURCE_USAGE,
                infer_group_type=index is not None,
                partition=partition,
            )

            if index is not None:
                if values and isinstance(values, list) and len(values) > index:
                    values = values[index]
            else:
                values = values

            if isinstance(values, Iterable) and len(values) >= 1:
                values = values[0]

            return values
        except Exception as err:
            print(f'[ERROR] Block.get_resource_usage: {err}')
            return ResourceUsage()

    def get_analysis(
        self,
        block_uuid: Optional[str] = None,
        index: Optional[int] = None,
        partition: Optional[str] = None,
        variable_uuid: Optional[str] = None,
    ) -> Optional[Dict]:
        try:
            if not VARIABLE_DATA_OUTPUT_META_CACHE:
                variable = self.get_variable_object(
                    block_uuid or self.uuid, partition=partition, variable_uuid=variable_uuid
                )
                return variable.get_analysis(index=index)

            values = self.get_variable_aggregate_cache(
                variable_uuid,
                VariableAggregateDataType.STATISTICS,
                infer_group_type=index is not None,
                partition=partition,
            )

            value = None
            if index is not None:
                if values and isinstance(values, list) and len(values) > index:
                    value = values[index]
            else:
                value = values

            if isinstance(value, Iterable) and len(value) >= 1:
                value = value[0]

            if value is not None:
                return dict(statistics=value.to_dict() if value else {})
        except Exception as err:
            print(f'[ERROR] Block.get_analysis: {err}')
            return {}

    async def content_async(self) -> str:
        if self.replicated_block and self.replicated_block_object:
            self._content = await self.replicated_block_object.content_async()

        if BlockType.GLOBAL_DATA_PRODUCT == self.type:
            return ''

        if self._content is None:
            self._content = await self.file.content_async()

        return self._content

    def interpolate_content(
        self,
        content: str,
        dynamic_block_index: int = None,
        dynamic_block_indexes: int = None,
        dynamic_upstream_block_uuids: int = None,
        execution_partition: str = None,
        from_notebook: bool = False,
        outputs_from_input_vars: Dict = None,
        upstream_block_uuids: List[str] = None,
        variables: Dict = None,
        **kwargs,
    ) -> str:
        variables = variables or {}
        if self.pipeline and self.pipeline.variables and not variables:
            # If variables is an empty dictionary, set it with the pipeline variables
            variables.update(self.pipeline.variables)

        if upstream_block_uuids is None:
            upstream_block_uuids = self.upstream_block_uuids

        if outputs_from_input_vars is None:
            if BlockLanguage.SQL == self.language and any([
                is_dynamic_block(
                    upstream_block,
                )
                or is_dynamic_block_child(
                    upstream_block,
                )
                for upstream_block in self.upstream_blocks
            ]):
                (
                    outputs_from_input_vars,
                    _kwargs_vars,
                    upstream_block_uuids,
                ) = fetch_input_variables_for_dynamic_upstream_blocks(
                    self,
                    None,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_block_indexes=dynamic_block_indexes,
                    execution_partition=execution_partition,
                    from_notebook=from_notebook,
                    global_vars=variables,
                )
            else:
                (
                    outputs_from_input_vars,
                    _input_vars,
                    _kwargs_vars,
                    upstream_block_uuids,
                ) = self.__get_outputs_from_input_vars(
                    dynamic_block_index=dynamic_block_index,
                    dynamic_block_indexes=dynamic_block_indexes,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    execution_partition=execution_partition,
                    from_notebook=from_notebook,
                    global_vars=variables,
                )

        return hydrate_block_outputs(
            content,
            outputs_from_input_vars=outputs_from_input_vars,
            upstream_block_uuids=upstream_block_uuids,
            variables=variables,
        )

    async def metadata_async(self) -> Dict:
        if self.is_data_integration():
            grouped_templates = get_templates(group_templates=True)

            if BlockLanguage.YAML == self.language:
                content = await self.content_async()
                if content:
                    try:
                        text = self.interpolate_content(content)
                    except Exception:
                        traceback.print_exc()
                        text = content
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
                        ignore_keys(
                            di_settings or {},
                            [
                                'catalog',
                                'config',
                                'data_integration_uuid',
                            ],
                        ),
                    )
                    di_metadata['sql'] = uuid in SQL_SOURCES_MAPPING

                    return dict(
                        data_integration=di_metadata,
                    )
                except Exception as err:
                    if is_debug():
                        print(f'[ERROR] Block.metadata_async: {err}')

        return {}

    def exists(self) -> bool:
        return self.file.exists()

    @property
    def executable(self) -> bool:
        return self.type not in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES and (
            self.pipeline is None or self.pipeline.type != PipelineType.STREAMING
        )

    @property
    def outputs(self) -> List:
        if not self._outputs_loaded:
            if self._outputs is None or len(self._outputs) == 0:
                self._outputs = self.get_outputs()
        return self._outputs

    async def __outputs_async(
        self, exclude_blank_variable_uuids: bool = False, max_results: Optional[int] = None
    ) -> List:
        if not self._outputs_loaded:
            if self._outputs is None or len(self._outputs) == 0:
                self._outputs = await self.__get_outputs_async(
                    exclude_blank_variable_uuids=exclude_blank_variable_uuids,
                    max_results=max_results,
                )
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
        if self.project_platform_activated:
            repo_path = self.get_repo_path_from_configuration()
            if repo_path:
                return repo_path

        return self.pipeline.repo_path if self.pipeline is not None else get_repo_path()

    @classmethod
    def __build_file_path(
        self,
        repo_path: str,
        block_uuid: str,
        block_type: BlockType,
        language: BlockLanguage,
        relative_path: bool = False,
    ) -> str:
        file_extension = BLOCK_LANGUAGE_TO_FILE_EXTENSION[language]
        block_directory = f'{block_type}s' if block_type != BlockType.CUSTOM else block_type

        parts = []
        if not relative_path:
            parts.append(repo_path or os.getcwd())
        parts += [
            block_directory,
            f'{block_uuid}.{file_extension}',
        ]

        return os.path.join(*parts)

    @property
    def file_path(self) -> str:
        if self.replicated_block and self.replicated_block_object:
            return self.replicated_block_object.file_path

        file_path = self.get_file_path_from_source()
        if not file_path:
            file_path = self.configuration.get('file_path')

        if file_path:
            return add_absolute_path(file_path)

        return self.__build_file_path(
            self.repo_path,
            self.uuid,
            self.type,
            self.language,
        )

    def build_file_path_directory(
        self,
        block_uuid: Optional[str] = None,
    ) -> Tuple[Optional[str], Optional[str]]:
        file_path = None
        file_path_absolute = None

        if self.replicated_block and self.replicated_block_object:
            (
                file_path_absolute,
                file_path,
            ) = self.replicated_block_object.build_file_path_directory(
                block_uuid=block_uuid,
            )

        if not file_path:
            file_path = self.get_file_path_from_source() or self.configuration.get('file_path')

        if not file_path:
            file_path = self.__build_file_path(
                self.repo_path or os.getcwd(),
                self.uuid,
                self.type,
                self.language,
                relative_path=True,
            )

        if block_uuid:
            old_file_path = Path(file_path)
            old_file_extension = old_file_path.suffix
            new_file_name = f'{block_uuid}{old_file_extension}'
            file_path = str(old_file_path.with_name(new_file_name))

        if file_path:
            file_path_absolute = add_absolute_path(file_path)

            if not file_path_absolute and block_uuid:
                file_path_absolute = self.__build_file_path(
                    self.repo_path or os.getcwd(),
                    block_uuid,
                    self.type,
                    self.language,
                    relative_path=False,
                )

        return file_path_absolute, file_path

    @property
    def file(self) -> File:
        if self.replicated_block and self.replicated_block_object:
            return self.replicated_block_object.file

        if self.project_platform_activated:
            file = self.build_file()
            if file:
                return file

        repo_path = self.pipeline.repo_path if self.pipeline else None
        new_file = File.from_path(self.file_path, repo_path=repo_path)

        if not new_file.filename or not new_file.dir_path:
            new_file = File.from_path(
                self.__build_file_path(
                    new_file.repo_path,
                    self.uuid,
                    self.type,
                    self.language,
                )
            )

        return new_file

    @property
    def table_name(self) -> str:
        if self.configuration and self.configuration.get('data_provider_table'):
            return self.configuration['data_provider_table']

        table_name = (
            f'{self.pipeline_uuid}_{clean_name_orig(self.uuid)}_' f'{self.pipeline.version_name}'
        )

        env = (self.global_vars or dict()).get('env')
        if env == ENV_DEV:
            table_name = f'dev_{table_name}'
        elif env == ENV_TEST:
            table_name = f'test_{table_name}'

        return table_name

    @property
    def full_table_name(self) -> Optional[str]:
        from mage_ai.data_preparation.models.block.sql.utils.shared import (
            extract_full_table_name,
        )

        return extract_full_table_name(self.content)

    @classmethod
    def after_create(cls, block: 'Block', **kwargs) -> None:
        widget = kwargs.get('widget')
        pipeline = kwargs.get('pipeline')
        if pipeline is not None:
            priority = kwargs.get('priority')
            downstream_block_uuids = kwargs.get('downstream_block_uuids', [])
            upstream_block_uuids = kwargs.get('upstream_block_uuids', [])

            if BlockType.DBT == block.type:
                block.set_default_configurations()

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
        from mage_ai.data_preparation.models.block.block_factory import BlockFactory

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

        # Don’t create a file if it’s from another project.

        file_path_from_source = (
            configuration
            and configuration.get('file_source')
            and (configuration.get('file_source') or {}).get('path')
        )
        file_is_from_another_project = file_path_from_source and from_another_project(
            file_path=file_path_from_source,
            other_file_path=pipeline.dir_path if pipeline else None,
        )
        absolute_file_path = (
            add_root_repo_path_to_relative_path(
                file_path_from_source,
            )
            if file_path_from_source
            else None
        )

        if not file_is_from_another_project and (
            not absolute_file_path or not os.path.exists(absolute_file_path)
        ):
            if (
                not replicated_block
                and (BlockType.DBT != block_type or BlockLanguage.YAML == language)
                and BlockType.GLOBAL_DATA_PRODUCT != block_type
            ):
                block_directory = self.file_directory_name(block_type)
                if absolute_file_path:
                    block_dir_path = os.path.dirname(absolute_file_path)
                else:
                    block_dir_path = os.path.join(repo_path, block_directory)

                if not os.path.exists(block_dir_path):
                    os.mkdir(block_dir_path)
                    with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
                        pass

                file_extension = BLOCK_LANGUAGE_TO_FILE_EXTENSION[language]
                file_path = os.path.join(block_dir_path, f'{uuid}.{file_extension}')
                if os.path.exists(file_path):
                    already_exists = True
                    if (
                        pipeline is not None
                        and pipeline.has_block(
                            uuid,
                            block_type=block_type,
                            extension_uuid=extension_uuid,
                        )
                    ) or require_unique_name:
                        """
                        The BLOCK_EXISTS_ERROR constant is used on the frontend to identify when
                        a user is trying to create a new block with an existing block name, and
                        link them to the existing block file so the user can choose to add the
                        existing block to their pipeline.
                        """
                        raise Exception(
                            f'{BLOCK_EXISTS_ERROR} Block {uuid} already exists. \
                                        Please use a different name.'
                        )
                else:
                    load_template(
                        block_type,
                        config,
                        file_path,
                        language=language,
                        pipeline_type=pipeline.type if pipeline is not None else None,
                    )

        if project_platform_activated():
            configuration = configuration or {}
            if not configuration.get('file_source'):
                configuration['file_source'] = {}
            if not configuration['file_source'].get('path'):
                relative_path = str(Path(repo_path).relative_to(base_repo_path_directory_name()))
                configuration['file_source']['path'] = self.__build_file_path(
                    relative_path,
                    uuid,
                    block_type,
                    language,
                )

        block = BlockFactory.block_class_from_type(
            block_type,
            language=language,
            pipeline=pipeline,
        )(
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
            if block.file_path and not block.file.exists() and not file_is_from_another_project:
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
    def block_type_from_path(
        self, block_file_absolute_path: str, repo_path: str = None
    ) -> BlockType:
        warn_for_repo_path(repo_path)
        if not repo_path:
            repo_path = get_repo_path()
        file_path = str(block_file_absolute_path).replace(repo_path, '')
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
    def get_block_from_file_path(self, file_path: str) -> 'Block':
        parts = get_path_parts(file_path)

        if parts and len(parts) >= 3:
            from mage_ai.data_preparation.models.block.block_factory import BlockFactory

            # If file_path == transformers/test4.py
            # parts ==
            # ('/home/src/default_repo/default_platform2/project3', 'transformers', 'test4.py')
            # If project platform platform activated, then parts ==
            # ('/home/src', 'default_repo', 'data_loaders/astral_violet.py')

            root_project_full_path, path, file_path_base = parts

            if project_platform_activated():
                # ('data_loaders', 'astral_violet.py')
                file_parts = Path(file_path_base).parts
                block_type = inflection.singularize(str(file_parts[0]))
                block_uuid = str(Path(*file_parts[1:]).with_suffix(''))
            else:
                block_type = inflection.singularize(str(path))
                block_uuid = str(Path(file_path_base).with_suffix(''))

            extension = Path(file_path).suffix.replace('.', '')
            configuration = dict(file_path=file_path, file_source=dict(path=file_path))
            language = FILE_EXTENSION_TO_BLOCK_LANGUAGE.get(extension)

            return BlockFactory.get_block(
                block_uuid,
                block_uuid,
                block_type,
                configuration=configuration,
                language=language,
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
                pipelines = Pipeline.get_pipelines_by_block(
                    self,
                    repo_path=self.pipeline.repo_path,
                    widget=widget,
                )
                pipelines = [
                    pipeline for pipeline in pipelines if self.pipeline_uuid != pipeline.uuid
                ]
                if len(pipelines) == 0:
                    os.remove(self.file_path)
            return

        # TODO (tommy dang): delete this block from all pipelines in all projects
        # If pipeline is not specified, delete the block from all pipelines and delete the file.
        pipelines = Pipeline.get_pipelines_by_block(self, repo_path=self.repo_path, widget=widget)
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
        **kwargs,
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
                    **kwargs,
                )
                conditional_message = (
                    f'{conditional_message}Conditional block '
                    f'{conditional_block.uuid} evaluated to {block_result}.\n'
                )
                result = result and block_result

            # Print result to block output
            if not result:
                conditional_message += 'This block would not be executed in a trigger run.\n'
            conditional_json = json.dumps(
                dict(
                    message=conditional_message,
                )
            )
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
                **kwargs,
            )
        except Exception as error:
            for callback_block in callback_arr:
                callback_block.execute_callback(
                    'on_failure',
                    callback_kwargs=dict(__error=error),
                    from_notebook=from_notebook,
                    global_vars=merge_dict(global_vars, self.global_vars or {}),
                    logger=logger,
                    logging_tags=logging_tags,
                    parent_block=self,
                )
            raise

        for callback_block in callback_arr:
            callback_block.execute_callback(
                'on_success',
                global_vars=merge_dict(global_vars, self.global_vars or {}),
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
        metadata: Dict = None,
        override_outputs: bool = True,
        **kwargs,
    ) -> Dict:
        def __execute(
            self=self,
            analyze_outputs=analyze_outputs,
            block_run_outputs_cache=block_run_outputs_cache,
            build_block_output_stdout=build_block_output_stdout,
            custom_code=custom_code,
            data_integration_runtime_settings=data_integration_runtime_settings,
            disable_json_serialization=disable_json_serialization,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_indexes=dynamic_block_indexes,
            dynamic_block_uuid=dynamic_block_uuid,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            execution_partition=execution_partition,
            execution_partition_previous=execution_partition_previous,
            from_notebook=from_notebook,
            global_vars=global_vars,
            input_from_output=input_from_output,
            kwargs=kwargs,
            logger=logger,
            logging_tags=logging_tags,
            metadata=metadata,
            output_messages_to_logs=output_messages_to_logs,
            override_outputs=override_outputs,
            run_all_blocks=run_all_blocks,
            run_settings=run_settings,
            runtime_arguments=runtime_arguments,
            store_variables=store_variables,
            update_status=update_status,
            verify_output=verify_output,
        ) -> Dict:
            if logging_tags is None:
                logging_tags = dict()

            try:
                if not run_all_blocks:
                    not_executed_upstream_blocks = list(
                        filter(
                            lambda b: b.status == BlockStatus.NOT_EXECUTED,
                            self.upstream_blocks,
                        )
                    )
                    all_upstream_is_dbt = all([
                        BlockType.DBT == b.type for b in not_executed_upstream_blocks
                    ])
                    if not all_upstream_is_dbt and len(not_executed_upstream_blocks) > 0:
                        upstream_block_uuids = list(
                            map(lambda b: b.uuid, not_executed_upstream_blocks)
                        )
                        raise Exception(
                            f"Block {self.uuid}'s upstream blocks have not been executed yet. "
                            f'Please run upstream blocks {upstream_block_uuids} '
                            'before running the current block.'
                        )
                global_vars = self.enrich_global_vars(
                    global_vars,
                    dynamic_block_index=dynamic_block_index,
                )

                def __store_variables(
                    variable_mapping: Dict[str, Any],
                    skip_delete: Optional[bool] = None,
                    save_variable_types_only: Optional[bool] = None,
                    clean_variable_uuid: Optional[bool] = None,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_block_uuid=dynamic_block_uuid,
                    execution_partition=execution_partition,
                    global_vars=global_vars,
                    override_outputs=override_outputs,
                    self=self,
                ) -> Optional[List[Variable]]:
                    return self.store_variables(
                        variable_mapping,
                        clean_variable_uuid=clean_variable_uuid,
                        execution_partition=execution_partition,
                        override_outputs=override_outputs,
                        skip_delete=skip_delete,
                        spark=self.__get_spark_session_from_global_vars(
                            global_vars=global_vars,
                        ),
                        dynamic_block_index=dynamic_block_index,
                        dynamic_block_uuid=dynamic_block_uuid,
                        save_variable_types_only=save_variable_types_only,
                    )

                self._store_variables_in_block_function = __store_variables

                if output_messages_to_logs and not logger:
                    from mage_ai.data_preparation.models.block.constants import (
                        LOG_PARTITION_EDIT_PIPELINE,
                    )

                    logger_manager = LoggerManagerFactory.get_logger_manager(
                        block_uuid=datetime.utcnow().strftime(format='%Y%m%dT%H%M%S'),
                        partition=LOG_PARTITION_EDIT_PIPELINE,
                        pipeline_uuid=self.pipeline_uuid,
                        subpartition=clean_name(self.uuid),
                    )
                    logger = DictLogger(logger_manager.logger)
                    logging_tags = dict(
                        block_type=self.type,
                        block_uuid=self.uuid,
                        pipeline_uuid=self.pipeline_uuid,
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
                    metadata=metadata,
                    override_outputs=override_outputs,
                    **kwargs,
                )

                if self.configuration and self.configuration.get('disable_query_preprocessing'):
                    output = dict(output=None)
                else:
                    block_output = self.post_process_output(output)
                    variable_mapping = dict()

                    if BlockType.CHART == self.type:
                        variable_mapping = block_output
                        output = dict(
                            output=(
                                simplejson.dumps(
                                    block_output,
                                    default=encode_complex,
                                    ignore_nan=True,
                                )
                                if not disable_json_serialization
                                else block_output
                            ),
                        )
                    else:
                        output_count = len(block_output)
                        variable_keys = [f'output_{idx}' for idx in range(output_count)]
                        variable_mapping = dict(zip(variable_keys, block_output))

                    if (
                        store_variables
                        and self.pipeline
                        and self.pipeline.type != PipelineType.INTEGRATION
                    ):
                        try:
                            DX_PRINTER.critical(
                                block=self,
                                execution_partition=execution_partition,
                                override_outputs=override_outputs,
                                dynamic_block_uuid=dynamic_block_uuid,
                                __uuid='store_variables',
                            )

                            if self._store_variables_in_block_function and isinstance(
                                variable_mapping, dict
                            ):
                                self._store_variables_in_block_function(variable_mapping)

                        except ValueError as e:
                            if str(e) == 'Circular reference detected':
                                raise ValueError(
                                    'Please provide dataframe or json serializable data as output.'
                                )
                            raise e

                    if not is_dynamic_block_child(self):
                        # This will be handled in the execute_custom_code file so that it’s only
                        # invoked once.
                        self.aggregate_summary_info()

                    # Reset outputs cache
                    self._outputs = None

                    if BlockType.CHART != self.type:
                        if analyze_outputs:
                            self.analyze_outputs(
                                variable_mapping,
                                execution_partition=execution_partition,
                            )
                        else:
                            self.analyze_outputs(
                                variable_mapping,
                                execution_partition=execution_partition,
                                shape_only=True,
                            )

                if update_status:
                    self.status = BlockStatus.EXECUTED
            except Exception as err:
                if update_status:
                    self.status = BlockStatus.FAILED
                raise err
            finally:
                if update_status:
                    self.__update_pipeline_block(widget=BlockType.CHART == self.type)

            return output

        # if MEMORY_MANAGER_V2:
        #     metadata = {}
        #     if execution_partition:
        #         metadata['execution_partition'] = execution_partition
        #     if from_notebook:
        #         metadata['origin'] = 'ide'
        #     with MemoryManager(
        #         scope_uuid=os.path.join(
        #             *([PIPELINES_FOLDER, self.pipeline_uuid] if self.pipeline else ['']),
        #             self.uuid,
        #         ),
        #         process_uuid='block.execute_sync',
        #         repo_path=self.repo_path,
        #         metadata=metadata,
        #     ):
        #         return __execute()
        return __execute()

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
                ),
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
                        f"Block {self.uuid} may be missing upstream dependencies. "
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} '
                        f"arguments, but only received {num_inputs}. "
                        f"Confirm that the @{self.type} method declaration has the correct number "
                        "of arguments."
                    )
                else:
                    raise Exception(
                        f"Block {self.uuid} is missing input arguments. "
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} '
                        f"arguments, but only received {num_inputs}. "
                        f"Double check the @{self.type} method declaration has the correct number "
                        "of arguments and that the upstream blocks have been executed."
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

    def __get_outputs_from_input_vars(
        self,
        block_run_outputs_cache: Dict[str, List] = None,
        dynamic_block_index: int = None,
        dynamic_block_indexes: Dict = None,
        dynamic_upstream_block_uuids: List[str] = None,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_args: List = None,
        metadata: Dict = None,
    ) -> Tuple[Dict, List, Dict, List[str]]:
        """
        Only fetch the input variables that the destination block explicitly declares.
        If all the input variables are fetched, there is a chance that a lot of data from
        an upstream source block is loaded just to be used as inputs for the block’s
        decorated functions. Only do this for the notebook because
        """
        if from_notebook and self.is_data_integration():
            (
                input_vars,
                kwargs_vars,
                upstream_block_uuids,
            ) = self.fetch_input_variables_and_catalog(
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
                metadata=metadata,
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

        return outputs_from_input_vars, input_vars, kwargs_vars, upstream_block_uuids

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
        metadata: Dict = None,
        **kwargs,
    ) -> Dict:
        if logging_tags is None:
            logging_tags = dict()

        with self._redirect_streams(
            build_block_output_stdout=build_block_output_stdout,
            from_notebook=from_notebook,
            logger=logger,
            logging_tags=logging_tags,
        ):
            # Fetch input variables
            (
                outputs_from_input_vars,
                input_vars,
                kwargs_vars,
                upstream_block_uuids,
            ) = self.__get_outputs_from_input_vars(
                block_run_outputs_cache=block_run_outputs_cache,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_args=input_args,
                metadata=metadata,
            )

            global_vars_copy = global_vars.copy()
            for kwargs_var in kwargs_vars:
                if kwargs_var:
                    if isinstance(global_vars_copy, dict) and isinstance(kwargs_var, dict):
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

        results = merge_dict(
            {
                'preprocesser': self._block_decorator(preprocesser_functions),
                'test': self._block_decorator(test_functions),
                self.type: self._block_decorator(decorated_functions),
            },
            outputs_from_input_vars,
        )

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
                    dynamic_block_index=dynamic_block_index,
                    execution_partition=execution_partition,
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                    logger=logger,
                    logging_tags=logging_tags,
                )

        block_function = self._validate_execution(decorated_functions, input_vars)
        if block_function is not None:
            if logger:
                global_vars['logger'] = logger

            track_spark = from_notebook and self.should_track_spark()

            if track_spark:
                self.clear_spark_jobs_cache()
                self.cache_spark_application()
                self.set_spark_job_execution_start()

            outputs = self.execute_block_function(
                block_function,
                input_vars,
                dynamic_block_index=dynamic_block_index,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
            )

            if track_spark:
                self.set_spark_job_execution_end()

        self.test_functions = test_functions

        if outputs is None:
            outputs = []

        if isinstance(outputs, tuple):
            outputs = list(outputs)

        if not isinstance(outputs, list):
            outputs = [outputs]

        return outputs

    def execute_block_function(
        self,
        block_function: Callable,
        input_vars: List,
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
        execution_partition: Optional[str] = None,
        from_notebook: bool = False,
        global_vars: Optional[Dict] = None,
        initialize_decorator_modules: bool = True,
        logger: Optional[Logger] = None,
        logging_tags: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        from mage_ai.settings.server import (
            MEMORY_MANAGER_V2,  # Need here to mock in tests
        )

        sig = signature(block_function)
        has_kwargs = any([p.kind == p.VAR_KEYWORD for p in sig.parameters.values()])

        block_function_updated = block_function
        if from_notebook and initialize_decorator_modules:
            block_function_updated = self.__initialize_decorator_modules(
                block_function,
                [str(self.type.value) if not isinstance(self.type, str) else str(self.type)]
                if self.type
                else [],
            )

        write_policy = (
            self.write_settings.batch_settings.mode
            if self.write_settings and self.write_settings.batch_settings
            else None
        )
        append_data = ExportWritePolicy.APPEND == write_policy
        part_index = None
        if append_data:
            block_uuid, changed = uuid_for_output_variables(
                self,
                block_uuid=self.uuid,
                dynamic_block_index=dynamic_block_index,
            )
            variable_object = self.get_variable_object(
                block_uuid=block_uuid,
                partition=execution_partition,
            )
            part_uuids = variable_object.part_uuids
            if part_uuids is not None:
                part_index = len(part_uuids)
                if global_vars:
                    global_vars.update(part_index=part_index)

        if MEMORY_MANAGER_V2:
            log_message_prefix = self.uuid
            if self.pipeline:
                log_message_prefix = f'{self.pipeline_uuid}:{log_message_prefix}'
            log_message_prefix = f'[{log_message_prefix}:execute_block_function]'

            output, self.resource_usage = execute_with_memory_tracking(
                block_function_updated,
                args=input_vars,
                kwargs=global_vars
                if has_kwargs and global_vars is not None and len(global_vars) != 0
                else None,
                logger=logger,
                logging_tags=logging_tags,
                log_message_prefix=log_message_prefix,
            )
        elif has_kwargs and global_vars is not None and len(global_vars) != 0:
            output = block_function_updated(*input_vars, **global_vars)
        else:
            output = block_function_updated(*input_vars)

        if MEMORY_MANAGER_V2 and inspect.isgeneratorfunction(block_function_updated):
            variable_types = []
            dynamic_child = is_dynamic_block_child(self)
            output_count = part_index if part_index is not None else 0
            if output is not None and is_iterable(output):
                if dynamic_child or self.is_dynamic_child:
                    # Each child will delete its own data
                    # How do we delete everything ahead of time?
                    delete_variable_objects_for_dynamic_child(
                        self,
                        dynamic_block_index=dynamic_block_index,
                        execution_partition=execution_partition,
                    )
                else:
                    self.delete_variables(
                        dynamic_block_index=dynamic_block_index,
                        dynamic_block_uuid=dynamic_block_uuid,
                        execution_partition=execution_partition,
                    )

                for data in output:
                    if self._store_variables_in_block_function is None:
                        raise Exception(
                            'Store variables function isn’t defined, '
                            'don’t proceed or else no data will be persisted'
                        )

                    store_options = {}
                    if output_count >= 1:
                        store_options['override_outputs'] = False

                    variable_mapping = {}

                    def __output_key(order: int, output_count=output_count):
                        return os.path.join(f'output_{order}', str(output_count))

                    if is_basic_iterable(data):
                        if data is None or len(data) == 1:
                            variable_mapping[__output_key(0)] = data
                        elif len(data) == 2 and isinstance(data[1], dict):
                            variable_mapping[__output_key(0)] = data[0]
                            variable_mapping[__output_key(1)] = data[1]
                        else:
                            for idx, item in enumerate(data):
                                variable_mapping[__output_key(idx)] = item
                    else:
                        variable_mapping[__output_key(0)] = data

                    variables = self._store_variables_in_block_function(
                        variable_mapping=variable_mapping,
                        clean_variable_uuid=False,
                        skip_delete=True,
                        **store_options,
                    )
                    if variables is not None and isinstance(variables, list):
                        variable_types += [
                            variable.variable_type
                            for variable in variables
                            if isinstance(variable, Variable)
                        ]

                    output_count += 1

                if len(variable_types) >= 1 and self._store_variables_in_block_function:
                    self._store_variables_in_block_function(
                        {'output_0': variable_types},
                        save_variable_types_only=True,
                    )

                self._store_variables_in_block_function = None

        if output is None:
            return []
        return output

    def __initialize_decorator_modules(
        self,
        block_function: Callable,
        decorator_module_names: List[str],
    ) -> Callable:
        # Initialize module
        block_uuid = self.uuid
        block_file_path = self.file_path
        if self.replicated_block and self.replicated_block_object:
            block_file_path = self.replicated_block_object.file_path
            block_uuid = self.replicated_block

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
            if is_debug():
                print(f'[WARNING] Block.initialize_decorator_modules: {err}')
            print('Falling back to default block execution...')

        return block_function

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
        metadata: Dict = None,
        upstream_block_uuids_override: List[str] = None,
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

        if (self.is_dynamic_v2 and self.is_dynamic_child) or (
            not self.is_dynamic_v2
            and any([
                is_dynamic_block(
                    upstream_block,
                )
                or is_dynamic_block_child(
                    upstream_block,
                )
                for upstream_block in self.upstream_blocks
            ])
        ):
            return fetch_input_variables_for_dynamic_upstream_blocks(
                self,
                input_args,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars,
                block_run_outputs_cache=block_run_outputs_cache,
                data_integration_settings_mapping=data_integration_settings_mapping,
                upstream_block_uuids_override=upstream_block_uuids_override,
            )

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
            metadata=metadata,
            upstream_block_uuids_override=upstream_block_uuids_override,
            current_block=self,
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
            data = self.variable_manager.get_variable(
                self.pipeline_uuid,
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
        clean_block_uuid: bool = True,
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
        max_results: Optional[int] = None,
        partition: Optional[str] = None,
    ) -> List[str]:
        block_uuid_use, changed = uuid_for_output_variables(
            self,
            block_uuid=block_uuid,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
        )

        res = self.variable_manager.get_variables_by_block(
            self.pipeline_uuid,
            block_uuid=block_uuid_use,
            clean_block_uuid=not changed and clean_block_uuid,
            max_results=max_results,
            partition=partition,
        )

        DX_PRINTER.debug(
            str(res),
            block=self,
            block_uuid_use=block_uuid_use,
            clean_block_uuid=not changed,
            partition=partition,
            __uuid='get_variables_by_block',
        )

        return res

    def get_variable(
        self,
        block_uuid: str,
        variable_uuid: str,
        dynamic_block_index: int = None,
        dynamic_block_uuid: str = None,
        partition: str = None,
        raise_exception: bool = False,
        spark=None,
        input_data_types: Optional[List[InputDataType]] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
    ):
        block_uuid_use, changed = uuid_for_output_variables(
            self,
            block_uuid=block_uuid,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
        )

        value = self.variable_manager.get_variable(
            self.pipeline_uuid,
            block_uuid=block_uuid_use,
            clean_block_uuid=not changed,
            partition=partition,
            raise_exception=raise_exception,
            spark=spark,
            variable_uuid=variable_uuid,
            input_data_types=input_data_types,
            read_batch_settings=read_batch_settings,
            read_chunks=read_chunks,
            write_batch_settings=write_batch_settings,
            write_chunks=write_chunks,
        )

        return value

    def read_partial_data(
        self,
        variable_uuid: str,
        batch_settings: Optional[BatchSettings] = None,
        chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        input_data_types: Optional[List[InputDataType]] = None,
        part_uuid: Optional[Union[int, str]] = None,
        partition: Optional[str] = None,
    ):
        return self.get_variable_object(
            self.uuid,
            variable_uuid,
            partition=partition,
        ).read_partial_data(
            batch_settings=batch_settings,
            chunks=chunks,
            input_data_types=input_data_types,
            part_uuid=part_uuid,
        )

    def get_variable_object(
        self,
        block_uuid: Optional[str] = None,
        variable_uuid: Optional[str] = None,
        clean_block_uuid: bool = True,
        dynamic_block_index: Optional[int] = None,
        input_data_types: Optional[List[InputDataType]] = None,
        ordinal_position: Optional[int] = None,  # Used to get cached variable information
        partition: Optional[str] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        skip_check_variable_type: Optional[bool] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
    ) -> Variable:
        block_uuid = block_uuid or self.uuid
        block_uuid, changed = uuid_for_output_variables(
            self,
            block_uuid=block_uuid,
            dynamic_block_index=dynamic_block_index,
        )

        variable_type_information = None
        variable_types_information = None
        skip_check_variable_type = skip_check_variable_type or False
        if VARIABLE_DATA_OUTPUT_META_CACHE:
            dynamic_child = is_dynamic_block_child(self)
            group_type = (
                VariableAggregateSummaryGroupType.DYNAMIC
                if dynamic_child
                else VariableAggregateSummaryGroupType.PARTS
            )
            variable_type_information = self.get_variable_aggregate_cache(
                variable_uuid, VariableAggregateDataType.TYPE, default_group_type=group_type
            )
            variable_types_information = self.get_variable_aggregate_cache(
                variable_uuid,
                VariableAggregateDataType.TYPE,
                group_type=group_type,
                partition=partition,
            )

            if (
                variable_type_information
                and variable_type_information.type == VariableType.ITERABLE
                and not variable_types_information
            ):
                # If the dynamic parent block is an interable with no types information,
                # then the data from the parent block won’t have any type information.
                # Skip variable type check when instantiating a variable object for the children.
                skip_check_variable_type = True
            elif (
                dynamic_child
                and variable_types_information is not None
                and isinstance(variable_types_information, Iterable)
                and (
                    (
                        dynamic_block_index is not None
                        and int(dynamic_block_index) < len(variable_types_information)
                    )
                    or (
                        ordinal_position is not None
                        and int(ordinal_position) < len(variable_types_information)
                    )
                )
            ):
                position = (
                    int(ordinal_position)
                    if ordinal_position is not None
                    else int(dynamic_block_index)
                    if dynamic_block_index is not None
                    else None
                )
                if position is not None and isinstance(variable_types_information, Iterable):
                    variable_type_information = variable_types_information[position]
                    if (
                        isinstance(variable_type_information, Iterable)
                        and len(variable_type_information) >= 1
                    ):
                        variable_type_information = variable_type_information[0]

                    variable_types_information = None

        variable_types = []
        if isinstance(variable_types_information, Iterable):
            for v in variable_types_information:
                if isinstance(v, list):
                    variable_types += [vv.type for vv in v]
                else:
                    variable_types.append(v.type)

        return self.variable_manager.get_variable_object(
            self.pipeline_uuid,
            block_uuid=block_uuid,
            clean_block_uuid=not changed and clean_block_uuid,
            partition=partition,
            spark=self.get_spark_session(),
            skip_check_variable_type=skip_check_variable_type,
            variable_type=variable_type_information.type
            if variable_type_information is not None
            else None,
            variable_types=variable_types,
            variable_uuid=variable_uuid,
            input_data_types=input_data_types,
            read_batch_settings=read_batch_settings,
            read_chunks=read_chunks,
            write_batch_settings=write_batch_settings,
            write_chunks=write_chunks,
        )

    def get_raw_outputs(
        self,
        block_uuid: str,
        execution_partition: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        dynamic_block_index: int = None,
        dynamic_block_uuid: str = None,
        input_data_types: Optional[List[InputDataType]] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
    ) -> List[Any]:
        all_variables = self.get_variables_by_block(
            block_uuid=block_uuid,
            partition=execution_partition,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
        )

        outputs = []

        for variable_uuid in all_variables:
            if not is_output_variable(variable_uuid):
                continue

            variable = self.pipeline.get_block_variable(
                block_uuid,
                variable_uuid,
                from_notebook=from_notebook,
                global_vars=global_vars,
                partition=execution_partition,
                raise_exception=True,
                spark=self.__get_spark_session_from_global_vars(global_vars),
                dynamic_block_index=dynamic_block_index,
                dynamic_block_uuid=dynamic_block_uuid,
                input_data_types=input_data_types,
                read_batch_settings=read_batch_settings,
                read_chunks=read_chunks,
                write_batch_settings=write_batch_settings,
                write_chunks=write_chunks,
            )
            outputs.append(variable)

        return outputs

    def get_outputs(
        self,
        block_uuid: Optional[str] = None,
        csv_lines_only: bool = False,
        dynamic_block_index: Optional[int] = None,
        exclude_blank_variable_uuids: bool = False,
        execution_partition: Optional[str] = None,
        include_print_outputs: bool = True,
        metadata: Optional[Dict] = None,
        sample: bool = True,
        sample_count: Optional[int] = None,
        selected_variables: Optional[List[str]] = None,
        variable_type: Optional[VariableType] = None,
    ) -> List[Dict[str, Any]]:
        is_dynamic_child = is_dynamic_block_child(self)
        is_dynamic = is_dynamic_block(self)

        if not is_dynamic and not is_dynamic_child:
            return get_outputs_for_display_sync(
                self,
                block_uuid=block_uuid,
                csv_lines_only=csv_lines_only,
                exclude_blank_variable_uuids=exclude_blank_variable_uuids,
                execution_partition=execution_partition,
                include_print_outputs=include_print_outputs,
                sample=sample,
                sample_count=sample_count or DATAFRAME_SAMPLE_COUNT_PREVIEW,
                selected_variables=selected_variables,
                variable_type=variable_type,
            )

        sample_count_use = sample_count or DYNAMIC_CHILD_BLOCK_SAMPLE_COUNT_PREVIEW
        output_sets = []
        variable_sets = []

        if is_dynamic_child:
            lazy_variable_controller = get_outputs_for_dynamic_child(
                self,
                execution_partition=execution_partition,
                sample=sample,
                sample_count=sample_count_use,
            )
            variable_sets: List[
                Union[
                    Tuple[Optional[Any], Dict],
                    List[LazyVariableSet],
                ],
            ] = lazy_variable_controller.render(
                dynamic_block_index=dynamic_block_index,
                lazy_load=True,
            )
        elif is_dynamic:
            output_pair: List[
                Optional[
                    Union[
                        Any,
                        Dict,
                        int,
                        pd.DataFrame,
                        str,
                    ]
                ]
            ] = get_outputs_for_dynamic_block(
                self,
                execution_partition=execution_partition,
                sample=sample,
                sample_count=sample_count_use,
            )
            output_sets.append(output_pair)

        output_sets = output_sets[:DATAFRAME_SAMPLE_COUNT_PREVIEW]
        variable_sets = variable_sets[:DATAFRAME_SAMPLE_COUNT_PREVIEW]
        child_data_sets = [lazy_variable_set.read_data() for lazy_variable_set in variable_sets]

        return get_outputs_for_display_dynamic_block(
            self,
            output_sets,
            child_data_sets,
            block_uuid=block_uuid,
            csv_lines_only=csv_lines_only,
            dynamic_block_index=dynamic_block_index,
            exclude_blank_variable_uuids=exclude_blank_variable_uuids,
            execution_partition=execution_partition,
            metadata=metadata,
            sample=sample,
            sample_count=sample_count_use,
        )

    async def __get_outputs_async(
        self,
        execution_partition: Optional[str] = None,
        include_print_outputs: bool = True,
        csv_lines_only: bool = False,
        sample: bool = True,
        sample_count: Optional[int] = None,
        variable_type: Optional[VariableType] = None,
        block_uuid: Optional[str] = None,
        selected_variables: Optional[List[str]] = None,
        metadata: Optional[Dict] = None,
        dynamic_block_index: Optional[int] = None,
        exclude_blank_variable_uuids: bool = False,
        max_results: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        is_dynamic_child = is_dynamic_block_child(self)
        is_dynamic = is_dynamic_block(self)

        if not is_dynamic and not is_dynamic_child:
            return await get_outputs_for_display_async(
                self,
                block_uuid=block_uuid,
                csv_lines_only=csv_lines_only,
                exclude_blank_variable_uuids=exclude_blank_variable_uuids,
                execution_partition=execution_partition,
                include_print_outputs=include_print_outputs,
                sample=sample,
                sample_count=sample_count or DATAFRAME_SAMPLE_COUNT_PREVIEW,
                selected_variables=selected_variables,
                variable_type=variable_type,
                max_results=max_results,
            )

        sample_count_use = sample_count or DYNAMIC_CHILD_BLOCK_SAMPLE_COUNT_PREVIEW
        output_sets = []
        variable_sets = []

        if is_dynamic_child:
            lazy_variable_controller = get_outputs_for_dynamic_child(
                self,
                execution_partition=execution_partition,
                limit_parts=max_results,
                sample=sample,
                sample_count=sample_count_use,
            )
            variable_sets: List[
                Union[
                    Tuple[Optional[Any], Dict],
                    List[LazyVariableSet],
                ],
            ] = await lazy_variable_controller.render_async(
                dynamic_block_index=dynamic_block_index,
                lazy_load=True,
            )

        elif is_dynamic:
            output_pair: List[
                Optional[Union[Dict, int, str, pd.DataFrame, Any]],
            ] = await get_outputs_for_dynamic_block_async(
                self,
                execution_partition=execution_partition,
                limit_parts=max_results,
                sample=sample,
                sample_count=sample_count_use,
            )
            output_sets.append(output_pair)

        # Limit the number of dynamic block children we display output for in the UI
        output_sets = output_sets[:DATAFRAME_SAMPLE_COUNT_PREVIEW]
        variable_sets = variable_sets[:DATAFRAME_SAMPLE_COUNT_PREVIEW]
        child_data_sets = await asyncio.gather(*[
            lazy_variable_set.read_data_async() for lazy_variable_set in variable_sets
        ])

        return get_outputs_for_display_dynamic_block(
            self,
            output_sets,
            child_data_sets,
            block_uuid=block_uuid,
            csv_lines_only=csv_lines_only,
            exclude_blank_variable_uuids=exclude_blank_variable_uuids,
            execution_partition=execution_partition,
            metadata=metadata,
            sample=sample,
            sample_count=sample_count_use,
        )

    def __format_output_data(self, *args, **kwargs) -> Tuple[Dict, bool]:
        return format_output_data(self, *args, **kwargs)

    def __save_outputs_prepare(self, outputs, override_output_variable: bool = False) -> Dict:
        variable_mapping = dict()
        for o in outputs:
            if o is None:
                continue

            if not isinstance(o, dict):
                continue

            if all(k in o for k in ['variable_uuid', 'text_data']) and (
                not is_output_variable(o['variable_uuid'])
                or BlockType.SCRATCHPAD == self.type
                or override_output_variable
            ):
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
        override_conditionally: bool = False,
        override_outputs: bool = False,
    ) -> None:
        variable_mapping = self.__save_outputs_prepare(outputs)

        if override_conditionally:
            for variable_uuid, _ in variable_mapping.items():
                variable = self.get_variable_object(
                    self.uuid,
                    variable_uuid,
                )
                if not variable or not variable.variable_type:
                    continue

                # if VariableType
                # variable = self.get_variable_object(variable_uuid=variable_uuid)
                # if variable.exists():
                #     variable_mapping.pop(variable_uuid)
                pass

        await self.store_variables_async(
            variable_mapping,
            override=override,
            override_outputs=override_outputs,
        )

    def get_executor_type(self) -> str:
        if self.executor_type:
            if isinstance(self.executor_type, Enum):
                executor_type_str = self.executor_type.value
            else:
                executor_type_str = self.executor_type
            block_executor_type = Template(executor_type_str).render(**get_template_vars())
        else:
            block_executor_type = None
        if not block_executor_type or block_executor_type == ExecutorType.LOCAL_PYTHON:
            # If block executor_type is not set, fall back to pipeline level executor_type
            if self.pipeline:
                pipeline_executor_type = self.pipeline.get_executor_type()
            else:
                pipeline_executor_type = None
            block_executor_type = pipeline_executor_type or block_executor_type
        return block_executor_type

    def get_pipelines_from_cache(self, block_cache: BlockCache = None) -> List[Dict]:
        if block_cache is None:
            block_cache = BlockCache()
        arr = block_cache.get_pipelines(self, self.repo_path)

        return unique_by(
            arr,
            lambda x: (
                f"{(x.get('pipeline') or {}).get('uuid')}_"
                f"{(x.get('pipeline') or {}).get('repo_path')}"
            ),
        )

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
            executor_type=(format_enum(self.executor_type) if self.executor_type else None),
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

        if self.groups:
            data['groups'] = self.groups

        return data

    def to_dict(
        self,
        include_block_catalog: bool = False,
        include_block_pipelines: bool = False,
        include_callback_blocks: bool = False,
        include_content: bool = False,
        include_outputs: bool = False,
        include_outputs_spark: bool = False,
        sample_count: int = None,
        block_cache: BlockCache = None,
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

        if include_block_pipelines:
            data['pipelines'] = self.get_pipelines_from_cache(block_cache=block_cache)

        if include_outputs:
            include_outputs_use = include_outputs
            if self.is_using_spark() and self.compute_management_enabled():
                include_outputs_use = include_outputs_use and include_outputs_spark

            if include_outputs_use:
                data['outputs'] = self.outputs

                if (
                    check_if_file_exists
                    and not self.replicated_block
                    and BlockType.GLOBAL_DATA_PRODUCT != self.type
                ):
                    file_path = self.file_path
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
        sample_count: Optional[int] = None,
        block_cache: Optional[BlockCache] = None,
        check_if_file_exists: bool = False,
        disable_output_preview: bool = False,
        exclude_blank_variable_uuids: bool = False,
        max_results: Optional[int] = None,
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
            if (
                self.is_using_spark()
                and self.compute_management_enabled()
                and self.pipeline
                and self.pipeline.type == PipelineType.PYSPARK
            ):
                include_outputs_use = include_outputs_use and include_outputs_spark

            if include_outputs_use:
                if (
                    disable_output_preview
                    and self.configuration
                    and self.configuration.get('disable_output_preview', False)
                ):
                    data['outputs'] = [
                        'Output preview is disabled for this block. '
                        'To enable it, go to block settings.',
                    ]
                else:
                    data['outputs'] = await self.__outputs_async(
                        exclude_blank_variable_uuids=exclude_blank_variable_uuids,
                        max_results=max_results,
                    )

                    if (
                        check_if_file_exists
                        and not self.replicated_block
                        and BlockType.GLOBAL_DATA_PRODUCT != self.type
                    ):
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
            data['pipelines'] = self.get_pipelines_from_cache(block_cache=block_cache)

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
            (check_upstream_block_order and data['upstream_blocks'] != self.upstream_block_uuids)
            or set(data['upstream_blocks']) != set(self.upstream_block_uuids)
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
                CallbackBlock.create(self.uuid, self.repo_path)
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
        if self.replicated_block:
            return self

        if error_if_file_missing and not self.file.exists():
            raise Exception(f'File for block {self.uuid} does not exist at {self.file.file_path}.')

        if content != self.content:
            self.status = BlockStatus.UPDATED
            self._content = content
            self.file.update_content(content)
            self.__update_pipeline_block(widget=widget)
        return self

    async def update_content_async(
        self,
        content,
        error_if_file_missing: bool = True,
        widget: bool = False,
    ) -> 'Block':
        if self.replicated_block:
            return self

        if error_if_file_missing and not self.file.exists():
            raise Exception(f'File for block {self.uuid} does not exist at {self.file.file_path}.')

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
        self, from_notebook: bool = False, incomplete_only: bool = False, **kwargs
    ) -> None:
        def process_upstream_block(
            block: 'Block',
            root_blocks: List['Block'],
        ) -> List[str]:
            if len(block.upstream_blocks) == 0:
                root_blocks.append(block)
            return block.uuid

        upstream_blocks = list(
            filter(
                lambda x: not incomplete_only or BlockStatus.EXECUTED != x.status,
                self.get_all_upstream_blocks(),
            )
        )
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
        dynamic_block_index: int = None,
        dynamic_block_uuid: str = None,
        **kwargs,
    ) -> None:
        if global_vars is None:
            global_vars = dict()
        if logging_tags is None:
            logging_tags = dict()

        if dynamic_block_index is not None:
            global_vars['dynamic_block_index'] = dynamic_block_index

        self.dynamic_block_uuid = dynamic_block_uuid

        if (
            self.pipeline
            and PipelineType.INTEGRATION == self.pipeline.type
            and self.type in [BlockType.DATA_LOADER, BlockType.DATA_EXPORTER]
        ):
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
                dynamic_block_index=dynamic_block_index,
                dynamic_block_uuid=dynamic_block_uuid,
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
                        has_kwargs = any([
                            p.kind == p.VAR_KEYWORD for p in sig.parameters.values()
                        ])
                        if has_kwargs and global_vars is not None and len(global_vars) != 0:
                            test_function(*outputs, **global_vars)
                        else:
                            test_function(*outputs)
                        tests_passed += 1
                    except AssertionError as err:
                        error_message = f'FAIL: {test_function.__name__} (block: {self.uuid})'
                        stacktrace = traceback.format_exc()

                        if from_notebook:
                            error_json = json.dumps(
                                dict(
                                    error=str(err),
                                    message=error_message,
                                    stacktrace=stacktrace.split('\n'),
                                )
                            )
                            print(f'[__internal_test__]{error_json}')
                        else:
                            print('==============================================================')
                            print(error_message)
                            print('--------------------------------------------------------------')
                            print(stacktrace)

                message = f'{tests_passed}/{len(test_functions)} tests passed.'
                if from_notebook:
                    if len(test_functions) >= 1:
                        success_json = json.dumps(
                            dict(
                                message=message,
                            )
                        )
                        print(f'[__internal_test__]{success_json}')
                else:
                    print('--------------------------------------------------------------')
                    print(message)

                if tests_passed != len(test_functions):
                    raise Exception(f'Failed to pass tests for block {self.uuid}')

            handle_run_tests(
                self,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_uuid=dynamic_block_uuid,
                execution_partition=execution_partition,
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
            )

    def analyze_outputs(
        self,
        variable_mapping,
        execution_partition: str = None,
        shape_only: bool = False,
    ) -> None:
        if self.pipeline is None:
            return

        for uuid, data in variable_mapping.items():
            if isinstance(data, pd.DataFrame):
                if data.shape[1] > DATAFRAME_ANALYSIS_MAX_COLUMNS or shape_only:
                    self.variable_manager.add_variable(
                        self.pipeline_uuid,
                        self.uuid,
                        uuid,
                        dict(
                            statistics=dict(
                                original_row_count=data.shape[0],
                                original_column_count=data.shape[1],
                            ),
                        ),
                        partition=execution_partition,
                        variable_type=VariableType.DATAFRAME_ANALYSIS,
                        disable_variable_type_inference=True,
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
                    self.variable_manager.add_variable(
                        self.pipeline_uuid,
                        self.uuid,
                        uuid,
                        dict(
                            metadata=dict(column_types=analysis['column_types']),
                            statistics=analysis['statistics'],
                            insights=analysis['insights'],
                            suggestions=analysis['suggestions'],
                        ),
                        partition=execution_partition,
                        variable_type=VariableType.DATAFRAME_ANALYSIS,
                    )
                except Exception as err:
                    if is_debug():
                        raise err
                    # TODO: we use to silently fail, but it looks bad when using BigQuery
                    # print('\nFailed to analyze dataframe:')
                    # print(traceback.format_exc())
            elif isinstance(data, pl.DataFrame):
                self.variable_manager.add_variable(
                    self.pipeline_uuid,
                    self.uuid,
                    uuid,
                    dict(
                        statistics=dict(
                            original_row_count=data.shape[0],
                            original_column_count=data.shape[1],
                        ),
                    ),
                    partition=execution_partition,
                    variable_type=VariableType.DATAFRAME_ANALYSIS,
                    disable_variable_type_inference=True,
                )

    def set_global_vars(self, global_vars: Dict) -> None:
        self.global_vars = global_vars
        for upstream_block in self.upstream_blocks:
            upstream_block.global_vars = global_vars

    def __consolidate_variables(self, variable_mapping: Dict) -> Dict:
        # Consolidate print variables
        if BlockType.SCRATCHPAD == self.type:
            output_variables = {}
            print_variables = variable_mapping.copy()
        else:
            output_variables = {k: v for k, v in variable_mapping.items() if is_output_variable(k)}
            print_variables = {
                k: v for k, v in variable_mapping.items()
                if is_valid_print_variable(k, v, self.uuid)
            }

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

            if json_value.get('msg_type') == 'status':
                # Do not save status messages
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

    def enrich_global_vars(
        self,
        global_vars: Dict = None,
        dynamic_block_index: int = None,
    ) -> Dict:
        from mage_ai.data_preparation.models.block.remote.models import RemoteBlock

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
        if (
            self.pipeline is not None and self.pipeline.type == PipelineType.DATABRICKS
        ) or is_spark_env():
            if not global_vars.get('spark'):
                spark = self.get_spark_session()
                if spark is not None:
                    global_vars['spark'] = spark
        if 'env' not in global_vars:
            global_vars['env'] = get_env()
        global_vars['configuration'] = self.configuration
        if 'context' not in global_vars:
            global_vars['context'] = dict()

        # Add pipeline uuid and block uuid to global_vars
        global_vars['pipeline_uuid'] = self.pipeline_uuid
        global_vars['block_uuid'] = self.uuid

        # Add repo_path to global_vars
        if self.pipeline and self.pipeline.repo_path:
            global_vars['repo_path'] = self.pipeline.repo_path
            # Setting value in os.environ is local to python subprocess
            os.environ['MAGE_RUNTIME__REPO_PATH'] = self.pipeline.repo_path

        if dynamic_block_index is not None:
            global_vars['dynamic_block_index'] = dynamic_block_index

        # Remote blocks
        if global_vars.get('remote_blocks'):
            global_vars['remote_blocks'] = [
                RemoteBlock.load(
                    **remote_block_dict,
                ).get_outputs()
                for remote_block_dict in global_vars['remote_blocks']
            ]

        self.global_vars = global_vars

        return global_vars

    def get_spark_session(self):
        if not SPARK_ENABLED:
            return None
        if self.spark_init and (not self.pipeline or not self.pipeline.spark_config):
            return self.spark

        try:
            if self.pipeline and self.pipeline.spark_config:
                spark_config = SparkConfig.load(config=self.pipeline.spark_config)
            else:
                repo_config = RepoConfig(repo_path=self.repo_path)
                spark_config = SparkConfig.load(config=repo_config.spark_config)
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
                spark_config.custom_session_var_name, spark
            )
        return spark

    def __get_variable_uuids(
        self,
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
        execution_partition: Optional[str] = None,
    ) -> Tuple[List[str], str, bool]:
        if self.pipeline is None:
            return []

        self.dynamic_block_uuid = dynamic_block_uuid

        block_uuid, changed = uuid_for_output_variables(
            self,
            block_uuid=self.uuid,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
        )

        return (
            self.variable_manager.get_variables_by_block(
                self.pipeline_uuid,
                block_uuid=block_uuid,
                partition=execution_partition,
                clean_block_uuid=not changed,
            ),
            block_uuid,
            changed,
        )

    def __store_variables_prepare(
        self,
        variable_mapping: Dict,
        execution_partition: Optional[str] = None,
        override: bool = False,
        override_outputs: bool = False,
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
    ) -> Dict:
        variable_uuids, _block_uuid, _changed = self.__get_variable_uuids(
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
            execution_partition=execution_partition,
        )

        variable_mapping = self.__consolidate_variables(variable_mapping)

        variable_names = [clean_name_orig(v) for v in variable_mapping]
        removed_variables = []
        for v in variable_uuids:
            if v in variable_names:
                continue

            is_output_var = is_output_variable(v)
            if (override and not is_output_var) or (override_outputs and is_output_var):
                removed_variables.append(v)

        return dict(
            removed_variables=removed_variables,
            variable_mapping=variable_mapping,
        )

    def delete_variables(
        self,
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
        execution_partition: Optional[str] = None,
        variable_uuids: Optional[List[str]] = None,
    ) -> None:
        if self.pipeline is None:
            return

        variable_uuids_all, block_uuid, _changed = self.__get_variable_uuids(
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
            execution_partition=execution_partition,
        )

        for variable_uuid in variable_uuids or variable_uuids_all:
            variable_object = self.variable_manager.get_variable_object(
                self.pipeline_uuid,
                block_uuid,
                variable_uuid,
                partition=execution_partition,
            )
            write_policy = (
                self.write_settings.batch_settings.mode
                if self.write_settings and self.write_settings.batch_settings
                else None
            )
            if write_policy and variable_object.data_exists():
                if ExportWritePolicy.FAIL == write_policy:
                    raise Exception(f'Write policy for block {self.uuid} is {write_policy}.')
                elif ExportWritePolicy.APPEND == write_policy:
                    return

            variable_object.delete()

    def aggregate_summary_info(self, execution_partition: Optional[str] = None):
        """
        Run this only after executing blocks in a notebook so that reading pipelines
        don’t take forever to load while waiting for all the nested variable folders
        to be read.
        """
        if not VARIABLE_DATA_OUTPUT_META_CACHE or not self.variable_manager:
            return

        aggregate_summary_info_for_all_variables(
            self.variable_manager,
            self.pipeline_uuid,
            self.uuid,
            partition=execution_partition,
        )

    def store_variables(
        self,
        variable_mapping: Dict,
        clean_variable_uuid: Optional[bool] = True,
        dynamic_block_index: Optional[int] = None,
        dynamic_block_uuid: Optional[str] = None,
        execution_partition: Optional[str] = None,
        override: bool = False,
        override_outputs: bool = False,
        skip_delete: Optional[bool] = None,
        spark: Optional[Any] = None,
        save_variable_types_only: Optional[Any] = None,
    ) -> Optional[List[Variable]]:
        block_uuid, changed = uuid_for_output_variables(
            self,
            block_uuid=self.uuid,
            dynamic_block_index=dynamic_block_index,
        )

        is_dynamic = is_dynamic_block(self)
        is_dynamic_child = is_dynamic_block_child(self)

        shared_args = dict(
            clean_block_uuid=not changed,
            clean_variable_uuid=not is_dynamic and not is_dynamic_child and clean_variable_uuid,
            partition=execution_partition,
        )

        if save_variable_types_only:
            for variable_uuid, variable_types in variable_mapping.items():
                self.variable_manager.add_variable_types(
                    self.pipeline_uuid,
                    block_uuid,
                    variable_uuid,
                    variable_types,
                    **shared_args,
                )
            return []

        variables_data = self.__store_variables_prepare(
            variable_mapping,
            execution_partition,
            override,
            override_outputs,
            dynamic_block_index=dynamic_block_index,
        )

        if not skip_delete and is_dynamic_child:
            # execute_block_function will take care of this if decorated function is a generator
            delete_variable_objects_for_dynamic_child(
                self,
                dynamic_block_index=dynamic_block_index,
                execution_partition=execution_partition,
            )

        variables = []
        for uuid, data in variables_data['variable_mapping'].items():
            if (
                spark is not None
                and self.pipeline is not None
                and self.pipeline.type == PipelineType.PYSPARK
                and isinstance(data, pd.DataFrame)
            ):
                data = spark.createDataFrame(data)

            variables.append(
                self.variable_manager.add_variable(
                    self.pipeline_uuid,
                    block_uuid,
                    uuid,
                    data,
                    resource_usage=self.resource_usage,
                    write_batch_settings=self.write_batch_settings,
                    write_chunks=self.write_chunks,
                    **shared_args,
                )
            )
        if not skip_delete and not is_dynamic_child and variables_data.get('removed_variables'):
            self.delete_variables(
                dynamic_block_index=dynamic_block_index,
                dynamic_block_uuid=dynamic_block_uuid,
                execution_partition=execution_partition,
                variable_uuids=variables_data['removed_variables'],
            )

        return variables

    async def store_variables_async(
        self,
        variable_mapping: Dict,
        execution_partition: str = None,
        override: bool = False,
        override_outputs: bool = False,
        spark=None,
        dynamic_block_index: int = None,
        dynamic_block_uuid: str = None,
    ) -> None:
        variables_data = self.__store_variables_prepare(
            variable_mapping,
            execution_partition,
            override,
            override_outputs,
            dynamic_block_index=dynamic_block_index,
        )

        block_uuid, changed = uuid_for_output_variables(
            self,
            block_uuid=self.uuid,
            dynamic_block_index=dynamic_block_index,
        )

        is_dynamic_child = is_dynamic_block_child(self)
        if is_dynamic_child:
            delete_variable_objects_for_dynamic_child(
                self,
                dynamic_block_index=dynamic_block_index,
                execution_partition=execution_partition,
            )

        for uuid, data in variables_data['variable_mapping'].items():
            if spark is not None and type(data) is pd.DataFrame:
                data = spark.createDataFrame(data)

            await self.variable_manager.add_variable_async(
                self.pipeline_uuid,
                block_uuid,
                uuid,
                data,
                partition=execution_partition,
                clean_block_uuid=not changed,
                write_batch_settings=self.write_batch_settings,
                write_chunks=self.write_chunks,
                resource_usage=self.resource_usage,
            )

        if not is_dynamic_child:
            for uuid in variables_data['removed_variables']:
                self.variable_manager.delete_variable(
                    self.pipeline_uuid,
                    block_uuid,
                    uuid,
                    clean_block_uuid=not changed,
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
                    self.get_variable_object(
                        self.pipeline_uuid,
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
        max_results: Optional[int] = None,
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
            max_results=max_results,
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

        variable_objects = [
            self.variable_manager.get_variable_object(
                self.pipeline_uuid,
                self.uuid,
                v,
                partition=execution_partition,
            )
            for v in output_variables
        ]
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
        return self.variable_manager.get_variable_object(
            self.pipeline_uuid,
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
        file_extension = Path(self.file_path).suffix if self.file_path else ''
        directory_name = self.file_directory_name(self.type)

        old_uuid = self.uuid
        # This has to be here
        old_file_path = self.file_path
        block_content = self.content

        new_uuid = clean_name(name)
        self.name = name
        self.uuid = new_uuid

        # This file has a path in its file_source that must be updated.
        if (
            project_platform_activated()
            and self.file_source_path()
            and add_absolute_path(self.file_source_path()) == self.file_path
        ):
            # /home/src/data-vault/perftools/mage/data_loaders/team/illusory_glitter
            old_file_path_without_extension = str(Path(old_file_path).with_suffix(''))
            #  /home/src/data-vault/perftools/mage/data_loaders/team
            old_file_path_without_uuid = str(
                Path(
                    old_file_path_without_extension.replace(
                        str(Path(old_uuid)),
                        '',
                    )
                )
            )

            # perftools/mage/data_loaders/team
            old_file_path_without_repo_path = remove_base_repo_path(old_file_path_without_uuid)
            # perftools/mage
            path_without_block_directory = str(old_file_path_without_repo_path).split(
                directory_name,
            )[0]

            file_extension_new = Path(self.uuid).suffix or file_extension
            # perftools/mage/data_loaders/load_titanic.py
            new_path = str(
                Path(
                    os.path.join(
                        path_without_block_directory,
                        directory_name,
                        str(Path(self.uuid).with_suffix('')),
                    )
                ).with_suffix(file_extension_new)
            )

            configuration = self.configuration or {}
            if not configuration.get('file_source'):
                configuration['file_source'] = {}
            configuration['file_source']['path'] = new_path
            self.configuration = configuration

        # This has to be here
        new_file_path, new_file_path_relative = self.build_file_path_directory(
            block_uuid=new_uuid,
        )

        configuration = self.configuration or {}
        if not configuration.get('file_source'):
            configuration['file_source'] = {}
        configuration['file_path'] = new_file_path_relative
        configuration['file_source']['path'] = new_file_path_relative
        self.configuration = configuration

        if self.pipeline is not None:
            DX_PRINTER.critical(
                block=self,
                old_uuid=old_uuid,
                old_file_path=old_file_path,
                block_content=block_content,
                new_uuid=new_uuid,
                name=self.name,
                uuid=self.uuid,
                file_path=new_file_path,
                pipeline=self.pipeline_uuid,
                repo_path=self.pipeline.repo_path,
                configuration=self.configuration,
                __uuid='__update_name',
            )

            if self.pipeline.has_block(
                new_uuid,
                block_type=self.type,
                extension_uuid=self.extension_uuid,
            ):
                raise Exception(
                    f'Block {new_uuid} already exists in pipeline. Please use a different name.'
                )

        if not self.replicated_block and BlockType.GLOBAL_DATA_PRODUCT != self.type:
            if new_file_path and os.path.exists(new_file_path):
                raise Exception(
                    f'Block {new_uuid} already exists at {new_file_path}. '
                    'Please use a different name.'
                )

            parent_dir = os.path.dirname(new_file_path)
            os.makedirs(parent_dir, exist_ok=True)

            if detach:
                """ "
                Detaching a block creates a copy of the block file while keeping the existing block
                file the same. Without detaching a block, the existing block file is simply renamed.
                """
                with open(new_file_path, 'w') as f:
                    f.write(block_content)
            elif os.path.exists(old_file_path):
                os.rename(old_file_path, new_file_path)

        if self.pipeline is not None:
            self.pipeline.update_block_uuid(self, old_uuid, widget=BlockType.CHART == self.type)

            cache = BlockCache()
            if detach:
                from mage_ai.data_preparation.models.block.block_factory import (
                    BlockFactory,
                )

                """"
                New block added to pipeline, so it must be added to the block cache.
                Old block no longer in pipeline, so it must be removed from block cache.
                """
                cache.add_pipeline(self, self.pipeline, self.pipeline.repo_path)
                old_block = BlockFactory.get_block(
                    old_uuid,
                    old_uuid,
                    self.type,
                    language=self.language,
                    pipeline=self.pipeline,
                )
                cache.remove_pipeline(old_block, self.pipeline_uuid, self.pipeline.repo_path)
            else:
                cache.move_pipelines(
                    self,
                    dict(
                        type=self.type,
                        uuid=old_uuid,
                    ),
                    self.pipeline.repo_path,
                )

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
        global_vars: Optional[Dict] = None,
        *args,
        **kwargs,
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
                condition = (
                    block_function(*args, **global_vars) if use_global_vars else block_function()
                )
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
        dynamic_block_index: int = None,
        **kwargs,
    ) -> Dict:
        pipeline_run = kwargs.get('pipeline_run')
        global_vars = merge_dict(
            global_vars or dict(),
            dict(
                pipeline_uuid=self.pipeline_uuid,
                block_uuid=self.uuid,
                pipeline_run=pipeline_run,
            ),
        )

        if dynamic_block_index is not None:
            global_vars['dynamic_block_index'] = dynamic_block_index

        if parent_block:
            if parent_block.global_vars is None:
                global_vars_copy = global_vars.copy()
                parent_block.enrich_global_vars(
                    global_vars=global_vars_copy,
                    dynamic_block_index=dynamic_block_index,
                )
            global_vars = merge_dict(parent_block.global_vars, global_vars)
            global_vars['parent_block_uuid'] = parent_block.uuid

            if parent_block.pipeline and PipelineType.INTEGRATION == parent_block.pipeline.type:
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
        **kwargs,
    ) -> bool:
        with self._redirect_streams(
            logger=logger,
            logging_tags=logging_tags,
        ):
            global_vars = self._create_global_vars(
                global_vars,
                parent_block,
                dynamic_block_index=dynamic_block_index,
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
    def create(cls, orig_block_name, repo_path: str) -> 'CallbackBlock':
        return Block.create(
            f'{clean_name_orig(orig_block_name)}_callback',
            BlockType.CALLBACK,
            repo_path,
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
        metadata: Dict = None,
        upstream_block_uuids_override: List[str] = None,
        **kwargs,
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
                dynamic_block_index=dynamic_block_index,
                **kwargs,
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
                metadata=metadata,
                upstream_block_uuids=[parent_block.uuid] if parent_block else None,
                upstream_block_uuids_override=upstream_block_uuids_override,
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
                if kwargs_var:
                    if isinstance(global_vars_copy, dict) and isinstance(kwargs_var, dict):
                        global_vars_copy.update(kwargs_var)

            callback_kwargs = merge_dict(
                callback_kwargs,
                global_vars_copy,
            )

            DX_PRINTER.critical(
                block=self,
                callback=callback,
                dynamic_block_index=dynamic_block_index,
                dynamic_block_indexes=dynamic_block_indexes,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                execution_partition=execution_partition,
                input_vars=input_vars,
                metadata=metadata,
                upstream_block_uuids=upstream_block_uuids,
                upstream_block_uuids_override=upstream_block_uuids_override,
                __uuid='execute_callback',
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
                    if not input_vars or any([
                        p.kind not in [p.KEYWORD_ONLY, p.VAR_KEYWORD]
                        for p in sig.parameters.values()
                    ]):
                        inner_function(
                            *input_vars,
                            **callback_kwargs,
                        )
                    # This else block will make the above code backwards compatible in case
                    # a user has already written callback functions with only keyword arguments.
                    else:
                        inner_function(
                            **merge_dict(
                                callback_kwargs,
                                dict(
                                    __input=outputs_from_input_vars,
                                ),
                            ),
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
