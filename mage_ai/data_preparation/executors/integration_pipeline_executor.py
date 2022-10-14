from mage_integrations.sources.utils import update_catalog, update_source_state_from_destination_state
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.array import find
import json
import os
import signal
import subprocess
import time
import yaml

pipeline = Pipeline.get('data_integration_test')

blocks = list(pipeline.blocks_by_uuid.values())

data_loader = find(lambda x: BlockType.DATA_LOADER == x.type, blocks)
data_exporter = find(lambda x: BlockType.DATA_EXPORTER == x.type, blocks)

source_config = yaml.safe_load(data_loader.content)
destination_config = yaml.safe_load(data_exporter.content)

source = source_config['source']
if 'amplitude' == source:
    from mage_integrations.sources import amplitude as source_module

destination = destination_config['destination']
if 'postgresql' == destination:
    from mage_integrations.destinations import postgresql as destination_module

pipeline_dir = '/'.join(pipeline.config_path.split('/')[:-1])

filepath = os.path.abspath(source_module.__file__)
file_dir = '/'.join(filepath.split('/')[:-1])

destination_filepath = os.path.abspath(destination_module.__file__)
destination_file_dir = '/'.join(destination_filepath.split('/')[:-1])

source_dir = f'{pipeline_dir}/{source}'
if not os.path.exists(source_dir):
    os.makedirs(source_dir)

destination_dir = f'{pipeline_dir}/{destination}'
if not os.path.exists(destination_dir):
    os.makedirs(destination_dir)

config_file_path = f'{source_dir}/config.json'
with open(config_file_path, 'w') as f:
    f.write(json.dumps(source_config['config']))

destination_config_file_path = f'{destination_dir}/config.json'
with open(destination_config_file_path, 'w') as f:
    f.write(json.dumps(destination_config['config']))

proc = subprocess.Popen([
    'python3',
    filepath,
    '--config',
    config_file_path,
    '--discover',
], stdout=subprocess.PIPE)

catalog_file_path = f'{source_dir}/catalog.json'
with open(catalog_file_path, 'w') as f:
    f.write(proc.stdout.read().decode())

query_file_path = f'{source_dir}/query.json'
with open(query_file_path, 'w') as f:
    f.write(json.dumps(source_config['query']))

state_filepath = f'{source_dir}/state.json'
with open(state_filepath, 'w') as f:
    f.write(json.dumps(dict(bookmarks={})))

destination_state_filepath = f'{destination_dir}/state'
if not os.path.exists(destination_state_filepath):
    with open(destination_state_filepath, 'w') as f:
        f.write('')

update_catalog(
    catalog_file_path,
    'events',
    ['uuid'],
    'FULL_TABLE',
    bookmark_properties=['event_time', 'uuid'],
    select_stream=True,
    selected_columns=['amplitude_id', 'amplitude_attribution_ids', 'uuid'],
    unique_conflict_method='UPDATE',
    unique_constraints=['uuid'],
)

update_source_state_from_destination_state(
    state_filepath,
    destination_state_filepath,
)

proc1 = subprocess.Popen([
    'python3',
    filepath,
    '--config',
    config_file_path,
    '--catalog',
    catalog_file_path,
    '--query',
    query_file_path,
    '--state',
    state_filepath,
], preexec_fn=os.setsid, stdout=subprocess.PIPE)

proc2 = subprocess.Popen([
    'python3',
    destination_filepath,
    '--config',
    destination_config_file_path,
    '--state',
    destination_state_filepath,
], stdin=proc1.stdout)

time.sleep(120)

os.killpg(os.getpgid(proc1.pid), signal.SIGTERM)
os.killpg(os.getpgid(proc2.pid), signal.SIGTERM)

# from mage_ai.data_preparation.executors.mixins.execution import ExecuteWithOutMixin
# from mage_ai.data_preparation.executors.mixins.validation import ValidateBlockMixin
# from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
# import subprocess


# class IntegrationPipelineExecutor(PipelineExecuto, ExecuteWithOutMixin, ValidateBlockMixin):
#     def parse_and_validate_blocks(self):
#         pass

#     def execute_in_python(self):
#         pass
#         self.pipeline
#         # p1 = subprocess.Popen([
#         #     'python',
#         #     'taps/test.py',
#         #     '--config',
#         #     'taps/config.json',
#         #     '--catalog',
#         #     'taps/catalog.json',
#         #     '--state',
#         #     'taps/state.json',
#         # ], stdout=subprocess.PIPE)

#         # fout = open('state.txt', 'wb')

#         # p2 = subprocess.run([
#         #     'python',
#         #     'targets/test.py',
#         # ], stdin=p1.stdout, stdout=fout)
