from mage_ai.errors.base import MageBaseException
from typing import Dict


class DoesNotExistError(MageBaseException):
    pass


class ValidationError(MageBaseException):
    def __init__(self, error: str, metadata: Dict):
        self.error = error
        self.metadata = metadata

    def to_dict(self):
        return dict(
            error=self.error,
            metadata=self.metadata,
        )
