from connections.constants import LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION, LOG_LEVEL_INFO
from datetime import datetime
from utils.parsers import encode_complex
import simplejson


class Connection():
    def build_tags(self, **kwargs):
        return {}

    def error(self, message, tags={}, **kwargs):
        self.log(LOG_LEVEL_ERROR, message, tags, **kwargs)


    def exception(self, message, tags={}, **kwargs):
        self.log(LOG_LEVEL_EXCEPTION, message, tags, **kwargs)

    def info(self, message, tags={}, **kwargs):
        self.log(LOG_LEVEL_INFO, message, tags, **kwargs)

    def log(self, level, message, tags, **kwargs):
        data = dict(
            caller=self.__class__.__name__,
            level=level,
            message=message,
            tags=tags,
            timestamp=datetime.utcnow().isoformat(),
        )
        data.update(kwargs)

        print(simplejson.dumps(
            data,
            default=encode_complex,
            ignore_nan=True,
            indent=2,
        ))
