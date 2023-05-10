from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.orchestration.db import safe_db_query


class BlockOutputResource(GenericResource):
    """
    Resource to fetch block output for the notebook. Created to support legacy
    endpoint /api/pipelines/<pipeline_uuid>/blocks/<block_uuid>/outputs
    """
    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        pipeline_uuid = payload.get('pipeline_uuid')
        block_uuid = payload.get('block_uuid')

        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        error = ApiError.RESOURCE_ERROR.copy()
        if block is None:
            error.update(message=f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
            raise ApiError(error)
        # Only fetch dataframe variables by default
        outputs = block.get_outputs(
            include_print_outputs=False,
            sample_count=None,
            variable_type=VariableType.DATAFRAME,
        )

        return self(dict(outputs=outputs), user, **kwargs)
