from mage_ai.data_preparation.executors.mixins.execution import ExecuteWithOutputMixin
from mage_ai.data_preparation.executors.mixins.validation import ValidateBlockMixin
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from mage_integrations.sources.utils import (
    update_catalog_dict,
    update_source_state_from_destination_state,
)
from typing import Any, Dict, List
import importlib
import json
import os
import signal
import subprocess
import time
import yaml

PYTHON = 'python3'


class IntegrationPipelineExecutor(PipelineExecutor, ExecuteWithOutputMixin, ValidateBlockMixin):
    @property
    def blocks(self) -> List[Block]:
        return list(pipeline.blocks_by_uuid.values())

    @property
    def data_loader(self) -> Block:
        return find(lambda x: BlockType.DATA_LOADER == x.type, self.blocks)

    @property
    def data_exporter(self) -> Block:
        return find(lambda x: BlockType.DATA_EXPORTER == x.type, self.blocks)

    @property
    def destination_config(self) -> Dict:
        return yaml.safe_load(self.data_exporter.content)

    @property
    def destination_name(self) -> str:
        return self.destination_config['destination']

    @property
    def destination_dir(self) -> str:
        path = f'{self.pipeline_dir}/{self.destination_name}'
        if not os.path.exists(path):
            os.makedirs(path)
        return path

    @property
    def destination(self) -> Any:
        return importlib.import_module(f'mage_integrations.destinations.{self.destination_name}')

    @property
    def destination_file_path(self) -> str:
        return os.path.abspath(self.destination.__file__)

    @property
    def destination_state_file_path(self) -> str:
        file_path = f'{self.destination_dir}/state'
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                f.write('')
        return file_path

    @property
    def source_config(self) -> Dict:
        return yaml.safe_load(self.data_loader.content)

    @property
    def source_name(self) -> str:
        return self.source_config['source']

    @property
    def source_dir(self) -> str:
        path = f'{self.pipeline_dir}/{self.source_name}'
        if not os.path.exists(path):
            os.makedirs(path)
        return path

    @property
    def source(self) -> Any:
        return importlib.import_module(f'mage_integrations.sources.{self.source_name}')

    @property
    def source_file_path(self) -> str:
        return os.path.abspath(self.source.__file__)

    @property
    def source_state_file_path(self) -> str:
        file_path = f'{self.source_dir}/state.json'
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                f.write(json.dumps(dict(bookmarks={})))
        return file_path

    @property
    def pipeline_dir(self) -> str:
        return '/'.join(self.pipeline.config_path.split('/')[:-1])

    def parse_and_validate_blocks(self):
        if not self.data_loader:
            raise Exception('Please provide at least 1 data loader block.')
        if not self.data_exporter:
            raise Exception('Please provide at least 1 data exporter block.')

    def discover(self) -> dict:
        proc = subprocess.run([
            PYTHON,
            self.source_file_path,
            '--settings',
            self.data_loader.file_path,
            '--discover',
        ], stdout=subprocess.PIPE)

        return json.loads(proc.stdout)

    def execute_in_python(self, query: Dict = {}):
        catalog = self.discover()
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
        self.data_loader.update_content(yaml.dump(
            merge_dict(
                self.source_config,
                dict(catalog=catalog),
            ),
            allow_unicode=True,
        ))

        update_source_state_from_destination_state(
            self.source_state_file_path,
            self.destination_state_file_path,
        )

        proc1 = subprocess.Popen([
            PYTHON,
            self.source_file_path,
            '--settings',
            self.data_loader.file_path,
            '--state',
            self.source_state_file_path,
            '--query',
            json.dumps(query),
        ], preexec_fn=os.setsid, stdout=subprocess.PIPE)

        proc2 = subprocess.Popen([
            PYTHON,
            self.destination_file_path,
            '--settings',
            self.data_exporter.file_path,
            '--state',
            self.destination_state_file_path,
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
