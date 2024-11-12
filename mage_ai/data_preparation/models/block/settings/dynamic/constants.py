from mage_ai.shared.enum import StrEnum

DEFAULT_STREAM_POLL_INTERVAL = 15


class ModeType(StrEnum):
    DEFAULT = 'default'
    STREAM = 'stream'
