from enum import Enum

from mage_ai.data_preparation.models.constants import BlockType, PipelineType


class EntityName(str, Enum):
    ALL = 'ALL'
    ALL_EXCEPT_RESERVED = 'ALL_EXCEPT_RESERVED'
    AutocompleteItem = 'AutocompleteItem'
    Backfill = 'Backfill'
    Block = 'Block'
    BlockLayoutItem = 'BlockLayoutItem'
    BlockOutput = 'BlockOutput'
    BlockRun = 'BlockRun'
    BlockTemplate = 'BlockTemplate'
    Chart = 'Chart'
    ClientPage = 'ClientPage'
    Cluster = 'Cluster'
    CustomTemplate = 'CustomTemplate'
    DataProvider = 'DataProvider'
    Database = 'Database'
    EventMatcher = 'EventMatcher'
    EventRule = 'EventRule'
    ExtensionOption = 'ExtensionOption'
    Feature = 'Feature'
    File = 'File'
    FileContent = 'FileContent'
    FileVersion = 'FileVersion'
    Folder = 'Folder'
    GitBranch = 'GitBranch'
    GitCustomBranch = 'GitCustomBranch'
    GitFile = 'GitFile'
    GlobalDataProduct = 'GlobalDataProduct'
    IntegrationDestination = 'IntegrationDestination'
    IntegrationSource = 'IntegrationSource'
    IntegrationSourceStream = 'IntegrationSourceStream'
    Interaction = 'Interaction'
    Kernel = 'Kernel'
    Llm = 'Llm'
    Log = 'Log'
    MonitorStat = 'MonitorStat'
    Oauth = 'Oauth'
    OauthAccessToken = 'OauthAccessToken'
    OauthApplication = 'OauthApplication'
    Output = 'Output'
    PageBlockLayout = 'PageBlockLayout'
    PageComponent = 'PageComponent'
    Permission = 'Permission'
    Pipeline = 'Pipeline'
    PipelineInteraction = 'PipelineInteraction'
    PipelineRun = 'PipelineRun'
    PipelineSchedule = 'PipelineSchedule'
    PipelineTrigger = 'PipelineTrigger'
    Project = 'Project'
    PullRequest = 'PullRequest'
    Role = 'Role'
    RolePermission = 'RolePermission'
    Scheduler = 'Scheduler'
    SearchResult = 'SearchResult'
    Secret = 'Secret'
    Session = 'Session'
    Status = 'Status'
    Sync = 'Sync'
    Tag = 'Tag'
    User = 'User'
    UserRole = 'UserRole'
    Variable = 'Variable'
    Widget = 'Widget'
    Workspace = 'Workspace'


RESERVED_ENTITY_NAMES = [
    EntityName.Oauth,
    EntityName.OauthAccessToken,
    EntityName.OauthApplication,
    EntityName.Project,
    EntityName.Workspace,
]


class BaseEntityType(str, Enum):
    pass


class BlockEntityType(BaseEntityType):
    CALLBACK = BlockType.CALLBACK.value
    CONDITIONAL = BlockType.CONDITIONAL.value
    CHART = BlockType.CHART.value
    CUSTOM = BlockType.CUSTOM.value
    DATA_EXPORTER = BlockType.DATA_EXPORTER.value
    DATA_LOADER = BlockType.DATA_LOADER.value
    DBT = BlockType.DBT.value
    EXTENSION = BlockType.EXTENSION.value
    GLOBAL_DATA_PRODUCT = BlockType.GLOBAL_DATA_PRODUCT.value
    MARKDOWN = BlockType.MARKDOWN.value
    SCRATCHPAD = BlockType.SCRATCHPAD.value
    SENSOR = BlockType.SENSOR.value
    TRANSFORMER = BlockType.TRANSFORMER.value


class PipelineEntityType(BaseEntityType):
    INTEGRATION = PipelineType.INTEGRATION.value
    DATABRICKS = PipelineType.DATABRICKS.value
    PYTHON = PipelineType.PYTHON.value
    PYSPARK = PipelineType.PYSPARK.value
    STREAMING = PipelineType.STREAMING.value


class PermissionAccess(int, Enum):
    OWNER = 1
    ADMIN = 2
    # Editor: list, detail, create, update, delete
    EDITOR = 4
    # Viewer: list, detail
    VIEWER = 8
    LIST = 16
    DETAIL = 32
    CREATE = 64
    UPDATE = 128
    DELETE = 512
    OPERATION_ALL = 1024
    QUERY = 2048
    QUERY_ALL = 4096
    READ = 8192
    READ_ALL = 16384
    WRITE = 32768
    WRITE_ALL = 65536
    ALL = 131072
    DISABLE_LIST = 262144
    DISABLE_DETAIL = 524288
    DISABLE_CREATE = 1048576
    DISABLE_UPDATE = 2097152
    DISABLE_DELETE = 4194304
    DISABLE_OPERATION_ALL = 8388608
    DISABLE_QUERY = 16777216
    DISABLE_QUERY_ALL = 33554432
    DISABLE_READ = 67108864
    DISABLE_READ_ALL = 134217728
    DISABLE_WRITE = 268435456
    DISABLE_WRITE_ALL = 536870912
    DISABLE_ALL = 1073741824


ACCESS_FOR_VIEWER = [
    PermissionAccess.DETAIL,
    PermissionAccess.LIST,
    PermissionAccess.READ,
    PermissionAccess.VIEWER,
]
ACCESS_FOR_EDITOR = ACCESS_FOR_VIEWER + [
    PermissionAccess.CREATE,
    PermissionAccess.DELETE,
    PermissionAccess.EDITOR,
    PermissionAccess.QUERY,
    PermissionAccess.UPDATE,
    PermissionAccess.WRITE,
]
ACCESS_FOR_ADMIN = ACCESS_FOR_VIEWER + ACCESS_FOR_EDITOR + [
    PermissionAccess.ADMIN,
]
ACCESS_FOR_OWNER = ACCESS_FOR_ADMIN + [
    PermissionAccess.OWNER,
]

PERMISSION_ACCESS_WITH_MULTIPLE_ACCESS = {
    f'{PermissionAccess.ADMIN}': ACCESS_FOR_ADMIN,
    f'{PermissionAccess.EDITOR}': ACCESS_FOR_EDITOR,
    f'{PermissionAccess.OWNER}': ACCESS_FOR_OWNER,
    f'{PermissionAccess.VIEWER}': ACCESS_FOR_VIEWER,
}
