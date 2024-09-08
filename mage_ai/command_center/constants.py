from mage_ai.shared.enum import StrEnum

SETTINGS_FILENAME = '.command_center.yaml'


class ItemTagEnum(StrEnum):
    PINNED = 'pinned'
    RECENT = 'recent'


class ItemType(StrEnum):
    ACTION = 'action'  # Cast spell
    CREATE = 'create'  # Conjure
    DELETE = 'delete'
    DETAIL = 'detail'  # Enchant
    LIST = 'list'  # Enchant
    MODE_ACTIVATION = 'mode_activation'
    MODE_DEACTIVATION = 'mode_deactivation'
    NAVIGATE = 'navigate'  # Teleport
    OPEN = 'open'  # Summon - open shows a view on the same page vs navigating to another page
    SUPPORT = 'support'  # Reinforcements
    UPDATE = 'update'


class ObjectType(StrEnum):
    APPLICATION = 'application'
    APPLICATION_EXPANSION = 'application_expansion'
    AUTHENTICATION = 'authentication'
    BLOCK = 'block'
    BRANCH = 'branch'
    CHAT = 'chat'
    CODE = 'code'
    DOCUMENT = 'document'
    FILE = 'file'
    FOLDER = 'folder'
    PIPELINE = 'pipeline'
    PIPELINE_RUN = 'pipeline_run'
    PROJECT = 'project'
    REMOTE = 'remote'
    TERMINAL = 'terminal'
    TRIGGER = 'trigger'
    VERSION_CONTROL_FILE = 'version_control_file'


class ModeType(StrEnum):
    VERSION_CONTROL = 'version_control'


class FileExtension(StrEnum):
    CSV = 'csv'
    JSON = 'json'
    MD = 'md'
    PY = 'py'
    R = 'r'
    SH = 'sh'
    SQL = 'sql'
    TXT = 'txt'
    YAML = 'yaml'
    YML = 'yml'


class ButtonActionType(StrEnum):
    ADD_APPLICATION = 'add_application'
    CLOSE_APPLICATION = 'close_application'  # Go back out of the current application.
    CLOSE_COMMAND_CENTER = 'close_command_center'
    CUSTOM_ACTIONS = 'custom_actions'
    EXECUTE = 'execute'  # Executes the actions associated to the application’s item.
    REPLACE_APPLICATION = 'replace_application'
    RESET_FORM = 'reset_form'  # If there is a form filled out, clear out all the values.
    SELECT_ITEM_FROM_REQUEST = 'select_item_from_request'


class InteractionType(StrEnum):
    CLICK = 'click'
    CLOSE_APPLICATION = ButtonActionType.CLOSE_APPLICATION.value
    CLOSE_COMMAND_CENTER = ButtonActionType.CLOSE_COMMAND_CENTER.value
    FETCH_ITEMS = 'fetch_items'
    OPEN_FILE = 'open_file'
    RESET_FORM = ButtonActionType.RESET_FORM.value
    SCROLL = 'scroll'
    SELECT_ITEM = 'select_item'


class ApplicationType(StrEnum):
    DETAIL = 'detail'
    DETAIL_LIST = 'detail_list'
    EXPANSION = 'expansion'
    FORM = 'form'
    LIST = 'list'


class ValidationType(StrEnum):
    CONFIRMATION = 'confirmation'
    CUSTOM_VALIDATION_PARSERS = 'custom_validation_parsers'


class RenderLocationType(StrEnum):
    ITEMS_CONTAINER_AFTER = 'items_container_after'


class ApplicationExpansionUUID(StrEnum):
    ArcaneLibrary = 'ArcaneLibrary'
    PortalTerminal = 'PortalTerminal'
    VersionControlFileDiffs = 'VersionControlFileDiffs'


class ApplicationExpansionStatus(StrEnum):
    ACTIVE = 'ACTIVE'
    CLOSED = 'CLOSED'
    INACTIVE = 'INACTIVE'
    MINIMIZED = 'MINIMIZED'
    OPEN = 'OPEN'
