from typing import Dict

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.services.search.constants import SEARCH_TYPE_BLOCK_ACTION_OBJECTS


def filter_results(result: Dict) -> bool:
    block_action_object = result.get('block_action_object')
    object_type = result.get('object_type')

    block_type = None
    language = None

    if OBJECT_TYPE_BLOCK_FILE == object_type:
        block_type = block_action_object.get('type')
        language = block_action_object.get('language')
    elif OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE == object_type:
        block_type = block_action_object.get('block_type')
        language = block_action_object.get('language')
    elif OBJECT_TYPE_MAGE_TEMPLATE == object_type:
        block_type = block_action_object.get('block_type')
        language = block_action_object.get('language')

    if BlockLanguage.YAML == language and \
            BlockType.DBT != block_type and \
            not Project().is_feature_enabled(
                FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE,
            ):

        return False

    if block_type in [
        BlockType.CALLBACK,
        BlockType.CHART,
        BlockType.CONDITIONAL,
        BlockType.EXTENSION,
    ]:
        return False

    return True


class SearchResultResource(GenericResource):
    @classmethod
    async def create(self, payload: Dict, user, **kwargs):
        pipeline_type = payload.get('pipeline_type', None)
        query = payload.get('query', None)
        ratio = payload.get('ratio', None)
        search_type = payload.get('type', None)

        results = []

        if query:
            if SEARCH_TYPE_BLOCK_ACTION_OBJECTS == search_type:
                from mage_ai.services.search.block_action_objects import search

                results = await search(query, ratio=ratio)

                # TODO (tommy dangerous): remove this when we unify pipeline types
                if PipelineType.PYTHON == pipeline_type:
                    results = list(filter(filter_results, results))

                results = results[:12]

        return self(dict(
            results=results,
            type=search_type,
            uuid=query,
        ), user, **kwargs)
