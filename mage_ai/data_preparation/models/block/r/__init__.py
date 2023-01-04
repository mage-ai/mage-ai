from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.variable import (
    DATAFRAME_CSV_FILE,
    VariableType,
)
from typing import Dict, List
import jinja2
import os
import subprocess
import uuid
import pandas as pd

BLOCK_TYPE_TO_EXECUTION_TEMPLATE = {
    BlockType.DATA_LOADER: 'data_loader.jinja',
    BlockType.TRANSFORMER: 'transformer.jinja',
    BlockType.DATA_EXPORTER: 'data_exporter.jinja',
}

template_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(
        os.path.dirname(__file__),
        'templates',
    )),
    lstrip_blocks=True,
    trim_blocks=True,
)


def execute_r_code(
    block,
    code: str,
    execution_partition: str = None,
    global_vars: Dict = None,
):
    input_variable_objects = block.input_variable_objects(
        execution_partition=execution_partition,
    ) or []

    # Render R script with user code
    execution_code = __render_r_script(
        block,
        code,
        execution_partition=execution_partition,
        input_variable_objects=input_variable_objects,
    )
    file_path = f'/tmp/{str(uuid.uuid4())}.r'
    with open(file_path, 'w') as foutput:
        foutput.write(execution_code)

    # Convert input variable to csv format
    __convert_inputs_to_csvs(input_variable_objects)

    # Execute R script
    __execute_r_code(file_path)
    os.remove(file_path)

    output_variable_objects = block.output_variable_objects(
        execution_partition=execution_partition,
    )
    output_variable_objects = [v for v in output_variable_objects
                               if os.path.exists(os.path.join(
                                    output_variable_objects[0].variable_path,
                                    DATAFRAME_CSV_FILE,
                                ))]

    if len(output_variable_objects) > 0:
        df = pd.read_csv(os.path.join(output_variable_objects[0].variable_path, DATAFRAME_CSV_FILE))
    else:
        df = None
    return df


def __convert_inputs_to_csvs(input_variable_objects):
    for v in input_variable_objects:
        if v.variable_type == VariableType.DATAFRAME:
            v.convert_parquet_to_csv()


def __render_r_script(
    block,
    code: str,
    execution_partition: str = None,
    input_variable_objects: List = [],
):
    if block.type not in BLOCK_TYPE_TO_EXECUTION_TEMPLATE:
        raise Exception(
            f'Block execution for {block.type} with R language is not supported.',
        )
    template = template_env.get_template(BLOCK_TYPE_TO_EXECUTION_TEMPLATE[block.type])

    output_variable_object = block.variable_object('output_0', execution_partition=execution_partition)
    os.makedirs(output_variable_object.variable_path, exist_ok=True)
    output_path = os.path.join(output_variable_object.variable_path, DATAFRAME_CSV_FILE)

    return template.render(
        code=code,
        input_paths=[os.path.join(v.variable_path, DATAFRAME_CSV_FILE) for v in input_variable_objects],
        input_vars_str=', '.join([f'df_{i + 1}' for i in range(len(input_variable_objects))]),
        output_path=output_path,
    ) + '\n'


def __execute_r_code(file_path: str):
    subprocess.run(
        [
            'Rscript',
            '--vanilla',
            file_path
        ],
        check=True,
    )


class RBlock(Block):
    def _execute_block(
        self,
        output_from_input_vars,
        custom_code: str = None,
        execution_partition: str = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> List:
        outputs = execute_r_code(
            self,
            custom_code or self.content,
            execution_partition=execution_partition,
            global_vars=global_vars,
        )

        if outputs is None:
            outputs = []
        if type(outputs) is not list:
            outputs = [outputs]

        return outputs
