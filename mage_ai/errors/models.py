from dataclasses import dataclass
from typing import Any, List, Optional

from mage_ai.errors.utils import serialize_error
from mage_ai.shared.models import BaseDataClass


@dataclass
class ErrorDetails(BaseDataClass):
    code: Optional[str] = None
    code_context: Optional[List[str]] = None
    code_context_formatted: Optional[List[str]] = None
    error: Optional[Any] = None
    errors: Optional[List[Any]] = None
    exception: Optional[str] = None
    line_number: Optional[int] = None
    message: Optional[str] = None
    message_formatted: Optional[str] = None
    stacktrace: Optional[List[str]] = None
    stacktrace_formatted: Optional[str] = None
    type: Optional[str] = None

    @classmethod
    def from_current_error(cls, error: Exception, code: Optional[str] = None):
        data = serialize_error(error, code)

        model = cls.load(**data)
        if model.error:
            model.error = str(model.error)

        return model
