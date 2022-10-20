from mage_ai.data_integrations.utils.config import build_config_json
from mage_ai.data_integrations.utils.parsers import parse_logs_and_json
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.shared.array import find
from typing import Any, Dict, List
import importlib
import io
import json
import os
import subprocess
import yaml

PYTHON = 'python3'


class IntegrationPipeline(Pipeline):
    @property
    def blocks(self) -> List[Block]:
        return list(self.blocks_by_uuid.values())

    @property
    def data_loader(self) -> Block:
        return find(lambda x: BlockType.DATA_LOADER == x.type, self.blocks)

    @property
    def data_exporter(self) -> Block:
        return find(lambda x: BlockType.DATA_EXPORTER == x.type, self.blocks)

    @property
    def destination_config(self) -> Dict:
        if self.data_exporter and self.data_exporter.content:
            return yaml.safe_load(self.data_exporter.content)
        return {}

    @property
    def destination_uuid(self) -> str:
        return self.destination_config.get('destination')

    @property
    def destination_dir(self) -> str:
        path = f'{self.pipeline_dir}/{self.destination_uuid}'
        if not os.path.exists(path):
            os.makedirs(path)
        return path

    @property
    def destination(self) -> Any:
        if self.destination_uuid:
            return importlib.import_module(f'mage_integrations.destinations.{self.destination_uuid}')

    @property
    def destination_file_path(self) -> str:
        if self.destination:
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
        if self.data_loader and self.data_loader.content:
            return yaml.safe_load(self.data_loader.content)
        return {}

    @property
    def source_uuid(self) -> str:
        return self.source_config.get('source')

    @property
    def source_dir(self) -> str:
        path = f'{self.pipeline_dir}/{self.source_uuid}'
        if not os.path.exists(path):
            os.makedirs(path)
        return path

    @property
    def source(self) -> Any:
        if self.source_uuid:
            return importlib.import_module(f'mage_integrations.sources.{self.source_uuid}')

    @property
    def source_file_path(self) -> str:
        if self.source:
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
        return '/'.join(self.config_path.split('/')[:-1])

    def discover(self, streams: List[str] = None) -> dict:
        global_vars = get_global_variables(self.uuid) or dict()

        if self.source_file_path and self.data_loader.file_path:
            try:
                run_args = [
                    PYTHON,
                    self.source_file_path,
                    '--config_json',
                    build_config_json(self.data_loader.file_path, global_vars),
                    '--settings',
                    self.data_loader.file_path,
                    '--discover',
                ]
                if streams:
                    run_args += [
                        '--selected_streams_json',
                        json.dumps(streams),
                    ]

                proc = subprocess.run(run_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                proc.check_returncode()

                return json.loads(parse_logs_and_json(proc.stdout.decode()))

            except subprocess.CalledProcessError as e:
                message = e.stderr.decode("utf-8")
                raise Exception(message)

    def discover_streams(self) -> List[str]:
        if self.source_file_path and self.data_loader.file_path:
            global_vars = get_global_variables(self.uuid) or dict()

            try:
                run_args = [
                    PYTHON,
                    self.source_file_path,
                    '--config_json',
                    build_config_json(self.data_loader.file_path, global_vars),
                    '--settings',
                    self.data_loader.file_path,
                    '--discover',
                    '--discover_streams',
                ]

                proc = subprocess.run(run_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                proc.check_returncode()

                return json.loads(parse_logs_and_json(proc.stdout.decode()))
            except subprocess.CalledProcessError as e:
                message = e.stderr.decode("utf-8")
                raise Exception(message)
