from enum import Enum

SETTINGS_FILENAME = '.command_center.yaml'


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
    FORM = 'form'


class ButtonActionType(str, Enum):
    CANCEL = 'cancel'  # Go back out of the current application.
    EXECUTE = 'execute'  # Executes the actions associated to the application’s item.
    RESET_FORM = 'reset_form'  # If there is a form filled out, clear out all the values.
