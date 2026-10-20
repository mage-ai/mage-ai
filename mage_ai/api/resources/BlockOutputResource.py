from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_repo_path


class BlockOutputResource(GenericResource):
    """
    Resource to fetch block output for the notebook. Created to support legacy
    endpoint /api/pipelines/<pipeline_uuid>/blocks/<block_uuid>/outputs
    """

    @classmethod
    @safe_db_query
    def member(cls, pk, user, **kwargs):
        query = kwargs.get('query', {})
        block_uuid = pk

        pipeline_uuid = query.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]

        outputs_query = {}
        for key in [
            'block_uuid',
            'csv_lines_only',
            'dynamic_block_index',
            'exclude_blank_variable_uuids',
            'execution_partition',
            'include_print_outputs',
            'sample',
            'sample_count',
            'variable_type',
        ]:
            value = query.get(key, [None])
            if value is not None:
                value = value[0]
                if value is not None:
                    outputs_query[key] = value

        for key, value in [
            ('exclude_blank_variable_uuids', True),
            ('include_print_outputs', False),
            ('sample_count', DATAFRAME_SAMPLE_COUNT),
            ('variable_type', VariableType.DATAFRAME),
        ]:
            if key not in outputs_query:
                outputs_query[key] = value

        outputs = []
        if pipeline_uuid is not None:
            repo_path = get_repo_path(user=user)
            pipeline = Pipeline.get(pipeline_uuid, repo_path=repo_path)
            block = pipeline.get_block(block_uuid)

            error = ApiError.RESOURCE_ERROR.copy()
            if block is None:
                error.update(
                    message=f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}'
                )
                raise ApiError(error)

            # Only fetch dataframe variables by default
            outputs = block.get_outputs(
                **outputs_query,
            )

        return cls(dict(outputs=outputs), user, **kwargs)
