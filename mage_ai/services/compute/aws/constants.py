try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'


class ClusterStatusState(StrEnum):
    BOOTSTRAPPING = 'BOOTSTRAPPING'
    RUNNING = 'RUNNING'
    STARTING = 'STARTING'
    TERMINATED = 'TERMINATED'
    TERMINATED_WITH_ERRORS = 'TERMINATED_WITH_ERRORS'
    TERMINATING = 'TERMINATING'
    WAITING = 'WAITING'


INVALID_STATES = [
    ClusterStatusState.TERMINATED,
    ClusterStatusState.TERMINATED_WITH_ERRORS,
    ClusterStatusState.TERMINATING,
]
