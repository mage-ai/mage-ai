from mage_ai.errors.base import MageBaseException


class FileExistsError(MageBaseException):
    pass


class FileNotInProjectError(MageBaseException):
    pass


class FileWriteError(MageBaseException):
    pass


class SerializationError(MageBaseException):
    pass


class PipelineZipTooLargeError(MageBaseException):
    pass


class InvalidPipelineZipError(MageBaseException):
    pass
