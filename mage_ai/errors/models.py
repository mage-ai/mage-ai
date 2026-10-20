import sys
import traceback
from dataclasses import dataclass
from typing import List, Optional

from mage_ai.errors.constants import ErrorCode
from mage_ai.shared.environments import is_debug
from mage_ai.shared.models import BaseDataClass


@dataclass
class ErrorDetails(BaseDataClass):
    code: Optional[int] = None
    errors: Optional[List[str]] = None
    message: Optional[str] = None
    type: Optional[str] = None

    @classmethod
    def from_current_error(cls, error: Exception):
        exc_type, exc_value, exc_tb = sys.exc_info()
        errors = traceback.format_exception(exc_type, exc_value, exc_tb)

        if is_debug():
            exc_type, exc_value, exc_tb = sys.exc_info()
            tb_str = ''.join(traceback.format_exception(exc_type, exc_value, exc_tb))
            print(f'Exception type: {exc_type.__name__ if exc_type else None}')
            print(f'Exception message: {exc_value}')
            print('Stack trace:')
            print(tb_str)

        return cls.load(
            code=ErrorCode.CODE_500,
            errors=errors,
            message=str(error),
            type=exc_type.__name__ if exc_type else None,
        )
