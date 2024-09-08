try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover


class ComputeConnectionActionUUID(StrEnum):
    CREATE = 'CREATE'
    DELETE = 'DELETE'
    DESELECT = 'DESELECT'
    UPDATE = 'UPDATE'


class ComputeConnectionState(StrEnum):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    PENDING = 'PENDING'


class ComputeManagementApplicationTab(StrEnum):
    CLUSTERS = 'clusters'
    CONNECTION = 'connection'
    MONITORING = 'monitoring'
    RESOURCES = 'resources'
    SETUP = 'setup'
    SYSTEM = 'system'


CUSTOM_TCP_PORT = 8998
SSH_PORT = 22
