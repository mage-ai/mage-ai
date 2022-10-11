from connections.constants import LOG_LEVEL_ERROR, LOG_LEVEL_INFO
from datetime import datetime
import json


class Connection():
    def build_tags(self, **kwargs):
        return {k: v for k, v in kwargs.items() if v}

    def error(self, message, tags, **kwargs):
        self.log(LOG_LEVEL_ERROR, message, tags, **kwargs)

    def info(self, message, tags, **kwargs):
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

        print(json.dumps(data, indent=2))
