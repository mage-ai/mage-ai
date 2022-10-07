from contextlib import redirect_stdout
from datetime import datetime
from inspect import Parameter, signature
from logging import Logger
from mage_ai.data_cleaner.shared.utils import (
    is_dataframe,
    is_geo_dataframe,
)
from mage_ai.data_preparation.logger_manager import StreamToLogger
from mage_ai.data_preparation.models.block.sql import execute_sql_code
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockStatus,
    BlockType,
    ExecutorType,
    CUSTOM_EXECUTION_BLOCK_TYPES,
    DATAFRAME_ANALYSIS_MAX_COLUMNS,
    DATAFRAME_ANALYSIS_MAX_ROWS,
    DATAFRAME_SAMPLE_COUNT_PREVIEW,
    NON_PIPELINE_EXECUTABLE_BLOCK_TYPES,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.templates.template import load_template
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.constants import ENV_DEV
from mage_ai.shared.logger import BlockFunctionExec
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.utils import clean_name
from queue import Queue
from typing import Callable, Dict, List, Set
import asyncio
import functools
import json
import os
import pandas as pd
import simplejson
import sys
import time
import traceback


async def run_blocks(
    root_blocks: List['Block'],
    analyze_outputs: bool = True,
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
    analyze_outputs: bool = True,
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
        self.uuid = uuid
        self.type = block_type
        self._content = content
        self.executor_config = executor_config
        self.executor_type = executor_type
        self.status = status
        self.pipeline = pipeline
        self.language = language
        self.configuration = configuration

        self._outputs = None
        self._outputs_loaded = False
        self.upstream_blocks = []
        self.downstream_blocks = []
        self.test_functions = []
        self.global_vars = {}

    @property
    def content(self):
        if self._content is None:
            self._content = self.file.content()
        return self._content

    @property
    def executable(self):
        return self.type not in NON_PIPELINE_EXECUTABLE_BLOCK_TYPES

    @property
    def input_variables(self):
        return {b.uuid: b.output_variables.keys() for b in self.upstream_blocks}

    @property
    def output_variables(self):
        """
        Return output variables in dictionary.
        The key is the variable name, and the value is variable data type.
        """
        return dict()

    @property
    def outputs(self):
        if not self._outputs_loaded:
            if self._outputs is None or len(self._outputs) == 0:
                self._outputs = self.get_outputs()
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
        file_extension = 'sql' if BlockLanguage.SQL == self.language else 'py'

        return os.path.join(
            repo_path or os.getcwd(),
            f'{self.type}s/{self.uuid}.{file_extension}',
        )

    @property
    def file(self):
        return File.from_path(self.file_path)

    @property
    def table_name(self):
        table_name = f'{self.pipeline.uuid}_{self.uuid}_{self.pipeline.version_name}'

        env = (self.global_vars or dict()).get('env')
        if env == ENV_DEV:
            table_name = f'dev_{table_name}'

        return table_name

    @classmethod
    def block_class_from_type(self, block_type: str) -> str:
        return BLOCK_TYPE_TO_CLASS.get(block_type)

    @classmethod
    def after_create(self, block, **kwargs):
        widget = kwargs.get('widget')
        pipeline = kwargs.get('pipeline')
        if pipeline is not None:
            priority = kwargs.get('priority')
            upstream_block_uuids = kwargs.get('upstream_block_uuids')
            pipeline.add_block(block, upstream_block_uuids, priority=priority, widget=widget)

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
        block_dir_path = os.path.join(repo_path, f'{block_type}s')
        if not os.path.exists(block_dir_path):
            os.mkdir(block_dir_path)
            with open(os.path.join(block_dir_path, '__init__.py'), 'w'):
                pass

        file_extension = 'sql' if BlockLanguage.SQL == language else 'py'
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

        block = self.block_class_from_type(block_type)(
            name,
            uuid,
            block_type,
            configuration=configuration,
            language=language,
            pipeline=pipeline,
        )
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
        block_class = self.block_class_from_type(block_type) or Block
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
        analyze_outputs: bool = True,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        global_vars: Dict = None,
        logger: Logger = None,
        run_all_blocks: bool = False,
        test_execution: bool = False,
        update_status: bool = True,
    ):
        try:
            if not run_all_blocks:
                not_executed_upstream_blocks = list(
                    filter(lambda b: b.status == BlockStatus.NOT_EXECUTED, self.upstream_blocks)
                )
                if len(not_executed_upstream_blocks) > 0:
                    raise Exception(
                        f"Block {self.uuid}'s upstream blocks have not been executed yet. "
                        f'Please run upstream blocks {list(map(lambda b: b.uuid, not_executed_upstream_blocks))} '
                        'before running the current block.'
                    )
            output = self.execute_block(
                build_block_output_stdout=build_block_output_stdout,
                custom_code=custom_code,
                execution_partition=execution_partition,
                global_vars=global_vars,
                logger=logger,
                test_execution=test_execution,
            )
            block_output = output['output']
            if BlockType.CHART == self.type:
                variable_mapping = block_output
                output = dict(
                    output=simplejson.dumps(
                        block_output,
                        default=encode_complex,
                        ignore_nan=True,
                    )
                )
            elif BlockType.SENSOR == self.type:
                variable_mapping = dict()
            else:
                self.__verify_outputs(block_output)
                variable_keys = list(self.output_variables.keys())
                extra_output_count = len(block_output) - len(variable_keys)
                variable_keys += [f'output_{idx}' for idx in range(extra_output_count)]
                variable_mapping = dict(zip(variable_keys, block_output))

            self.store_variables(
                variable_mapping,
                execution_partition=execution_partition,
                override_outputs=True,
                spark=(global_vars or dict()).get('spark'),
            )
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
                    block_type=self.type,
                    block_uuid=self.uuid,
                    error=err,
                )
            raise err
        finally:
            if update_status:
                self.__update_pipeline_block(widget=BlockType.CHART == self.type)

        return output

    async def execute(
        self,
        analyze_outputs: bool = True,
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

    def __validate_execution(self, decorated_functions, input_vars):
        if self.type not in CUSTOM_EXECUTION_BLOCK_TYPES:
            return None

        if BlockLanguage.SQL == self.language:
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
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} arguments, '
                        f'but only received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number of arguments.'
                    )
                else:
                    raise Exception(
                        f'Block {self.uuid} is missing input arguments. '
                        f'It expected to have {"at least " if has_var_args else ""}{num_args} arguments, '
                        f'but only received {num_inputs}. '
                        f'Double check the @{self.type} method declaration has the correct number of arguments '
                        f'and that the upstream blocks have been executed.'
                    )
            elif num_args < num_inputs and not has_var_args:
                if num_upstream > num_args:
                    raise Exception(
                        f'Block {self.uuid} may have too many upstream dependencies. '
                        f'It expected to have {num_args} arguments, but received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number of arguments.'
                    )
                else:
                    raise Exception(
                        f'Block {self.uuid} has too many input arguments. '
                        f'It expected to have {num_args} arguments, but received {num_inputs}. '
                        f'Confirm that the @{self.type} method declaration has the correct number of arguments.'
                    )

            return block_function

    def execute_block(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        custom_code: str = None,
        execution_partition: str = None,
        logger: Logger = None,
        global_vars: Dict = None,
        test_execution: bool = False,
    ) -> Dict:
        upstream_block_uuids = []
        input_vars = []
        if self.pipeline is not None:
            for upstream_block_uuid, variables in self.input_variables.items():
                upstream_block_uuids.append(upstream_block_uuid)
                input_vars += [
                    self.pipeline.variable_manager.get_variable(
                        self.pipeline.uuid,
                        upstream_block_uuid,
                        var,
                        partition=execution_partition,
                        variable_type=VariableType.DATAFRAME,
                        spark=(global_vars or dict()).get('spark'),
                    )
                    for var in variables
                ]
        outputs = []
        decorated_functions = []
        test_functions = []
        if logger is not None:
            stdout = StreamToLogger(logger)
        elif build_block_output_stdout:
            stdout = build_block_output_stdout(self.uuid)
        else:
            stdout = sys.stdout
        results = {}
        outputs_from_input_vars = {}

        for idx, input_var in enumerate(input_vars):
            upstream_block_uuid = upstream_block_uuids[idx]
            outputs_from_input_vars[upstream_block_uuid] = input_var
            outputs_from_input_vars[f'df_{idx + 1}'] = input_var

        with redirect_stdout(stdout):
            results = {
                self.type: self.__block_decorator(decorated_functions),
                'test': self.__block_decorator(test_functions),
            }
            results.update(outputs_from_input_vars)

            outputs = []

            if BlockLanguage.SQL == self.language and BlockType.CHART != self.type:
                outputs = execute_sql_code(
                    self,
                    custom_code or self.content,
                    execution_partition=execution_partition,
                    global_vars=global_vars,
                )
            elif custom_code is not None:
                if BlockType.CHART != self.type or (not self.group_by_columns or not self.metrics):
                    exec(custom_code, results)
            elif self.content is not None:
                exec(self.content, results)
            elif os.path.exists(self.file_path):
                with open(self.file_path) as file:
                    exec(file.read(), results)

            self.test_functions = test_functions

            if BlockType.CHART == self.type:
                variables = self.get_variables_from_code_execution(results)
                outputs = self.post_process_variables(
                    variables,
                    code=custom_code,
                    results=results,
                    upstream_block_uuids=upstream_block_uuids,
                )
            else:
                block_function = self.__validate_execution(decorated_functions, input_vars)
                if block_function is not None:
                    outputs = self.execute_block_function(block_function, input_vars, global_vars, test_execution)

                if outputs is None:
                    outputs = []
                if type(outputs) is not list:
                    outputs = [outputs]

        output_message = dict(output=outputs)

        return output_message

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

    def get_analyses(self):
        if self.status == BlockStatus.NOT_EXECUTED:
            return []
        if len(self.output_variables) == 0:
            return []
        analyses = []
        for v, vtype in self.output_variables.items():
            if vtype is not pd.DataFrame:
                continue
            data = self.pipeline.variable_manager.get_variable(
                self.pipeline.uuid,
                self.uuid,
                v,
                variable_type=VariableType.DATAFRAME_ANALYSIS,
            )
            data['variable_uuid'] = v
            analyses.append(data)
        return analyses

    def get_outputs(
        self,
        execution_partition: str = None,
        include_print_outputs: bool = True,
        sample_count: int = DATAFRAME_SAMPLE_COUNT_PREVIEW,
    ) -> List[Dict]:
        if self.pipeline is None:
            return
        if self.type != BlockType.SCRATCHPAD and BlockType.CHART != self.type:
            if self.status == BlockStatus.NOT_EXECUTED:
                return []

        data_products = []
        outputs = []
        variable_manager = self.pipeline.variable_manager

        all_variables = variable_manager.get_variables_by_block(
            self.pipeline.uuid,
            self.uuid,
            partition=execution_partition,
        )

        if not include_print_outputs:
            all_variables = [v for v in all_variables if v in self.output_variables.keys()
                             or v.startswith('output')]

        for v in all_variables:
            data = variable_manager.get_variable(
                self.pipeline.uuid,
                self.uuid,
                v,
                partition=execution_partition,
                sample=True,
                sample_count=sample_count,
            )
            if type(data) is pd.DataFrame:
                try:
                    analysis = variable_manager.get_variable(
                        self.pipeline.uuid,
                        self.uuid,
                        v,
                        partition=execution_partition,
                        variable_type=VariableType.DATAFRAME_ANALYSIS,
                    )
                except Exception:
                    analysis = None
                if analysis is not None:
                    stats = analysis.get('statistics', {})
                    column_types = analysis.get('metadata', {}).get('column_types', {})
                    row_count = stats.get('original_row_count', stats.get('count'))
                    column_count = len(column_types)
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
                    text_data=f''' Use the following code in a scratchpad to get the output of the block:

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

    def save_outputs(self, outputs, override=False):
        variable_mapping = dict()
        for o in outputs:
            if o is None:
                continue
            if all(k in o for k in ['variable_uuid', 'text_data']) and \
                    o['variable_uuid'] != 'df':
                variable_mapping[o['variable_uuid']] = o['text_data']

        self._outputs = outputs
        self._outputs_loaded = True
        self.store_variables(variable_mapping, override=override)

    def to_dict(self, include_content=False, include_outputs=False, sample_count=None):
        language = self.language
        if language and type(self.language) is not str:
            language = self.language.value

        def __format_enum(v):
            return v.value if type(v) is not str else v

        data = dict(
            all_upstream_blocks_executed=all(
                block.status == BlockStatus.EXECUTED for block in self.get_all_upstream_blocks()
            ),
            configuration=self.configuration or {},
            downstream_blocks=self.downstream_block_uuids,
            executor_config=self.executor_config,
            executor_type=__format_enum(self.executor_type),
            name=self.name,
            language=language,
            status=__format_enum(self.status),
            type=__format_enum(self.type),
            upstream_blocks=self.upstream_block_uuids,
            uuid=self.uuid,
        )
        if include_content:
            data['content'] = self.content
        if include_outputs:
            data['outputs'] = self.outputs
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

    def update_content(self, content, widget=False):
        if content != self.content:
            self.status = BlockStatus.UPDATED
            self._content = content
            self.file.update_content(content)
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
                if block.uuid not in visited:
                    queue.put(block)
                    visited.add(block)
        return visited

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
        logger: Logger = None,
        update_tests: bool = True,
    ) -> None:
        test_functions = []
        if update_tests:
            results = {
                'test': self.__block_decorator(test_functions),
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
            )
            for variable in self.output_variables.keys()
        ]

        if logger is not None:
            stdout = StreamToLogger(logger)
        elif build_block_output_stdout:
            stdout = build_block_output_stdout(self.uuid)
        else:
            stdout = sys.stdout

        with redirect_stdout(stdout):
            tests_passed = 0
            for func in test_functions:
                try:
                    func(*outputs)
                    tests_passed += 1
                except AssertionError:
                    print('==============================================================')
                    print(f'FAIL: {func.__name__} (block: {self.uuid})')
                    print('--------------------------------------------------------------')
                    print(traceback.format_exc())
            print('--------------------------------------------------------------')
            print(f'{tests_passed}/{len(test_functions)} tests passed.')
        if tests_passed != len(test_functions):
            raise Exception(f'Failed to pass tests for block {self.uuid}')

    def analyze_outputs(self, variable_mapping):
        from mage_ai.data_cleaner.data_cleaner import clean as clean_data

        if self.pipeline is None:
            return
        for uuid, data in variable_mapping.items():
            vtype = self.output_variables.get(uuid)
            if vtype is pd.DataFrame:
                if data.shape[1] > DATAFRAME_ANALYSIS_MAX_COLUMNS:
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

    def store_variables(
        self,
        variable_mapping: Dict,
        execution_partition: str = None,
        override: bool = False,
        override_outputs: bool = False,
        spark=None,
    ):
        if self.pipeline is None:
            return
        all_variables = self.pipeline.variable_manager.get_variables_by_block(
            self.pipeline.uuid,
            self.uuid,
            partition=execution_partition,
        )
        removed_variables = []
        if override:
            # Not remove dataframe variables
            removed_variables = [v for v in all_variables
                                 if v not in variable_mapping.keys()
                                 and v != 'df'
                                 and not v.startswith('output')]
        elif override_outputs:
            removed_variables = [v for v in all_variables
                                 if v not in variable_mapping.keys() and v.startswith('output')]
        for uuid, data in variable_mapping.items():
            if spark is not None and type(data) is pd.DataFrame:
                data = spark.createDataFrame(data)
            self.pipeline.variable_manager.add_variable(
                self.pipeline.uuid,
                self.uuid,
                uuid,
                data,
                partition=execution_partition,
            )

        for uuid in removed_variables:
            self.pipeline.variable_manager.delete_variable(
                self.pipeline.uuid,
                self.uuid,
                uuid,
            )

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

    def __verify_outputs(self, outputs):
        if len(outputs) < len(self.output_variables):
            raise Exception(
                f'Validation error for block {self.uuid}: '
                f'the number of output variables does not match the block type: {self.type} ',
            )
        variable_names = list(self.output_variables.keys())
        variable_dtypes = list(self.output_variables.values())
        for idx, output in enumerate(outputs):
            if idx >= len(variable_dtypes):
                break
            actual_dtype = type(output)
            expected_dtype = variable_dtypes[idx]
            if (expected_dtype != pd.DataFrame and actual_dtype is not expected_dtype) or (
                expected_dtype == pd.DataFrame and not is_dataframe(output)
            ):
                raise Exception(
                    f'Validation error for block {self.uuid}: '
                    f'the variable {variable_names[idx]} should be {expected_dtype} type, '
                    f'but {actual_dtype} type is returned',
                )

    def __block_decorator(self, decorated_functions):
        def custom_code(function):
            decorated_functions.append(function)
            return function

        return custom_code


class DataLoaderBlock(Block):
    @property
    def output_variables(self):
        return dict(df=pd.DataFrame)


class DataExporterBlock(Block):
    @property
    def output_variables(self):
        return dict()


class TransformerBlock(Block):
    @property
    def output_variables(self):
        return dict(df=pd.DataFrame)


class SensorBlock(Block):
    @property
    def output_variables(self):
        return dict()

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


BLOCK_TYPE_TO_CLASS = {
    BlockType.DATA_EXPORTER: DataExporterBlock,
    BlockType.DATA_LOADER: DataLoaderBlock,
    BlockType.SCRATCHPAD: Block,
    BlockType.TRANSFORMER: TransformerBlock,
    BlockType.SENSOR: SensorBlock,
}
