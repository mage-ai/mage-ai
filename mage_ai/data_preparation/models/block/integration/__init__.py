from jupyter_server import subprocess
from logging import Logger
from mage_ai.data_integrations.logger.utils import (
    print_log_from_line,
)
from mage_ai.data_integrations.utils.config import (
    build_config_json,
    get_catalog_by_stream,
)
from mage_ai.data_preparation.models.block import PYTHON_COMMAND, Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.shared.hash import merge_dict
from typing import Dict, List

import json
import os
import pandas as pd


class IntegrationBlock(Block):
    def _execute_block(
        self,
        outputs_from_input_vars,
        execution_partition: str = None,
        input_vars: List = None,
        logger: Logger = None,
        logging_tags: Dict = dict(),
        global_vars: Dict = None,
        test_execution: bool = False,
        input_from_output: Dict = None,
        runtime_arguments: Dict = None,
        **kwargs,
    ) -> List:
        from mage_integrations.sources.constants import BATCH_FETCH_LIMIT

        index = self.template_runtime_configuration.get('index', None)
        is_last_block_run = self.template_runtime_configuration.get('is_last_block_run', False)
        selected_streams = self.template_runtime_configuration.get('selected_streams', [])
        stream = selected_streams[0] if len(selected_streams) >= 1 else None
        destination_table = self.template_runtime_configuration.get('destination_table', stream)
        query_data = runtime_arguments or {}
        query_data = query_data.copy()

        tags = dict(block_tags=dict(
            destination_table=destination_table,
            index=index,
            stream=stream,
            type=self.type,
            uuid=self.uuid,
        ))
        updated_logging_tags = merge_dict(
            logging_tags,
            dict(tags=tags),
        )

        if index is not None:
            source_state_file_path = self.pipeline.source_state_file_path(
                destination_table=destination_table,
                stream=stream,
            )
            destination_state_file_path = self.pipeline.destination_state_file_path(
                destination_table=destination_table,
                stream=stream,
            )
            source_output_file_path = self.pipeline.source_output_file_path(stream, index)

            stream_catalog = get_catalog_by_stream(
                self.pipeline.data_loader.file_path,
                stream,
                global_vars,
                pipeline=self.pipeline,
            ) or dict()

            if stream_catalog.get('replication_method') == 'INCREMENTAL':
                from mage_integrations.sources.utils import \
                    update_source_state_from_destination_state
                update_source_state_from_destination_state(
                    source_state_file_path,
                    destination_state_file_path,
                )
            else:
                query_data['_offset'] = BATCH_FETCH_LIMIT * index
            if not is_last_block_run:
                query_data['_limit'] = BATCH_FETCH_LIMIT

        outputs = []
        if BlockType.DATA_LOADER == self.type:
            lines_in_file = 0

            with open(source_output_file_path, 'w') as f:
                args = [
                    PYTHON_COMMAND,
                    self.pipeline.source_file_path,
                    '--config_json',
                    build_config_json(
                        self.pipeline.data_loader.file_path,
                        global_vars,
                    ),
                    '--log_to_stdout',
                    '1',
                    '--settings',
                    self.pipeline.settings_file_path,
                    '--state',
                    source_state_file_path,
                    '--query_json',
                    json.dumps(query_data),
                ]

                if len(selected_streams) >= 1:
                    args += [
                        '--selected_streams_json',
                        json.dumps(selected_streams),
                    ]

                proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

                for line in proc.stdout:
                    f.write(line.decode())
                    print_log_from_line(
                        line,
                        logger=logger,
                        logging_tags=logging_tags,
                        tags=tags,
                    )
                    lines_in_file += 1

                outputs.append(proc)

            proc.communicate()
            if proc.returncode != 0 and proc.returncode is not None:
                raise subprocess.CalledProcessError(proc.returncode, proc.args)

            file_size = os.path.getsize(source_output_file_path)
            msg = f'Finished writing {file_size} bytes with {lines_in_file} lines to output '\
                  f'file {source_output_file_path}.'
            if logger:
                logger.info(msg, **updated_logging_tags)
            else:
                print(msg)
        elif BlockType.TRANSFORMER == self.type:
            from mage_integrations.sources.constants import COLUMN_TYPE_NULL
            from mage_integrations.utils.logger.constants import (
                TYPE_RECORD,
                TYPE_SCHEMA,
            )
            from mage_integrations.transformers.utils import (
                convert_data_type,
                infer_dtypes,
            )

            decorated_functions = []
            test_functions = []

            results = {
                self.type: self._block_decorator(decorated_functions),
                'test': self._block_decorator(test_functions),
            }
            results.update(outputs_from_input_vars)

            exec(self.content, results)

            # 1. Recreate each record
            # 2. Recreate schema
            schema_original = None
            schema_updated = None
            schema_index = None
            output_arr = []
            records_transformed = 0
            df_sample = None

            with open(source_output_file_path, 'r') as f:
                idx = 0
                for line in f:
                    line = line.strip() if line else ''
                    if len(line) == 0:
                        continue

                    try:
                        data = json.loads(line)
                        line_type = data.get('type')

                        if TYPE_SCHEMA == line_type:
                            schema_index = idx
                            schema_original = data
                        elif TYPE_RECORD == line_type:
                            record = data['record']
                            input_vars = [pd.DataFrame.from_dict([record])]
                            input_kwargs = merge_dict(
                                global_vars,
                                dict(
                                    index=index,
                                    query=query_data,
                                    stream=stream,
                                ),
                            )
                            block_function = self._validate_execution(
                                decorated_functions,
                                input_vars,
                            )

                            if block_function is not None:
                                df = self.execute_block_function(
                                    block_function,
                                    input_vars,
                                    input_kwargs,
                                    test_execution,
                                )
                                if df_sample is None:
                                    df_sample = df

                                if not schema_updated:
                                    properties_updated = {
                                        k: dict(type=[COLUMN_TYPE_NULL, convert_data_type(v)])
                                        for k, v in infer_dtypes(df).items()
                                    }
                                    schema_updated = schema_original.copy()
                                    properties_original = schema_updated['schema']['properties']
                                    schema_updated['schema']['properties'] = {
                                        k: properties_original[k]
                                        if k in properties_original else v
                                        for k, v in properties_updated.items()
                                    }

                                record_transformed = df.to_dict('records')[0]
                                line = json.dumps(merge_dict(
                                    data,
                                    dict(record=record_transformed),
                                ))
                                records_transformed += 1

                                if records_transformed % 1000 == 0:
                                    msg = f'{records_transformed} records have been transformed...'
                                    if logger:
                                        logger.info(msg, **updated_logging_tags)
                                    else:
                                        print(msg)
                    except json.decoder.JSONDecodeError:
                        pass

                    output_arr.append(line)
                    idx += 1

            output_arr[schema_index] = json.dumps(schema_updated)

            with open(source_output_file_path, 'w') as f:
                output = '\n'.join(output_arr)
                f.write(output)

            msg = f'Transformed {records_transformed} total records for stream {stream}.'
            file_size = os.path.getsize(source_output_file_path)
            msg2 = f'Finished writing {file_size} bytes with {len(output_arr)} lines to '\
                   f'output file {source_output_file_path}.'
            if logger:
                logger.info(msg, **updated_logging_tags)
                logger.info(msg2, **updated_logging_tags)
            else:
                print(msg)
                print(msg2)

            self.test_functions = test_functions
        elif BlockType.DATA_EXPORTER == self.type:
            override = {}
            if destination_table:
                override['table'] = destination_table

            file_size = os.path.getsize(source_output_file_path)
            msg = f'Reading {file_size} bytes from {source_output_file_path} as input file.'
            if logger:
                logger.info(msg, **updated_logging_tags)
            else:
                print(msg)

            proc = subprocess.Popen([
                PYTHON_COMMAND,
                self.pipeline.destination_file_path,
                '--config_json',
                build_config_json(
                    self.pipeline.data_exporter.file_path,
                    global_vars,
                    override=override,
                ),
                '--log_to_stdout',
                '1',
                '--settings',
                self.pipeline.data_exporter.file_path,
                '--state',
                self.pipeline.destination_state_file_path(
                    destination_table=destination_table,
                    stream=stream,
                ),
                '--input_file_path',
                source_output_file_path,
            ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

            for line in proc.stdout:
                print_log_from_line(
                    line,
                    logger=logger,
                    logging_tags=logging_tags,
                    tags=tags,
                )

            proc.communicate()
            if proc.returncode != 0 and proc.returncode is not None:
                raise subprocess.CalledProcessError(proc.returncode, proc.args)

            outputs.append(proc)

        return outputs


class SourceBlock(IntegrationBlock):
    pass


class DestinationBlock(IntegrationBlock):
    def output_variables(self, execution_partition: str = None) -> List[str]:
        return []


class TransformerBlock(IntegrationBlock):
    pass
