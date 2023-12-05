from mage_ai.errors.base import MageBaseException


class FileExistsError(MageBaseException):
    pass


class FileNotInProjectError(MageBaseException):
    pass


class SerializationError(MageBaseException):
    pass
