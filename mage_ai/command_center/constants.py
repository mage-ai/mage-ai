from enum import Enum

SETTINGS_FILENAME = '.command_center.yaml'


class ItemTagEnum(str, Enum):
    PINNED = 'pinned'
    RECENT = 'recent'


class ItemType(str, Enum):
    ACTION = 'action'  # Cast spell
    CREATE = 'create'  # Conjure
    DETAIL = 'detail'  # Enchant
    LIST = 'list'  # Enchant
    NAVIGATE = 'navigate'  # Teleport
    OPEN = 'open'  # Summon - open shows a view on the same page vs navigating to another page
    SUPPORT = 'support'  # Reinforcements


class ObjectType(str, Enum):
    APPLICATION = 'application'
    BLOCK = 'block'
    CHAT = 'chat'
    CODE = 'code'
    DOCUMENT = 'document'
    FILE = 'file'
    FOLDER = 'folder'
    GIT = 'git'
    PIPELINE = 'pipeline'
    PIPELINE_RUN = 'pipeline_run'
    TRIGGER = 'trigger'


class FileExtension(str, Enum):
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


class InteractionType(str, Enum):
    CLICK = 'click'
    OPEN_FILE = 'open_file'
    SCROLL = 'scroll'


class ApplicationType(str, Enum):
    DETAIL = 'detail'
    DETAIL_LIST = 'detail_list'
    FORM = 'form'


class ButtonActionType(str, Enum):
    ADD_APPLICATION = 'add_application'
    CLOSE_APPLICATION = 'close_application'  # Go back out of the current application.
    CUSTOM_ACTIONS = 'custom_actions'
    EXECUTE = 'execute'  # Executes the actions associated to the application’s item.
    REPLACE_APPLICATION = 'replace_application'
    RESET_FORM = 'reset_form'  # If there is a form filled out, clear out all the values.
