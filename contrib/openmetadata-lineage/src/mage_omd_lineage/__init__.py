"""Publish Mage pipeline lineage into OpenMetadata."""

__version__ = "0.1.0"

from .adapters import lineage_emit

__all__ = ["lineage_emit", "__version__"]
