import importlib
import json
import os
import subprocess
from typing import Any, Dict, List

import pandas as pd
import simplejson
import yaml

from mage_ai.data_integrations.logger.utils import print_logs_from_output
from mage_ai.data_integrations.utils.config import (
    build_config,
    get_catalog,
    interpolate_variables,
)
from mage_ai.data_integrations.utils.parsers import parse_logs_and_json
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.utils import number_string
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.shared.array import find
from mage_ai.shared.hash import dig
from mage_ai.shared.parsers import encode_complex, extract_json_objects
from mage_ai.shared.security import filter_out_config_values
from mage_ai.shared.utils import clean_name

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
        path = f'{self.pipeline_variables_dir}/{self.destination_uuid}'
        if not os.path.exists(path):
            os.makedirs(path)
        return path

    @property
    def destination(self) -> Any:
        if self.destination_uuid:
            return importlib.import_module(
                f'mage_integrations.destinations.{self.destination_uuid}',
            )

    @property
    def destination_file_path(self) -> str:
        try:
            if self.destination:
                return os.path.abspath(self.destination.__file__)
        except Exception:
            if self.destination_uuid:
                mod1 = importlib.import_module('mage_integrations.destinations')
                absolute_path = '/'.join(mod1.__file__.split('/')[:-1])
                absolute_path = f'{absolute_path}/{self.destination_uuid}/__init__.py'
                return absolute_path

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
        path = f'{self.pipeline_variables_dir}/{self.source_uuid}'
        if not os.path.exists(path):
            os.makedirs(path)
        return path

    @property
    def source(self) -> Any:
        if self.source_uuid:
            return importlib.import_module(f'mage_integrations.sources.{self.source_uuid}')

    @property
    def source_file_path(self) -> str:
        try:
            if self.source:
                return os.path.abspath(self.source.__file__)
        except Exception:
            if self.source_uuid:
                mod1 = importlib.import_module('mage_integrations.sources')
                absolute_path = '/'.join(mod1.__file__.split('/')[:-1])
                absolute_path = f'{absolute_path}/{self.source_uuid}/__init__.py'
                return absolute_path

    @property
    def settings_file_path(self) -> str:
        if self.data_integration and 'catalog' in self.data_integration:
            if os.path.exists(self.catalog_config_path):
                return self.catalog_config_path
            return self.config_path
        return self.data_loader.file_path

    @property
    def transformer_file_path(self) -> str:
        transformer_file = importlib.import_module('mage_integrations.transformers.base')
        return os.path.abspath(transformer_file.__file__)

    def block_from_block_uuid_with_stream(
        self,
        block_uuid_with_stream: str,
    ) -> Block:
        return find(lambda x: block_uuid_with_stream.startswith(x.uuid), self.blocks)

    def destination_state_file_path(self, stream: str, destination_table: str) -> str:
        stream_dir = f'{self.destination_dir}/{clean_name(stream)}'
        file_path = f'{stream_dir}/{clean_name(destination_table)}_state'

        os.makedirs(stream_dir, exist_ok=True)

        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                f.write(json.dumps(dict(bookmarks={})))

        return file_path

    def source_output_folder(self, stream: str) -> str:
        return f'{self.source_dir}/{clean_name(stream)}/output'

    def catalog_file_path(self, stream: str, index: int = 0) -> str:
        pass

    def source_output_file_path(self, stream: str, index: int = 0) -> str:
        stream_dir = self.source_output_folder(stream)
        file_path = f'{stream_dir}/{number_string(index)}'

        os.makedirs(stream_dir, exist_ok=True)

        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                f.write('')

        return file_path

    def source_state_file_path(self, stream: str, destination_table: str) -> str:
        stream_dir = f'{self.source_dir}/{clean_name(stream)}'
        file_path = f'{stream_dir}/{clean_name(destination_table)}_state.json'

        os.makedirs(stream_dir, exist_ok=True)

        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                f.write(json.dumps(dict(bookmarks={})))

        return file_path

    def test_connection(self, block_type: BlockType, config: str = None):
        file_path = None
        if BlockType.DATA_LOADER == block_type:
            file_path = self.source_file_path
        elif BlockType.DATA_EXPORTER == block_type:
            file_path = self.destination_file_path

        config_interpolated = interpolate_variables(config, self.__global_variables())
        try:
            if file_path:
                run_args = [
                    PYTHON,
                    file_path,
                    '--config_json',
                    simplejson.dumps(
                        config_interpolated,
                        default=encode_complex,
                        ignore_nan=True,
                    ),
                    '--test_connection',
                ]

                proc = subprocess.run(
                    run_args,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=10,
                )
                proc.check_returncode()
        except subprocess.CalledProcessError as err:
            stderr = err.stderr.decode('utf-8')

            json_object = {}
            error = stderr
            for line in stderr.split('\n'):
                if line.startswith('ERROR'):
                    try:
                        json_object = next(extract_json_objects(line))
                        error = dig(json_object, 'tags.error')
                    except Exception:
                        error = line
                elif not error and line.startswith('CRITICAL'):
                    error = line
            raise Exception(filter_out_config_values(error, config_interpolated))
        except Exception as err:
            raise Exception(filter_out_config_values(str(err), config_interpolated))

    def preview_data(self, block_type: BlockType, streams: List[str] = None) -> List[str]:
        from mage_integrations.utils.logger.constants import TYPE_SAMPLE_DATA

        file_path = None
        if BlockType.DATA_LOADER == block_type:
            file_path = self.source_file_path
        elif BlockType.DATA_EXPORTER == block_type:
            file_path = self.destination_file_path

        streams_updated = set()
        config, config_json = build_config(
            self.data_loader.file_path,
            self.__global_variables(),
        )
        try:
            streams = streams if streams else \
                list(map(lambda s: s['tap_stream_id'], self.streams()))
            if file_path and len(streams) > 0:
                run_args = [
                    PYTHON,
                    file_path,
                    '--config_json',
                    config_json,
                    '--load_sample_data',
                    '--log_to_stdout',
                    '1',
                    '--settings',
                    self.settings_file_path,
                    '--selected_streams_json',
                    json.dumps(streams),
                ]

                proc = subprocess.run(
                    run_args,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                proc.check_returncode()

                output = proc.stdout.decode()
                print_logs_from_output(output, config=config)

                pipeline = Pipeline(self.uuid)
                block = pipeline.get_block(self.data_loader.uuid)

                for line in output.split('\n'):
                    try:
                        data = json.loads(line)
                        if TYPE_SAMPLE_DATA == data.get('type'):
                            sample_data_json = data.get('sample_data')
                            sample_data = pd.DataFrame.from_dict(json.loads(sample_data_json))
                            stream_id = data.get('stream_id')

                            variables = {
                                f'output_sample_data_{stream_id}': sample_data,
                            }

                            block.store_variables(variables)
                            streams_updated.add(stream_id)
                    except json.decoder.JSONDecodeError:
                        pass

            return streams_updated
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode('utf-8').split('\n')

            json_object = {}
            error = ''
            for line in stderr:
                if line.startswith('ERROR'):
                    try:
                        json_object = next(extract_json_objects(line))
                        error = dig(json_object, 'tags.error')
                    except Exception:
                        error = line
            error = filter_out_config_values(error, config)
            if not error:
                raise Exception('The sample data was not able to be loaded. Please check if the ' +
                                'stream still exists. If it does not, click the "View and select ' +
                                'streams" button and confirm the valid streams. If it does, ' +
                                'loading sample data for this source may not currently ' +
                                'be supported.')
            raise Exception(error)

    def count_records(self) -> List[Dict]:
        arr = []

        if self.source_file_path and self.data_loader.file_path:
            for stream_data in self.streams():
                tap_stream_id = stream_data['tap_stream_id']
                destination_table = stream_data.get('destination_table', tap_stream_id)

                config, config_json = build_config(
                    self.data_loader.file_path,
                    self.__global_variables(),
                )
                arr += json.loads(
                    self.__run_in_subprocess(
                        [
                            PYTHON,
                            self.source_file_path,
                            '--config_json',
                            config_json,
                            '--settings',
                            self.settings_file_path,
                            '--state',
                            self.source_state_file_path(
                                destination_table=destination_table,
                                stream=tap_stream_id,
                            ),
                            '--selected_streams_json',
                            json.dumps([tap_stream_id]),
                            '--count_records',
                        ],
                        config=config,
                    )
                )

        return arr

    def discover(self, streams: List[str] = None) -> Dict:
        if self.source_file_path and self.data_loader.file_path:
            config, config_json = build_config(
                self.data_loader.file_path,
                self.__global_variables(),
            )
            run_args = [
                PYTHON,
                self.source_file_path,
                '--config_json',
                config_json,
                '--discover',
            ]
            if streams:
                run_args += [
                    '--selected_streams_json',
                    json.dumps(streams),
                ]
            return json.loads(
                self.__run_in_subprocess(
                    run_args,
                    config=config,
                )
            )

    def discover_streams(self) -> List[str]:
        if self.source_file_path and self.data_loader.file_path:
            config, config_json = build_config(
                self.data_loader.file_path,
                self.__global_variables(),
            )
            return json.loads(
                self.__run_in_subprocess(
                    [
                        PYTHON,
                        self.source_file_path,
                        '--config_json',
                        config_json,
                        '--discover',
                        '--discover_streams',
                    ],
                    config=config,
                )
            )

    def __run_in_subprocess(self, run_args: List[str], config: Dict = None) -> str:
        try:
            proc = subprocess.run(run_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            proc.check_returncode()

            return parse_logs_and_json(
                proc.stdout.decode(),
                config=config,
            )
        except subprocess.CalledProcessError as e:
            message = e.stderr.decode('utf-8')
            raise Exception(filter_out_config_values(message, config))

    def streams(self, variables: Dict = None) -> List[Dict]:
        if variables is None:
            variables = {}
        return self.__catalog(variables)['streams']

    def __catalog(self, variables: Dict = None) -> Dict:
        if variables is None:
            variables = {}
        return get_catalog(
            self.data_loader,
            self.__global_variables(variables),
            pipeline=self,
        )

    def __global_variables(self, variables: Dict = None) -> Dict:
        if variables is None:
            variables = {}
        d = get_global_variables(self.uuid) or dict()
        d.update(variables)
        return d
