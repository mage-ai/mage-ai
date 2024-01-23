from enum import Enum


class ProjectType(str, Enum):
    MAIN = 'main'
    SUB = 'sub'
    STANDALONE = 'standalone'
