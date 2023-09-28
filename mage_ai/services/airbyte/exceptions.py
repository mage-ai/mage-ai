class ConnectionDeprecated(Exception):
    pass


class ConnectionInactive(Exception):
    pass


class ConnectionNotFound(Exception):
    pass


class JobNotFound(Exception):
    pass


class SyncJobFailed(Exception):
    pass


class UnhealthyServer(Exception):
    pass
