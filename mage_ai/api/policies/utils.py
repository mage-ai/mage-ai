from mage_ai.data_preparation.models.pipelines.interactions import PipelineInteractions
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID


async def validate_pipeline_interactions_permissions(policy) -> bool:
    pipeline = policy.parent_model()
    if not pipeline:
        pipeline = policy.resource.pipeline

    if Project(pipeline.repo_config).is_feature_enabled(FeatureUUID.INTERACTIONS):
        return await PipelineInteractions(pipeline).filter_for_permissions(policy.current_user)

    return False
