from typing import List

from mage_ai.errors.base import MageBaseException


class DbtBlockRunError(MageBaseException):
    """Raised when a dbt block run or test fails, with details about failed models/tests."""

    def __init__(
        self,
        message: str,
        failed_models: List[str] = None,
        failed_tests: List[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.failed_models = failed_models or []
        self.failed_tests = failed_tests or []
