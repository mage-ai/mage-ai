from mage_ai.shared.enum import StrEnum


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
