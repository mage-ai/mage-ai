from typing import Dict
import logging
import sys


class StreamToLogger(object):
    """
    Fake file-like stream object that redirects writes to a logger instance.
    """
    def __init__(self, logger, log_level=logging.INFO, logging_tags: Dict = dict()):
        self.logger = logger
        self.log_level = log_level
        self.logging_tags = logging_tags or dict()
        self.linebuf = ''
        self.terminal = sys.stdout

    def __getattr__(self, attr):
        return getattr(self.terminal, attr)

    def write(self, buf):
        for line in buf.rstrip().splitlines():
            self.logger.log(self.log_level, line.rstrip(), **self.logging_tags)

    def flush(self):
        pass
