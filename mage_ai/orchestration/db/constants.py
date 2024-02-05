from enum import Enum


class DatabaseType(str, Enum):
    POSTGRESQL = 'postgresql'
    SQLITE = 'sqlite'
