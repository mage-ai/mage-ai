from datetime import datetime
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.hash import merge_dict
import logging
import simplejson
import traceback
import uuid


class DictLogger():
    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def critical(self, message, **kwargs):
        self.__send_message('critical', message, **kwargs)

    def debug(self, message, **kwargs):
        self.__send_message('debug', message, **kwargs)

    def error(self, message, **kwargs):
        self.__send_message('error', message, **kwargs)

    def exception(self, message, **kwargs):
        self.__send_message('exception', message, **kwargs)

    def info(self, message, **kwargs):
        self.__send_message('info', message, **kwargs)

    def log(self, log_level, message, **kwargs):
        self.__send_message('log', message, log_level=log_level, **kwargs)

    def warning(self, message, **kwargs):
        self.__send_message('warning', message, **kwargs)

    def __send_message(
        self,
        method_name,
        message,
        error=None,
        log_level=None,
        **kwargs,
    ):
        now = datetime.utcnow()
        data = dict(
            level=method_name.upper(),
            message=message,
            timestamp=int(now.timestamp()),
            uuid=uuid.uuid4().hex,
        )

        if error:
            data['error'] = traceback.format_exc(),
            data['error_stack'] = traceback.format_stack(),
            data['error_stacktrace'] = str(error),

        msg = simplejson.dumps(
            merge_dict(kwargs, data),
            default=encode_complex,
            ignore_nan=True,
        )

        if log_level is None:
            getattr(self.logger, method_name)(msg)
        else:
            getattr(self.logger, method_name)(log_level, msg)

    def __getattr__(self, method_name):
        if method_name not in [
            '__send_message',
            'critical',
            'debug',
            'error',
            'exception',
            'info',
            'log',
            'warning',
        ]:
            return getattr(self.logger, method_name)
        return getattr(self, method_name)
