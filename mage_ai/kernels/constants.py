from mage_ai.shared.models import BaseEnum


class KernelOperation(BaseEnum):
    INTERRUPT = 'interrupt'
    RESTART = 'restart'
    TERMINATE = 'terminate'


class ProcessStatus(BaseEnum):
    ALIVE = 'alive'
    BUSY = 'busy'
    DEAD = 'dead'
    IDLE = 'idle'
    UNKNOWN = 'unknown'
