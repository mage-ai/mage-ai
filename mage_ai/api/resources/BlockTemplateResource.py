from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.templates.constants import (
    TEMPLATES,
    TEMPLATES_BY_UUID,
    TEMPLATES_ONLY_FOR_V2,
)
from mage_ai.data_preparation.templates.data_integrations.utils import get_templates
from mage_ai.orchestration.db import safe_db_query


class BlockTemplateResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        show_all = query.get('show_all', [None])
        if show_all:
            show_all = show_all[0]

        arr = TEMPLATES.copy()

        if show_all:
            arr += TEMPLATES_ONLY_FOR_V2.copy()

            if Project().is_feature_enabled(FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE):
                arr += get_templates()

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        model = TEMPLATES_BY_UUID.get(pk)
        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(model, user, **kwargs)
