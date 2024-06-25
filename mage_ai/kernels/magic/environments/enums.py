from mage_ai.shared.models import BaseEnum


class EnvironmentType(BaseEnum):
    CODE = 'code'
    PIPELINE = 'pipeline'


class EnvironmentUUID(BaseEnum):
    EXECUTION = 'execution'
