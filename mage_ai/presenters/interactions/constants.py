from mage_ai.shared.enum import StrEnum

INTERACTIONS_DIRECTORY_NAME = 'interactions'


class InteractionInputType(StrEnum):
    CHECKBOX = 'checkbox'
    CODE = 'code'
    DROPDOWN_MENU = 'dropdown_menu'
    SWITCH = 'switch'
    TEXT_FIELD = 'text_field'


class InteractionInputStyleInputType(StrEnum):
    NUMBER = 'number'


class InteractionVariableType(StrEnum):
    BOOLEAN = 'boolean'
    DATE = 'date'
    DATETIME = 'datetime'
    DICTIONARY = 'dictionary'
    FLOAT = 'float'
    INTEGER = 'integer'
    LIST = 'list'
    STRING = 'string'
