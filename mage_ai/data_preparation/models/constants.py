from enum import Enum

PIPELINES_FOLDER = 'pipelines'
PIPELINE_CONFIG_FILE = 'metadata.yaml'
DATA_INTEGRATION_CATALOG_FILE = 'data_integration_catalog.json'


DATAFRAME_ANALYSIS_KEYS = frozenset(
    [
        'metadata',
        'statistics',
        'insights',
        'suggestions',
    ]
)
DATAFRAME_ANALYSIS_MAX_ROWS = 100_000
DATAFRAME_ANALYSIS_MAX_COLUMNS = 100
DATAFRAME_SAMPLE_COUNT_PREVIEW = 10
DATAFRAME_SAMPLE_COUNT = 1000
DATAFRAME_SAMPLE_MAX_COLUMNS = 1000
VARIABLE_DIR = '.variables'
LOGS_DIR = '.logs'


class BlockLanguage(str, Enum):
    PYTHON = 'python'
    R = 'r'
    SQL = 'sql'
    YAML = 'yaml'


class BlockStatus(str, Enum):
    EXECUTED = 'executed'
    FAILED = 'failed'
    NOT_EXECUTED = 'not_executed'
    UPDATED = 'updated'


class BlockType(str, Enum):
    CHART = 'chart'
    CUSTOM = 'custom'
    DATA_EXPORTER = 'data_exporter'
    DATA_LOADER = 'data_loader'
    DBT = 'dbt'
    SCRATCHPAD = 'scratchpad'
    SENSOR = 'sensor'
    TRANSFORMER = 'transformer'


class BlockColor(str, Enum):
    BLUE = 'blue'
    GREY = 'grey'
    PINK = 'pink'
    PURPLE = 'purple'
    TEAL = 'teal'
    YELLOW = 'yellow'


class ExecutorType(str, Enum):
    LOCAL_PYTHON = 'local_python'
    ECS = 'ecs'
    GCP_CLOUD_RUN = 'gcp_cloud_run'
    K8S = 'k8s'
    PYSPARK = 'pyspark'


class PipelineType(str, Enum):
    INTEGRATION = 'integration'
    DATABRICKS = 'databricks'
    PYTHON = 'python'
    PYSPARK = 'pyspark'
    STREAMING = 'streaming'


BLOCK_LANGUAGE_TO_FILE_EXTENSION = {
    BlockLanguage.PYTHON: 'py',
    BlockLanguage.R: 'r',
    BlockLanguage.SQL: 'sql',
    BlockLanguage.YAML: 'yaml',
}

FILE_EXTENSION_TO_BLOCK_LANGUAGE = {
    'py': BlockLanguage.PYTHON,
    'r': BlockLanguage.R,
    'sql': BlockLanguage.SQL,
    'yaml': BlockLanguage.YAML,
}

CUSTOM_EXECUTION_BLOCK_TYPES = [
    BlockType.CHART,
    BlockType.CUSTOM,
    BlockType.DATA_EXPORTER,
    BlockType.DATA_LOADER,
    BlockType.DBT,
    BlockType.SENSOR,
    BlockType.TRANSFORMER,
]


NON_PIPELINE_EXECUTABLE_BLOCK_TYPES = [
    BlockType.CHART,
    BlockType.SCRATCHPAD,
]
