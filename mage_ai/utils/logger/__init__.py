from datetime import datetime
from mage_ai.utils.logger.constants import (
    LOG_LEVEL_DEBUG,
    LOG_LEVEL_ERROR,
    LOG_LEVEL_EXCEPTION,
    LOG_LEVEL_INFO,
    TYPE_LOG,
)
from mage_ai.shared.parsers import encode_complex
from typing import Any
import simplejson
import sys
import uuid


class Logger():
    def __init__(
        self,
        caller: Any = None,
        log_to_stdout: bool = False,
        logger: Any = None,
        verbose: int = 1,
    ):
        self.caller = caller
        self.log_to_stdout = log_to_stdout
        self.logger = logger
        self.verbose = verbose

    def build_tags(self, **kwargs):
        return {k: v for k, v in kwargs.items() if v}

    def debug(self, message, tags={}, **kwargs):
        self.__log(LOG_LEVEL_DEBUG, message, tags, **kwargs)

    def error(self, message, tags={}, **kwargs):
        self.__log(LOG_LEVEL_ERROR, message, tags, **kwargs)

    def exception(self, message, tags={}, **kwargs):
        self.__log(LOG_LEVEL_EXCEPTION, message, tags, **kwargs)

    def info(self, message, tags={}, **kwargs):
        self.__log(LOG_LEVEL_INFO, message, tags, **kwargs)

    def __log(self, level, message, tags, **kwargs) -> None:
        if self.verbose == 0:
            return

        now = datetime.utcnow()
        if self.caller:
            if type(self.caller) is str:
                caller_string = self.caller
            else:
                caller_string = self.caller.__class__.__name__
        else:
            caller_string = self.__class__.__name__

        data = dict(
            caller=caller_string,
            level=level,
            message=message,
            tags=tags,
            timestamp=int(now.timestamp()),
            uuid=uuid.uuid4().hex,
        )
        data.update(kwargs)
        data.update(type=TYPE_LOG)

        json_string = simplejson.dumps(
            data,
            default=encode_complex,
            ignore_nan=True,
        )

        if self.log_to_stdout:
            sys.stdout.write(f'{json_string}\n')
            sys.stdout.flush()
        elif self.logger:
            # log
            # warn
            method = None
            if LOG_LEVEL_ERROR == level:
                method = 'error'
            elif LOG_LEVEL_EXCEPTION == level:
                method = 'exception'
            elif LOG_LEVEL_INFO == level:
                method = 'info'

            getattr(self.logger, method)(f'[{now.isoformat()}] {json_string}')
        else:
            print(json_string)
