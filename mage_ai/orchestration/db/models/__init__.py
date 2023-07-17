import enum


class Entity(str, enum.Enum):
    # Permissions saved to the DB should not have the "ANY" entity. It should only be used
    # when evaluating permissions.
    ANY = 'any'
    GLOBAL = 'global'
    PROJECT = 'project'
    PIPELINE = 'pipeline'
