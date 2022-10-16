from contextlib import redirect_stdout
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.logger_manager import StreamToLogger
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline, PYTHON
from mage_ai.shared.hash import merge_dict
from mage_integrations.sources.utils import (
    update_catalog_dict,
    update_source_state_from_destination_state,
)
from typing import Callable, Dict
import json
import os
import subprocess
import time
import yaml


class IntegrationPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline: Pipeline, **kwargs):
        super().__init__(pipeline, **kwargs)
        self.integration_pipeline = IntegrationPipeline.get(pipeline.uuid)
        self.parse_and_validate_blocks()

    def execute(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        if build_block_output_stdout:
            stdout = build_block_output_stdout(self.pipeline.uuid)
        else:
            stdout = StreamToLogger(self.logger)
        try:
            return self.__execute_in_python(stdout)
        except Exception as e:
            if not build_block_output_stdout:
                self.logger.exception(
                        f'Failed to execute streaming pipeline {self.pipeline.uuid}',
                        error=e,
                    )
            raise e

    def parse_and_validate_blocks(self):
        if not self.integration_pipeline.data_loader:
            raise Exception('Please provide at least 1 data loader block.')
        if not self.integration_pipeline.data_exporter:
            raise Exception('Please provide at least 1 data exporter block.')

    def __execute_in_python(self, stdout, query: Dict = {}) -> Dict:
        update_source_state_from_destination_state(
            self.integration_pipeline.source_state_file_path,
            self.integration_pipeline.destination_state_file_path,
        )

        proc1 = subprocess.Popen([
            PYTHON,
            self.integration_pipeline.source_file_path,
            '--settings',
            self.integration_pipeline.data_loader.file_path,
            '--state',
            self.integration_pipeline.source_state_file_path,
            '--query',
            json.dumps(query),
        ], preexec_fn=os.setsid, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        proc2 = subprocess.call([
            PYTHON,
            self.integration_pipeline.destination_file_path,
            '--settings',
            self.integration_pipeline.data_exporter.file_path,
            '--state',
            self.integration_pipeline.destination_state_file_path,
        ], stdin=proc1.stdout, stdout=stdout, stderr=stdout)

        return dict(
            source_process_id=os.getpgid(proc1.pid),
        )
