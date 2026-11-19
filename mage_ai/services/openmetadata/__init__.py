"""OpenMetadata integration.

Enables Mage pipelines to publish their table and column lineage into an
OpenMetadata catalog after a successful run.
"""

from mage_ai.services.openmetadata.lineage.service import (
    emit_pipeline_lineage,
    initialize_openmetadata,
)

__all__ = ['emit_pipeline_lineage', 'initialize_openmetadata']
