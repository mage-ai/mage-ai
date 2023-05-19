import os
from enum import Enum

PIPELINES_FOLDER = 'pipelines'
PIPELINE_CONFIG_FILE = 'metadata.yaml'
PREFERENCES_FILE = '.preferences.yaml'
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
MAX_PRINT_OUTPUT_LINES = int(os.getenv('MAX_PRINT_OUTPUT_LINES', 1000) or 1000)
VARIABLE_DIR = '.variables'
LOGS_DIR = '.logs'


class BlockLanguage(str, Enum):
    MARKDOWN = 'markdown'
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
    CALLBACK = 'callback'
    CHART = 'chart'
    CUSTOM = 'custom'
    DATA_EXPORTER = 'data_exporter'
    DATA_LOADER = 'data_loader'
    DBT = 'dbt'
    EXTENSION = 'extension'
    MARKDOWN = 'markdown'
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


class CallbackStatus(str, Enum):
    FAILURE = 'failure'
    SUCCESS = 'success'


class ExecutorType(str, Enum):
    LOCAL_PYTHON = 'local_python'
    ECS = 'ecs'
    GCP_CLOUD_RUN = 'gcp_cloud_run'
    K8S = 'k8s'
    PYSPARK = 'pyspark'

    @classmethod
    def is_valid_type(cls, executor_type: str) -> bool:
        return executor_type.upper() in cls.__members__


class PipelineType(str, Enum):
    INTEGRATION = 'integration'
    DATABRICKS = 'databricks'
    PYTHON = 'python'
    PYSPARK = 'pyspark'
    STREAMING = 'streaming'


class PipelineStatus(str, Enum):
    ACTIVE = 'active',              # At least one active trigger
    INACTIVE = 'inactive',          # All inactive triggers
    NO_SCHEDULES = 'no_schedules',  # No triggers


BLOCK_LANGUAGE_TO_FILE_EXTENSION = {
    BlockLanguage.MARKDOWN: 'md',
    BlockLanguage.PYTHON: 'py',
    BlockLanguage.R: 'r',
    BlockLanguage.SQL: 'sql',
    BlockLanguage.YAML: 'yaml',
}


CALLBACK_STATUSES = [
    CallbackStatus.FAILURE,
    CallbackStatus.SUCCESS,
]


FILE_EXTENSION_TO_BLOCK_LANGUAGE = {
    'md': BlockLanguage.MARKDOWN,
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
    BlockType.EXTENSION,
    BlockType.SENSOR,
    BlockType.TRANSFORMER,
]

NON_PIPELINE_EXECUTABLE_BLOCK_TYPES = [
    BlockType.CHART,
    BlockType.MARKDOWN,
    BlockType.SCRATCHPAD,
]
