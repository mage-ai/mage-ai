from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db.models import BlockRun


class LogResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        parent_model = kwargs['parent_model']

        if type(parent_model) is BlockRun:
            arr = parent_model.logs

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )
