from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db.models import BlockRun


class OutputResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        parent_model = kwargs['parent_model']

        outputs = []
        if type(parent_model) is BlockRun:
            outputs = parent_model.get_outputs()

        return self.build_result_set(
            outputs,
            user,
            **kwargs,
        )
