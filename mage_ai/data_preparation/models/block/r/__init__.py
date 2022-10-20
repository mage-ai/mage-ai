from mage_ai.data_preparation.models.constants import BlockType
from typing import Dict
import jinja2
import os
import subprocess
import uuid


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
    # Render R script with user code
    execution_code = __render_r_script(block, code, execution_partition=execution_partition)
    file_path = f'/tmp/{str(uuid.uuid4())}.r'
    with open(file_path, 'w') as foutput:
        foutput.write(execution_code)
    __execute_r_code(file_path)
    # os.remove(file_path)


def __render_r_script(block, code: str, execution_partition: str = None):
    if block.type not in BLOCK_TYPE_TO_EXECUTION_TEMPLATE:
        raise Exception(
            f'Block execution for {block.type} with R language is not supported.',
        )
    template = template_env.get_template(BLOCK_TYPE_TO_EXECUTION_TEMPLATE[block.type])
    input_variable_objects = block.input_variable_objects(
        execution_partition=execution_partition,
    ) or []
    output_variable_object = block.output_variable_object(execution_partition=execution_partition)
    return template.render(
        code=code,
        input_paths=[v.variable_path + '/data.csv' for v in input_variable_objects],
        input_vars_str=', '.join([f'df_{i + 1}' for i in range(len(input_variable_objects))]),
        output_path=output_variable_object.variable_path + '/data.csv',
    ) + '\n'


def __execute_r_code(file_path: str):
    outputs = subprocess.run(
        [
            'Rscript',
            '--vanilla',
            file_path
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    output_stdout = outputs.stdout.decode()
    output_stderr = outputs.stderr.decode()
    print(output_stdout)
    if len(output_stderr) > 0:
        raise Exception(output_stderr)
