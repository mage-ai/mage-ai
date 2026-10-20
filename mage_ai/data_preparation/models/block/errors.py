from mage_ai.errors.base import MageBaseException


class NoMultipleDynamicUpstreamBlocks(MageBaseException):
    pass


class HasDownstreamDependencies(MageBaseException):
    pass
