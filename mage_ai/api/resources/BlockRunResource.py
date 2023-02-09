from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db.models import BlockRun


class BlockRunResource(DatabaseResource):
    model_class = BlockRun
