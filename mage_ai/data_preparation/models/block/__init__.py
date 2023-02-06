from contextlib import redirect_stdout
from datetime import datetime
from inspect import Parameter, signature
from logging import Logger
from mage_ai.data_cleaner.shared.utils import (
    is_geo_dataframe,
)
from mage_ai.data_preparation.models.block.utils import (
    clean_name,
    fetch_input_variables,
    input_variables,
    is_output_variable,
    is_valid_print_variable,
    output_variables,
)
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockStatus,
    BlockType,
    ExecutorType,
    PipelineType,
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    CUSTOM_EXECUTION_BLOCK_TYPES,
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_ANALYSIS_MAX_ROWS,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
    NON_PIPELINE_EXECUTABLE_BLOCK_TYPES,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.data_preparation.templates.template import load_template
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.constants import ENV_DEV
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.logger import BlockFunctionExec
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.strings import format_enum
from mage_ai.shared.utils import clean_name as clean_name_orig
from queue import Queue
from typing import Any, Callable, Dict, List, Set
import asyncio
import functools
import json
import os
import pandas as pd
import simplejson
import sys
import time
import traceback

PYTHON_COMMAND = 'python3'


async def run_blocks(
    root_blocks: List['Block'],
    analyze_outputs: bool = False,
    build_block_output_stdout: Callable[..., object] = None,
    global_vars=None,
    parallel: bool = True,
    run_sensors: bool = True,
    run_tests: bool = True,
    selected_blocks: Set[str] = None,
    update_status: bool = True,
) -> None:
    tries_by_block_uuid = {}
    tasks = dict()
    blocks = Queue()

    def create_block_task(block: 'Block'):
        async def execute_and_run_tests():
            with BlockFunctionExec(
                block.uuid,
                f'Executing {block.type} block...',
                build_block_output_stdout=build_block_output_stdout,
            ):
                await block.execute(
                    analyze_outputs=analyze_outputs,
                    build_block_output_stdout=build_block_output_stdout,
                    global_vars=global_vars,
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
    global_vars: Dict = None,
    run_sensors: bool = True,
    run_tests: bool = True,
    selected_blocks: Set[str] = None,
) -> None:
    tries_by_block_uuid = {}
    tasks = dict()
    blocks = Queue()

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
            block.execute_sync(
                analyze_outputs=analyze_outputs,
                build_block_output_stdout=build_block_output_stdout,
                global_vars=global_vars,
                run_all_blocks=True,
                test_execution=not run_sensors,
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


class Block:
    def __init__(
        self,
        name: str,
        uuid: str,
        block_type: BlockType,
        content: str = None,
        executor_config: Dict = None,
        executor_type: ExecutorType = ExecutorType.LOCAL_PYTHON,
        status: BlockStatus = BlockStatus.NOT_EXECUTED,
        pipeline=None,
        language: BlockLanguage = BlockLanguage.PYTHON,
        configuration: Dict = dict(),
    ):
        self.name = name or uuid
        self._uuid = uuid
        self.type = block_type
        self._content = content
        self.executor_config = executor_config
        self.executor_type = executor_type
        self.status = status
        self.pipeline = pipeline
        self.language = language or BlockLanguage.PYTHON
        self.configuration = configuration

        self._outputs = None
        self._outputs_loaded = False
        self.upstream_blocks = []
        self.downstream_blocks = []
        self.test_functions = []
        self.global_vars = {}
        self.template_runtime_configuration = {}

        self.dynamic_block_index = None
        self.dynamic_block_uuid = None
        self.dynamic_upstream_block_uuids = None

    @property
    def uuid(self):
        return self.dynamic_block_uuid or self._uuid

    @uuid.setter
    def uuid(self, x):
        self.dynamic_block_uuid = None
        self._uuid = x

    @property
    def content(self):
        if self._content is None:
            self._content = self.file.content()
        return self._content

    async def content_async(self):
        if self._content is None:
            self._content = await self.file.content_async()
        return self._content

    @property
    def executable(self):
        return (
            self.type not in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES
            and (self.pipeline is None or self.pipeline.type != PipelineType.STREAMING)
        )

    @property
    def outputs(self):
        if not self._outputs_loaded:
            if self._outputs is None or len(self._outputs) == 0:
                self._outputs = self.get_outputs()
        return self._outputs

    async def outputs_async(self):
        if not self._outputs_loaded:
            if self._outputs is None or len(self._outputs) == 0:
                self._outputs = await self.get_outputs_async()
        return self._outputs

    @property
    def upstream_block_uuids(self):
        return [b.uuid for b in self.upstream_blocks]

    @property
    def downstream_block_uuids(self):
        return [b.uuid for b in self.downstream_blocks]

    @property
    def file_path(self):
        repo_path = self.pipeline.repo_path if self.pipeline is not None else get_repo_path()

        file_extension = BLOCK_LANGUAGE_TO_FILE_EXTENSION[self.language]

        return os.path.join(
            repo_path or os.getcwd(),
            f'{self.type}s/{self.uuid}.{file_extension}',
        )

    @property
    def file(self):
        return File.from_path(self.file_path)

    @property
    def table_name(self) -> str:
        if self.configuration and 'data_provider_table' in self.configuration:
            return self.configuration['data_provider_table']

        table_name = f'{self.pipeline.uuid}_{clean_name_orig(self.uuid)}_'\
                     f'{self.pipeline.version_name}'

        env = (self.global_vars or dict()).get('env')
        if env == ENV_DEV:
            table_name = f'dev_{table_name}'

        return table_name

    @property
    def full_table_name(self) -> str:
        from mage_ai.data_preparation.models.block.sql.utils.shared import (
            extract_and_replace_text_between_strings,
        )

        if not self.content:
            return None

        create_statement_partial, _ = extract_and_replace_text_between_strings(
            self.content,
            'create',
            r'\(',
        )

        if not create_statement_partial:
            return None

        parts = create_statement_partial[:len(create_statement_partial) - 1].strip().split(' ')
        return parts[-1]

    @classmethod
    def after_create(self, block: 'Block', **kwargs):
        from mage_ai.data_preparation.models.block.dbt.utils import add_blocks_upstream_from_refs
        widget = kwargs.get('widget')
        pipeline = kwargs.get('pipeline')
        if pipeline is not None:
            priority = kwargs.get('priority')
            upstream_block_uuids = kwargs.get('upstream_block_uuids', [])

            if BlockType.DBT == block.type and BlockLanguage.SQL == block.language:
                arr = add_blocks_upstream_from_refs(block)
                upstream_block_uuids += [b.uuid for b in arr]
                priority_final = priority if len(upstream_block_uuids) == 0 else None
            else:
                priority_final = priority

            pipeline.add_block(
                block,
                upstream_block_uuids,
                priority=priority_final,
                widget=widget,
            )

    @classmethod
    def block_class_from_type(self, block_type: str, language=None, pipeline=None) -> 'Block':
        from mage_ai.data_preparation.models.block.constants import BLOCK_TYPE_TO_CLASS
        from mage_ai.data_preparation.models.block.dbt import DBTBlock
        from mage_ai.data_preparation.models.block.integration import (
            SourceBlock, DestinationBlock, TransformerBlock
        )
        from mage_ai.data_preparation.models.block.r import RBlock
        from mage_ai.data_preparation.models.block.sql import SQLBlock
        from mage_ai.data_preparation.models.widget import Widget

        if BlockType.CHART == block_type:
            return Widget
        elif BlockType.DBT == block_type:
            return DBTBlock
        elif pipeline and PipelineType.INTEGRATION == pipeline.type:
            if BlockType.DATA_LOADER == block_type:
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
        name,
        block_type,
        repo_path,
        configuration=None,
        language=None,
        pipeline=None,
        priority=None,
        upstream_block_uuids=None,
        config=None,
        widget=False,
    ):
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

        if BlockType.DBT != block_type or BlockLanguage.YAML == language:
            block_dir_path = os.path.join(repo_path, f'{block_type}s')
            if not os.path.exists(block_dir_path):
                os.mkdir(block_dir_path)
                with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
                    pass

            file_extension = BLOCK_LANGUAGE_TO_FILE_EXTENSION[language]
            file_path = os.path.join(block_dir_path, f'{uuid}.{file_extension}')
            if os.path.exists(file_path):
                if pipeline is not None and pipeline.has_block(uuid):
                    raise Exception(f'Block {uuid} already exists. Please use a different name.')
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
            configuration=configuration,
            language=language,
            pipeline=pipeline,
        )

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
        )
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
    ):
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

    def all_upstream_blocks_completed(self, completed_block_uuids: Set[str]):
        return all(b.uuid in completed_block_uuids for b in self.upstream_blocks)

    def delete(self, widget=False, commit=True):
        """
        1. If pipeline is not None, delete the block from the pipeline but not delete the block
        file.
        2. If pipeline is None, check whether block is used in any pipelines. If block is being
        used, throw error. Otherwise, delete the block files.
        """
        from mage_ai.data_preparation.models.pipeline import Pipeline

        if self.pipeline is not None:
            self.pipeline.delete_block(self, widget=widget, commit=commit)
            # For block_type SCRATCHPAD, also delete the file if possible
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
        for p in pipelines:
            if not p.block_deletable(self):
                raise Exception(
                    f'Block {self.uuid} has downstream dependencies in pipeline {p.uuid}. '
                    'Please remove the dependencies before deleting the block.'
                )
        for p in pipelines:
            p.delete_block(p.get_block(self.uuid, widget=widget), widget=widget, commit=commit)
        os.remove(self.file_path)

    def execute_sync(
        self,
        analyze_outputs: bool = False,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = dict(),
        run_all_blocks: bool = False,
        test_execution: bool = False,
        update_status: bool = True,
        store_variables: bool = True,
        verify_output: bool = True,
        input_from_output: Dict = None,
        runtime_arguments: Dict = None,
        dynamic_block_index: int = None,
        dynamic_block_uuid: str = None,
        dynamic_upstream_block_uuids: List[str] = None,
    ) -> Dict:
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
            output = self.execute_block(
                build_block_output_stdout=build_block_output_stdout,
                custom_code=custom_code,
                execution_partition=execution_partition,
                global_vars=global_vars,
                logger=logger,
                logging_tags=logging_tags,
                test_execution=test_execution,
                input_from_output=input_from_output,
                runtime_arguments=runtime_arguments,
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            )
            block_output = output['output'] or []
            variable_mapping = dict()

            if BlockType.CHART == self.type:
                variable_mapping = block_output
                output = dict(
                    output=simplejson.dumps(
                        block_output,
                        default=encode_complex,
                        ignore_nan=True,
                    )
                )
            else:
                output_count = len(block_output)
                variable_keys = [f'output_{idx}' for idx in range(output_count)]
                variable_mapping = dict(zip(variable_keys, block_output))

            if store_variables and self.pipeline.type != PipelineType.INTEGRATION:
                try:
                    self.store_variables(
                        variable_mapping,
                        execution_partition=execution_partition,
                        override_outputs=True,
                        spark=(global_vars or dict()).get('spark'),
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

            if analyze_outputs and BlockType.CHART != self.type:
                self.analyze_outputs(variable_mapping)
        except Exception as err:
            if update_status:
                self.status = BlockStatus.FAILED
            if logger is not None:
                logger.exception(
                    f'Failed to execute block {self.uuid}',
                    **merge_dict(logging_tags, dict(
                        block_type=self.type,
                        block_uuid=self.uuid,
                        error=err,
                    ))
                )
            raise err
        finally:
            if update_status:
                self.__update_pipeline_block(widget=BlockType.CHART == self.type)

        return output

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
                    global_vars=global_vars,
                    run_all_blocks=run_all_blocks,
                    test_execution=not run_sensors,
                    update_status=update_status,
                )
            )
        else:
            self.execute_sync(
                analyze_outputs=analyze_outputs,
                build_block_output_stdout=build_block_output_stdout,
                custom_code=custom_code,
                global_vars=global_vars,
                run_all_blocks=run_all_blocks,
                test_execution=not run_sensors,
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
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        input_args: List = None,
        logger: Logger = None,
        logging_tags: Dict = dict(),
        global_vars: Dict = None,
        test_execution: bool = False,
        input_from_output: Dict = None,
        runtime_arguments: Dict = None,
        dynamic_block_index: int = None,
        dynamic_upstream_block_uuids: List[str] = None,
    ) -> Dict:
        # Add pipeline uuid and block uuid to global_vars
        global_vars = merge_dict(
            global_vars or dict(),
            dict(
                pipeline_uuid=self.pipeline.uuid,
                block_uuid=self.uuid,
            ),
        )

        # Set up logger
        if logger is not None:
            stdout = StreamToLogger(logger, logging_tags=logging_tags)
        elif build_block_output_stdout:
            stdout = build_block_output_stdout(self.uuid)
        else:
            stdout = sys.stdout

        # Fetch input variables
        input_vars, upstream_block_uuids = self.fetch_input_variables(
            input_args,
            execution_partition,
            global_vars,
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        )

        outputs_from_input_vars = {}
        if input_args is None:
            for idx, input_var in enumerate(input_vars):
                upstream_block_uuid = upstream_block_uuids[idx]
                outputs_from_input_vars[upstream_block_uuid] = input_var
                outputs_from_input_vars[f'df_{idx + 1}'] = input_var
        else:
            outputs_from_input_vars = dict()

        with redirect_stdout(stdout):
            outputs = self._execute_block(
                outputs_from_input_vars,
                custom_code=custom_code,
                execution_partition=execution_partition,
                input_vars=input_vars,
                logger=logger,
                logging_tags=logging_tags,
                global_vars=global_vars,
                test_execution=test_execution,
                input_from_output=input_from_output,
                runtime_arguments=runtime_arguments,
                upstream_block_uuids=upstream_block_uuids
            )

        output_message = dict(output=outputs)

        return output_message

    def _execute_block(
        self,
        outputs_from_input_vars,
        custom_code: str = None,
        execution_partition: str = None,
        input_vars: List = None,
        logger: Logger = None,
        logging_tags: Dict = dict(),
        global_vars: Dict = None,
        test_execution: bool = False,
        input_from_output: Dict = None,
        runtime_arguments: Dict = None,
        upstream_block_uuids: List[str] = None,
    ) -> List:
        decorated_functions = []
        test_functions = []

        results = {
            self.type: self._block_decorator(decorated_functions),
            'test': self._block_decorator(test_functions),
        }
        results.update(outputs_from_input_vars)

        if custom_code is not None:
            if BlockType.CHART != self.type or (not self.group_by_columns or not self.metrics):
                exec(custom_code, results)
        elif self.content is not None:
            exec(self.content, results)
        elif os.path.exists(self.file_path):
            with open(self.file_path) as file:
                exec(file.read(), results)

        outputs = []
        if BlockType.CHART == self.type:
            variables = self.get_variables_from_code_execution(results)
            outputs = self.post_process_variables(
                variables,
                code=custom_code,
                results=results,
                upstream_block_uuids=upstream_block_uuids,
            )
        else:
            block_function = self._validate_execution(decorated_functions, input_vars)
            if block_function is not None:
                outputs = self.execute_block_function(
                    block_function,
                    input_vars,
                    global_vars,
                    test_execution,
                )

            if outputs is None:
                outputs = []
            if type(outputs) is not list:
                outputs = [outputs]

            self.test_functions = test_functions

        return outputs

    def execute_block_function(
        self,
        block_function: Callable,
        input_vars: List,
        global_vars: Dict = None,
        test_execution: bool = False,
    ) -> Dict:
        sig = signature(block_function)
        has_kwargs = any([p.kind == p.VAR_KEYWORD for p in sig.parameters.values()])
        if has_kwargs and global_vars is not None and len(global_vars) != 0:
            output = block_function(*input_vars, **global_vars)
        else:
            output = block_function(*input_vars)
        return output

    def exists(self):
        return os.path.exists(self.file_path)

    def fetch_input_variables(
        self,
        input_args,
        execution_partition: str = None,
        global_vars: Dict = None,
        dynamic_block_index: int = None,
        dynamic_upstream_block_uuids: List[str] = None,
    ):
        return fetch_input_variables(
            self.pipeline,
            self.upstream_block_uuids,
            input_args,
            execution_partition,
            global_vars,
            dynamic_block_index,
            dynamic_upstream_block_uuids,
        )

    def get_analyses(self):
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

    def get_outputs(
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
            )

            if variable_type is not None and variable_object.variable_type != variable_type:
                continue

            data = variable_object.read_data(
                sample=True,
                sample_count=sample_count,
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
            outputs.append(data)
        return outputs + data_products

    async def get_outputs_async(
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
            )

            if variable_type is not None and variable_object.variable_type != variable_type:
                continue

            data = await variable_object.read_data_async(
                sample=True,
                sample_count=sample_count,
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
            outputs.append(data)
        return outputs + data_products

    def __save_outputs_prepare(self, outputs):
        variable_mapping = dict()
        for o in outputs:
            if o is None:
                continue
            if all(k in o for k in ['variable_uuid', 'text_data']) and \
                    not is_output_variable(o['variable_uuid']):
                variable_mapping[o['variable_uuid']] = o['text_data']

        self._outputs = outputs
        self._outputs_loaded = True
        return variable_mapping

    def save_outputs(self, outputs, override=False):
        variable_mapping = self.__save_outputs_prepare(outputs)
        self.store_variables(variable_mapping, override=override)

    async def save_outputs_async(self, outputs, override=False):
        variable_mapping = self.__save_outputs_prepare(outputs)
        await self.store_variables_async(variable_mapping, override=override)

    def to_dict_base(self):
        language = self.language
        if language and type(self.language) is not str:
            language = self.language.value

        data = dict(
            all_upstream_blocks_executed=all(
                block.status == BlockStatus.EXECUTED for block in self.get_all_upstream_blocks()
            ),
            configuration=self.configuration or {},
            downstream_blocks=self.downstream_block_uuids,
            executor_config=self.executor_config,
            executor_type=format_enum(self.executor_type),
            name=self.name,
            language=language,
            status=format_enum(self.status),
            type=format_enum(self.type),
            upstream_blocks=self.upstream_block_uuids,
            uuid=self.uuid,
        )
        return data

    def to_dict(
        self,
        include_content=False,
        include_outputs=False,
        sample_count=None,
        check_if_file_exists: bool = False,
    ):
        data = self.to_dict_base()
        if include_content:
            data['content'] = self.content
        if include_outputs:
            data['outputs'] = self.outputs
            if check_if_file_exists:
                file_path = self.file.file_path
                if not os.path.isfile(file_path):
                    data['error'] = dict(
                        error='No such file or directory',
                        message='You may have moved it or changed it’s filename. '
                        'Delete the current block to remove it from the pipeline or write code ' +
                        f'and save the pipeline to create a new file at {file_path}.',
                    )
        return data

    async def to_dict_async(
        self,
        include_content=False,
        include_outputs=False,
        sample_count=None,
        check_if_file_exists: bool = False,
    ):
        data = self.to_dict_base()

        if include_content:
            data['content'] = await self.content_async()
        if include_outputs:
            data['outputs'] = await self.outputs_async()
            if check_if_file_exists:
                file_path = self.file.file_path
                if not os.path.isfile(file_path):
                    data['error'] = dict(
                        error='No such file or directory',
                        message='You may have moved it or changed it’s filename. '
                        'Delete the current block to remove it from the pipeline or write code ' +
                        f'and save the pipeline to create a new file at {file_path}.',
                    )
        return data

    def update(self, data):
        if 'name' in data and data['name'] != self.name:
            self.__update_name(data['name'])
        if (
            'type' in data
            and self.type == BlockType.SCRATCHPAD
            and data['type'] != BlockType.SCRATCHPAD
        ):
            self.__update_type(data['type'])
        if 'upstream_blocks' in data and set(data['upstream_blocks']) != set(
            self.upstream_block_uuids
        ):
            self.__update_upstream_blocks(data['upstream_blocks'])
        if 'executor_type' in data and data['executor_type'] != self.executor_type:
            self.executor_type = data['executor_type']
            self.__update_pipeline_block()
        return self

    def update_upstream_blocks(self, upstream_blocks: List[Any]) -> None:
        self.upstream_blocks = upstream_blocks

    def update_content(self, content, widget=False):
        if not self.file.exists():
            raise Exception(f'File for block {self.uuid} does not exist at {self.file.file_path}.')

        if content != self.content:
            self.status = BlockStatus.UPDATED
            self._content = content
            self.file.update_content(content)
            self.__update_pipeline_block(widget=widget)
        return self

    async def update_content_async(self, content, widget=False):
        block_content = await self.content_async()
        if content != block_content:
            self.status = BlockStatus.UPDATED
            self._content = content
            await self.file.update_content_async(content)
            self.__update_pipeline_block(widget=widget)
        return self

    def update_status(self, status: BlockStatus):
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

    def run_upstream_blocks(self) -> None:
        def process_upstream_block(
            block: 'Block',
            root_blocks: List['Block'],
        ) -> List[str]:
            if len(block.upstream_blocks) == 0:
                root_blocks.append(block)
            return block.uuid

        upstream_blocks = self.get_all_upstream_blocks()
        root_blocks = []
        upstream_block_uuids = list(
            map(lambda x: process_upstream_block(x, root_blocks), upstream_blocks)
        )

        run_blocks_sync(root_blocks, selected_blocks=upstream_block_uuids)

    def run_tests(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        global_vars: Dict = {},
        logger: Logger = None,
        logging_tags: Dict = dict(),
        update_tests: bool = True,
        dynamic_block_uuid: str = None,
        from_notebook: bool = False,
    ) -> None:
        self.dynamic_block_uuid = dynamic_block_uuid

        if self.pipeline \
            and PipelineType.INTEGRATION == self.pipeline.type \
                and self.type in [BlockType.DATA_LOADER, BlockType.DATA_EXPORTER]:

            return

        if logger is not None:
            stdout = StreamToLogger(logger, logging_tags=logging_tags)
        elif build_block_output_stdout:
            stdout = build_block_output_stdout(self.uuid)
        else:
            stdout = sys.stdout

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

        variable_manager = self.pipeline.variable_manager
        outputs = [
            variable_manager.get_variable(
                self.pipeline.uuid,
                self.uuid,
                variable,
                partition=execution_partition,
            )
            for variable in self.output_variables(execution_partition=execution_partition)
        ]

        with redirect_stdout(stdout):
            tests_passed = 0
            for func in test_functions:
                try:
                    sig = signature(func)
                    has_kwargs = any([p.kind == p.VAR_KEYWORD for p in sig.parameters.values()])
                    if has_kwargs and global_vars is not None and len(global_vars) != 0:
                        func(*outputs, **global_vars)
                    else:
                        func(*outputs)
                    tests_passed += 1
                except AssertionError as err:
                    error_message = f'FAIL: {func.__name__} (block: {self.uuid})'
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

    def analyze_outputs(self, variable_mapping):
        from mage_ai.data_cleaner.data_cleaner import clean as clean_data

        if self.pipeline is None:
            return
        for uuid, data in variable_mapping.items():
            if type(data) is pd.DataFrame:
                if data.shape[1] > DATAFRAME_ANALYSIS_MAX_COLUMNS:
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

    def set_global_vars(self, global_vars):
        self.global_vars = global_vars
        for upstream_block in self.upstream_blocks:
            upstream_block.global_vars = global_vars

    def __consolidate_variables(self, variable_mapping: Dict):
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

        def save_variable_and_reset_state():
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

    def __store_variables_prepare(
        self,
        variable_mapping: Dict,
        execution_partition: str = None,
        override: bool = False,
        override_outputs: bool = False,
        dynamic_block_uuid: str = None,
    ):
        self.dynamic_block_uuid = dynamic_block_uuid

        if self.pipeline is None:
            return
        all_variables = self.pipeline.variable_manager.get_variables_by_block(
            self.pipeline.uuid,
            self.uuid,
            partition=execution_partition,
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
    ):
        variables_data = self.__store_variables_prepare(
            variable_mapping,
            execution_partition,
            override,
            override_outputs,
            dynamic_block_uuid,
        )
        for uuid, data in variables_data['variable_mapping'].items():
            if spark is not None and type(data) is pd.DataFrame:
                data = spark.createDataFrame(data)
            self.pipeline.variable_manager.add_variable(
                self.pipeline.uuid,
                self.uuid,
                uuid,
                data,
                partition=execution_partition,
            )

        for uuid in variables_data['removed_variables']:
            self.pipeline.variable_manager.delete_variable(
                self.pipeline.uuid,
                self.uuid,
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
    ):
        variables_data = self.__store_variables_prepare(
            variable_mapping,
            execution_partition,
            override,
            override_outputs,
            dynamic_block_uuid,
        )
        for uuid, data in variables_data['variable_mapping'].items():
            if spark is not None and type(data) is pd.DataFrame:
                data = spark.createDataFrame(data)
            await self.pipeline.variable_manager.add_variable_async(
                self.pipeline.uuid,
                self.uuid,
                uuid,
                data,
                partition=execution_partition,
            )

        for uuid in variables_data['removed_variables']:
            self.pipeline.variable_manager.delete_variable(
                self.pipeline.uuid,
                self.uuid,
                uuid,
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

    def output_variables(self, execution_partition: str = None) -> List[str]:
        return output_variables(
            self.pipeline,
            self.uuid,
            execution_partition,
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

    def variable_object(
        self,
        variable_uuid: str,
        execution_partition: str = None,
    ):
        if self.pipeline is None:
            return []
        return self.pipeline.variable_manager.get_variable_object(
            self.pipeline.uuid,
            self.uuid,
            variable_uuid,
            partition=execution_partition,
        )

    def _block_decorator(self, decorated_functions):
        def custom_code(function):
            decorated_functions.append(function)
            return function

        return custom_code

    # TODO: Update all pipelines that use this block
    def __update_name(self, name):
        """
        1. Rename block file
        2. Update the folder of variable
        3. Update upstream and downstream relationships
        """
        old_uuid = self.uuid
        old_file_path = self.file_path
        new_uuid = clean_name(name)
        self.name = name
        self.uuid = new_uuid
        new_file_path = self.file_path
        if self.pipeline is not None:
            if self.pipeline.has_block(new_uuid):
                raise Exception(
                    f'Block {new_uuid} already exists in pipeline. Please use a different name.'
                )
        if os.path.exists(new_file_path):
            raise Exception(f'Block {new_uuid} already exists. Please use a different name.')

        file_path_parts = new_file_path.split('/')
        parent_dir = '/'.join(file_path_parts[:-1])
        os.makedirs(parent_dir, exist_ok=True)

        os.rename(old_file_path, new_file_path)
        if self.pipeline is not None:
            self.pipeline.update_block_uuid(self, old_uuid)

    def __update_pipeline_block(self, widget=False):
        if self.pipeline is None:
            return
        self.pipeline.update_block(self, widget=widget)

    def __update_type(self, block_type):
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
                f'Block {self.type}/{self.uuid} already exists.'
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

    def __update_upstream_blocks(self, upstream_blocks):
        if self.pipeline is None:
            return
        self.pipeline.update_block(
            self,
            upstream_block_uuids=upstream_blocks,
            widget=BlockType.CHART == self.type,
        )


class SensorBlock(Block):
    def execute_block_function(
        self,
        block_function: Callable,
        input_vars: List,
        global_vars: Dict = None,
        test_execution: bool = False,
    ) -> List:
        if test_execution:
            return super().execute_block_function(
                block_function,
                input_vars,
                global_vars=global_vars,
                test_execution=test_execution,
            )
        else:
            sig = signature(block_function)
            has_kwargs = any([p.kind == p.VAR_KEYWORD for p in sig.parameters.values()])
            use_global_vars = has_kwargs and global_vars is not None and len(global_vars) != 0
            while True:
                condition = block_function(**global_vars) if use_global_vars else block_function()
                if condition:
                    break
                print('Sensor sleeping for 1 minute...')
                time.sleep(60)
            return []
