from enum import Enum

from mage_ai.data_preparation.models.constants import BlockType, PipelineType


class EntityName(str, Enum):
    ALL = 'ALL'
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
