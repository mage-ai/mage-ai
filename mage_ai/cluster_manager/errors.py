from mage_ai.errors.base import MageBaseException


class WorkspaceExistsError(MageBaseException):
    pass


class ConfigurationError(MageBaseException):
    pass
