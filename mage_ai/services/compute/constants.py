from enum import Enum


class ComputeConnectionActionUUID(str, Enum):
    CREATE = 'CREATE'
    DELETE = 'DELETE'
    DESELECT = 'DESELECT'
    UPDATE = 'UPDATE'


class ComputeConnectionState(str, Enum):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    PENDING = 'PENDING'


class ComputeManagementApplicationTab(str, Enum):
    CLUSTERS = 'clusters'
    CONNECTION = 'connection'
    MONITORING = 'monitoring'
    RESOURCES = 'resources'
    SETUP = 'setup'
    SYSTEM = 'system'


CUSTOM_TCP_PORT = 8998
SSH_PORT = 22
