from mage_integrations.utils.enum import StrEnum


class PredicateOperator(StrEnum):
    EQUALS = 'EQUALS'
    GREATER_THAN = 'GREATER_THAN'
    GREATER_THAN_OR_EQUALS = 'GREATER_THAN_OR_EQUALS'
    LESS_THAN = 'LESS_THAN'
    LESS_THAN_OR_EQUALS = 'LESS_THAN_OR_EQUALS'
    NOT_EQUALS = 'NOT_EQUALS'
