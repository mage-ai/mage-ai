from dataclasses import dataclass
from typing import List, Optional

from mage_ai.errors.constants import ErrorCode
from mage_ai.errors.utils import serialize_error
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
        data = serialize_error(error)

        if is_debug():
            tb_str = ''.join(data.get('stacktrace_formatted', []))
            print(f'Exception type: {data["type"]}')
            print(f'Exception message: {data["message"]}')
            print('Filtered stack trace:')
            print(tb_str)

        return cls.load(
            code=ErrorCode.CODE_500,
            errors=data.get('stacktrace_formatted'),
            message=data.get('message_formatted'),
            type=data.get('type'),
        )
