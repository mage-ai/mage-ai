import json
import traceback
from typing import Callable, Dict, List, Union

import requests

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.dbt.utils import run_dbt_tests
from mage_ai.data_preparation.models.constants import BlockType, PipelineType
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import clean_name


class BlockExecutor:
    def __init__(
        self,
        pipeline,
        block_uuid,
        execution_partition=None
    ):
        self.pipeline = pipeline
        self.block_uuid = block_uuid
        self.block = self.pipeline.get_block(self.block_uuid, check_template=True)
        self.execution_partition = execution_partition
        self.logger_manager = LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline.uuid,
            block_uuid=clean_name(self.block_uuid),
            partition=self.execution_partition,
            repo_config=self.pipeline.repo_config,
        )
        self.logger = DictLogger(self.logger_manager.logger)

    def execute(
        self,
        analyze_outputs: bool = False,
        callback_url: Union[str, None] = None,
        global_vars: Union[Dict, None] = None,
        update_status: bool = False,
        on_complete: Union[Callable[[str], None], None] = None,
        on_failure: Union[Callable[[str, Dict], None], None] = None,
        on_start: Union[Callable[[str], None], None] = None,
        input_from_output: Union[Dict, None] = None,
        verify_output: bool = True,
        retry_count: int = 1,
        runtime_arguments: Union[Dict, None] = None,
        template_runtime_configuration: Union[Dict, None] = None,
        dynamic_block_index: Union[int, None] = None,
        dynamic_block_uuid: Union[str, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        **kwargs,
    ) -> Dict:
        if template_runtime_configuration:
            self.block.template_runtime_configuration = template_runtime_configuration
        try:
            result = dict()

            tags = self._build_tags(**kwargs)

            self.logger.info(f'Start executing block with {self.__class__.__name__}.', **tags)
            if on_start is not None:
                on_start(self.block_uuid)
            pipeline_run = PipelineRun.query.get(kwargs['pipeline_run_id']) \
                if 'pipeline_run_id' in kwargs else None
            try:
                from mage_ai.shared.retry import retry

                @retry(retries=retry_count, delay=5, logger=self.logger, logging_tags=tags)
                def __execute_with_retry():
                    return self._execute(
                        analyze_outputs=analyze_outputs,
                        callback_url=callback_url,
                        global_vars=global_vars,
                        update_status=update_status,
                        input_from_output=input_from_output,
                        logging_tags=tags,
                        verify_output=verify_output,
                        runtime_arguments=runtime_arguments,
                        template_runtime_configuration=template_runtime_configuration,
                        dynamic_block_index=dynamic_block_index,
                        dynamic_block_uuid=dynamic_block_uuid,
                        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                        **kwargs,
                    )

                result = __execute_with_retry()
            except Exception as e:
                self.logger.exception(
                    f'Failed to execute block {self.block.uuid}',
                    **merge_dict(tags, dict(
                        block_type=self.block.type,
                        block_uuid=self.block.uuid,
                        error=e
                    )),
                )
                if on_failure is not None:
                    on_failure(
                        self.block_uuid,
                        error=dict(
                            error=str(e),
                            errors=traceback.format_stack(),
                            message=traceback.format_exc(),
                        ),
                    )
                else:
                    self.__update_block_run_status(
                        'failed',
                        block_run_id=kwargs.get('block_run_id'),
                        callback_url=callback_url,
                        tags=tags,
                    )
                self._execute_callback(
                    'on_failure',
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    global_vars=global_vars,
                    logging_tags=tags,
                    pipeline_run=pipeline_run,
                )
                raise e
            self.logger.info(f'Finish executing block with {self.__class__.__name__}.', **tags)
            if on_complete is not None:
                on_complete(self.block_uuid)
            else:
                self.__update_block_run_status(
                    'completed',
                    block_run_id=kwargs.get('block_run_id'),
                    callback_url=callback_url,
                    tags=tags,
                )
            self._execute_callback(
                'on_success',
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                global_vars=global_vars,
                logging_tags=tags,
                pipeline_run=pipeline_run,
            )

            return result
        finally:
            self.logger_manager.output_logs_to_destination()

    def _execute(
        self,
        analyze_outputs: bool = False,
        callback_url: Union[str, None] = None,
        global_vars: Union[Dict, None] = None,
        update_status: bool = False,
        input_from_output: Union[Dict, None] = None,
        logging_tags: Dict = dict(),
        verify_output: bool = True,
        runtime_arguments: Union[Dict, None] = None,
        dynamic_block_index: Union[int, None] = None,
        dynamic_block_uuid: Union[str, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        **kwargs,
    ) -> Dict:
        result = self.block.execute_sync(
            analyze_outputs=analyze_outputs,
            execution_partition=self.execution_partition,
            global_vars=global_vars,
            logger=self.logger,
            logging_tags=logging_tags,
            run_all_blocks=True,
            update_status=update_status,
            input_from_output=input_from_output,
            verify_output=verify_output,
            runtime_arguments=runtime_arguments,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        )

        if BlockType.DBT == self.block.type:
            run_dbt_tests(
                block=self.block,
                global_vars=global_vars,
                logger=self.logger,
                logging_tags=logging_tags,
            )
        elif PipelineType.INTEGRATION != self.pipeline.type:
            self.block.run_tests(
                execution_partition=self.execution_partition,
                global_vars=global_vars,
                logger=self.logger,
                logging_tags=logging_tags,
                update_tests=False,
                dynamic_block_uuid=dynamic_block_uuid,
            )

        return result

    def _execute_callback(
        self,
        callback: str,
        global_vars,
        logging_tags,
        pipeline_run,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
    ):
        arr = []
        if self.block.callback_block:
            arr.append(self.block.callback_block)

        if self.block.callback_blocks:
            arr += self.block.callback_blocks

        for callback_block in arr:
            try:
                callback_block.execute_callback(
                    callback,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    execution_partition=self.execution_partition,
                    global_vars=global_vars,
                    logger=self.logger,
                    logging_tags=logging_tags,
                    parent_block=self.block,
                    pipeline_run=pipeline_run,
                )
            except Exception as callback_err:
                self.logger.exception(
                    f'Failed to execute {callback} callback block {callback_block.uuid} ' +
                    f'for block {self.block.uuid}.',
                    **merge_dict(logging_tags, dict(
                        error=callback_err,
                    )),
                )

    def _run_commands(
        self,
        block_run_id: int = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> List[str]:
        cmd = f'/app/run_app.sh '\
              f'mage run {self.pipeline.repo_config.repo_path} {self.pipeline.uuid}'
        options = [
            '--block-uuid',
            self.block_uuid,
            '--executor-type',
            'local_python',
        ]
        if self.execution_partition is not None:
            options += ['--execution-partition', self.execution_partition]
        if block_run_id is not None:
            options += ['--block-run-id', f'{block_run_id}']
        if kwargs.get('pipeline_run_id'):
            pipeline_run_id = kwargs.get('pipeline_run_id')
            options += [
                '--pipeline-run-id',
                f'{pipeline_run_id}',
            ]
        if kwargs.get('template_runtime_configuration'):
            template_run_configuration = kwargs.get('template_runtime_configuration')
            options += [
                '--template-runtime-configuration',
                json.dumps(template_run_configuration),
            ]
        return cmd.split(' ') + options

    def __update_block_run_status(
        self,
        status: str,
        block_run_id: int = None,
        callback_url: str = None,
        tags: Dict = dict(),
    ):
        """
        Update the status of block run by edither updating the BlockRun db object or making
        API call

        Args:
            status (str): 'completed' or 'failed'
            block_run_id (int): the id of the block run
            callback_url (str): with format http(s)://[host]:[port]/api/block_runs/[block_run_id]
            tags (dict): tags used in logging
        """
        if not block_run_id and not callback_url:
            return
        try:
            if not block_run_id:
                block_run_id = int(callback_url.split('/')[-1])

            from mage_ai.orchestration.db.models.schedules import BlockRun

            block_run = BlockRun.query.get(block_run_id)
            block_run.update(status=status)
            return
        except Exception:
            pass

        # Fall back to making API calls
        response = requests.put(
            callback_url,
            data=json.dumps({
                'block_run': {
                    'status': status,
                },
            }),
            headers={
                'Content-Type': 'application/json',
            },
        )
        self.logger.info(
            f'Callback response: {response.text}',
            **tags,
        )

    def _build_tags(self, **kwargs):
        default_tags = dict(
            block_type=self.block.type,
            block_uuid=self.block_uuid,
            pipeline_uuid=self.pipeline.uuid,
        )
        if kwargs.get('block_run_id'):
            default_tags['block_run_id'] = kwargs.get('block_run_id')
        if kwargs.get('pipeline_run_id'):
            default_tags['pipeline_run_id'] = kwargs.get('pipeline_run_id')
        return merge_dict(kwargs.get('tags', {}), default_tags)
