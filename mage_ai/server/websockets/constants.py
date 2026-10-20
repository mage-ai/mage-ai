from mage_ai.shared.enum import StrEnum


class Channel(StrEnum):
    TERMINAL = 'TERMINAL'


class ExecutionState(StrEnum):
    IDLE = 'idle'


class MessageType(StrEnum):
    DISPLAY_DATA = 'display_data'
