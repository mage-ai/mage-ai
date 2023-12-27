from enum import Enum

SETTINGS_FILENAME = '.command_center.yaml'


class CommandCenterItemType(str, Enum):
    ACTION = 'action'
    APPLICATION = 'application'
    BLOCK = 'block'
    FILE = 'file'
    PIPELINE = 'pipeline'
    SUPPORT = 'support'
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
