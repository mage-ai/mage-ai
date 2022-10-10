from enum import Enum

PIPELINES_FOLDER = 'pipelines'
PIPELINE_CONFIG_FILE = 'metadata.yaml'


DATAFRAME_ANALYSIS_KEYS = frozenset(
    [
        'metadata',
        'statistics',
        'insights',
        'suggestions',
    ]
)
DATAFRAME_ANALYSIS_MAX_ROWS = 100_000
DATAFRAME_ANALYSIS_MAX_COLUMNS = 30
DATAFRAME_SAMPLE_COUNT_PREVIEW = 10
DATAFRAME_SAMPLE_COUNT = 1000
VARIABLE_DIR = '.variables'
LOGS_DIR = '.logs'


class BlockLanguage(str, Enum):
    PYTHON = 'python'
    SQL = 'sql'
    YAML = 'yaml'


class BlockStatus(str, Enum):
    EXECUTED = 'executed'
    FAILED = 'failed'
    NOT_EXECUTED = 'not_executed'
    UPDATED = 'updated'


class BlockType(str, Enum):
    CHART = 'chart'
    DATA_EXPORTER = 'data_exporter'
    DATA_LOADER = 'data_loader'
    SCRATCHPAD = 'scratchpad'
    SENSOR = 'sensor'
    TRANSFORMER = 'transformer'


class ExecutorType(str, Enum):
    LOCAL_PYTHON = 'local_python'
    ECS = 'ecs'
    K8S = 'k8s'
    PYSPARK = 'pyspark'


class PipelineType(str, Enum):
    PYTHON = 'python'
    PYSPARK = 'pyspark'
    STREAMING = 'streaming'


BLOCK_LANGUAGE_TO_FILE_EXTENSION = {
    BlockLanguage.PYTHON: 'py',
    BlockLanguage.SQL: 'sql',
    BlockLanguage.YAML: 'yaml',
}

CUSTOM_EXECUTION_BLOCK_TYPES = [
    BlockType.CHART,
    BlockType.DATA_EXPORTER,
    BlockType.DATA_LOADER,
    BlockType.SENSOR,
    BlockType.TRANSFORMER,
]


NON_PIPELINE_EXECUTABLE_BLOCK_TYPES = [
    BlockType.CHART,
    BlockType.SCRATCHPAD,
]
