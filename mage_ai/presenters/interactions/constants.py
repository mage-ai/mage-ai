from enum import Enum

INTERACTIONS_DIRECTORY_NAME = 'interactions'


class InteractionInputType(str, Enum):
    CHECKBOX = 'checkbox'
    CODE = 'code'
    DROPDOWN_MENU = 'dropdown_menu'
    SWITCH = 'switch'
    TEXT_FIELD = 'text_field'


class InteractionInputStyleInputType(str, Enum):
    NUMBER = 'number'


class InteractionVariableType(str, Enum):
    BOOLEAN = 'boolean'
    DATE = 'date'
    DATETIME = 'datetime'
    DICTIONARY = 'dictionary'
    FLOAT = 'float'
    INTEGER = 'integer'
    LIST = 'list'
    STRING = 'string'
