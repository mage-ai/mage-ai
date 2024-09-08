try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

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
