import os
from enum import Enum

DATA_INTEGRATION_CATALOG_FILE = 'data_integration_catalog.json'
DATAFRAME_ANALYSIS_KEYS = frozenset(
    [
        'metadata',
        'statistics',
        'insights',
        'suggestions',
    ]
)
DATAFRAME_ANALYSIS_MAX_COLUMNS = 100
DATAFRAME_ANALYSIS_MAX_ROWS = 100_000
DATAFRAME_SAMPLE_COUNT = 1000
DATAFRAME_SAMPLE_COUNT_PREVIEW = 10
DATAFRAME_SAMPLE_MAX_COLUMNS = 1000
LOGS_DIR = '.logs'
MAX_PRINT_OUTPUT_LINES = int(os.getenv('MAX_PRINT_OUTPUT_LINES', 1000) or 1000)
PIPELINE_CONFIG_FILE = 'metadata.yaml'
PIPELINE_MAX_FILE_SIZE = 500000  # maximum size of a pipeline import zip in kb (500Mb)
PIPELINES_FOLDER = 'pipelines'
PREFERENCES_FILE = '.preferences.yaml'
REPO_CONFIG_FILE = 'metadata.yaml'
VARIABLE_DIR = '.variables'

PIPELINE_RUN_STATUS_LAST_RUN_FAILED = 'last_run_failed'


class AIMode(str, Enum):
    OPEN_AI = 'open_ai'
    HUGGING_FACE = 'hugging_face'


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
    CONDITIONAL = 'conditional'
    CHART = 'chart'
    CUSTOM = 'custom'
    DATA_EXPORTER = 'data_exporter'
    DATA_LOADER = 'data_loader'
    DBT = 'dbt'
    DYNAMIC_CHILD = 'dynamic_child'
    EXTENSION = 'extension'
    GLOBAL_DATA_PRODUCT = 'global_data_product'
    HOOK = 'hook'
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
    AZURE_CONTAINER_INSTANCE = 'azure_container_instance'
    ECS = 'ecs'
    GCP_CLOUD_RUN = 'gcp_cloud_run'
    K8S = 'k8s'
    LOCAL_PYTHON = 'local_python'
    # Force using local python when default executor is set
    LOCAL_PYTHON_FORCE = 'local_python_force'
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
    BlockType.GLOBAL_DATA_PRODUCT,
    BlockType.SENSOR,
    BlockType.TRANSFORMER,
]

NON_PIPELINE_EXECUTABLE_BLOCK_TYPES = [
    BlockType.CHART,
    BlockType.MARKDOWN,
    BlockType.SCRATCHPAD,
]

PYTHON_COMMAND = 'python3'


SINGULAR_FOLDER_BLOCK_TYPES = [
    BlockType.CUSTOM,
]

BLOCK_TYPE_DIRECTORY_NAME = \
    {v: f'{v.value}s' for v in BlockType if v not in SINGULAR_FOLDER_BLOCK_TYPES}


PIPELINE_TYPE_DISPLAY_NAME_MAPPING = {
    PipelineType.INTEGRATION: 'Data integration',
    PipelineType.PYTHON: 'Batch',
    PipelineType.STREAMING: 'Streaming',
}
