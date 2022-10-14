from datetime import datetime
from utils.logger.constants import LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION, LOG_LEVEL_INFO
from utils.parsers import encode_complex
import simplejson


class Logger():
    def __init__(self, caller=None, logger=None, verbose: int = 1):
        self.caller = caller
        self.logger = logger
        self.verbose = verbose

    def build_tags(self, **kwargs):
        return {k: v for k, v in kwargs.items() if v}

    def error(self, message, tags={}, **kwargs):
        self.__log(LOG_LEVEL_ERROR, message, tags, **kwargs)

    def exception(self, message, tags={}, **kwargs):
        self.__log(LOG_LEVEL_EXCEPTION, message, tags, **kwargs)

    def info(self, message, tags={}, **kwargs):
        self.__log(LOG_LEVEL_INFO, message, tags, **kwargs)

    def __log(self, level, message, tags, **kwargs) -> None:
        if self.verbose == 0:
            return

        timestamp = datetime.utcnow().isoformat()
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
            timestamp=timestamp,
        )
        data.update(kwargs)

        if self.logger:
            # log
            # warn
            method = None
            if LOG_LEVEL_ERROR == level:
                method = 'error'
            elif LOG_LEVEL_EXCEPTION == level:
                method = 'exception'
            elif LOG_LEVEL_INFO == level:
                method = 'info'

            json_string = simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
            )
            getattr(self.logger, method)(f'[{timestamp}] {json_string}')
        else:
            print(simplejson.dumps(
                data,
                default=encode_complex,
                ignore_nan=True,
                # indent=2,
            ))
