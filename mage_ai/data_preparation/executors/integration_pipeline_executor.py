from mage_ai.data_preparation.executors.mixins.execution import ExecuteWithOutputMixin
from mage_ai.data_preparation.executors.mixins.validation import ValidateBlockMixin
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline, PYTHON
from mage_ai.shared.hash import merge_dict
from mage_integrations.sources.utils import (
    update_catalog_dict,
    update_source_state_from_destination_state,
)
from typing import Dict
import json
import os
import signal
import subprocess
import time
import yaml


class IntegrationPipelineExecutor(PipelineExecutor, ExecuteWithOutputMixin, ValidateBlockMixin):
    def __init__(self, pipeline: Pipeline, **kwargs):
        super().__init__(pipeline, **kwargs)
        self.integration_pipeline = IntegrationPipeline(pipeline)

    def execute_in_python(self, query: Dict = {}):
        catalog = self.integration_pipeline.integration_pipeline.discover()
        catalog = update_catalog_dict(
            catalog,
            catalog['streams'][0]['tap_stream_id'],
            key_properties=['uuid'],
            replication_method='FULL_TABLE',
            bookmark_properties=['event_time', 'uuid'],
            select_all=True,
            select_stream=True,
            unique_conflict_method='UPDATE',
            unique_constraints=['uuid'],
        )
        self.integration_pipeline.data_loader.update_content(yaml.dump(
            merge_dict(
                self.integration_pipeline.source_config,
                dict(catalog=catalog),
            ),
            allow_unicode=True,
        ))

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
        ], preexec_fn=os.setsid, stdout=subprocess.PIPE)

        proc2 = subprocess.Popen([
            PYTHON,
            self.integration_pipeline.destination_file_path,
            '--settings',
            self.integration_pipeline.data_exporter.file_path,
            '--state',
            self.integration_pipeline.destination_state_file_path,
        ], stdin=proc1.stdout)

        # time.sleep(7)

        return os.getpgid(proc1.pid), os.getpgid(proc2.pid)

        # os.killpg(os.getpgid(proc1.pid), signal.SIGTERM)
        # os.killpg(os.getpgid(proc2.pid), signal.SIGTERM)


# pipeline = Pipeline.get('data_integration_test')

# pe = IntegrationPipelineExecutor(pipeline)
# pe.parse_and_validate_blocks()
# pe.discover()
# pe.execute_in_python(query=dict(_start_date='2022-10-01', _end_date='2022-10-02'))
