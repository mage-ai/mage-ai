from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    Backfill,
    PipelineRun,
    PipelineSchedule,
)


@safe_db_query
def transfer_related_models_for_pipeline(old_uuid: str, new_uuid: str):
    # Migrate pipeline schedules
    PipelineSchedule.query.filter(PipelineSchedule.pipeline_uuid == old_uuid).update({
        PipelineSchedule.pipeline_uuid: new_uuid
    }, synchronize_session=False)
    # Migrate pipeline runs (block runs have foreign key ref to PipelineRun id)
    PipelineRun.query.filter(PipelineRun.pipeline_uuid == old_uuid).update({
        PipelineRun.pipeline_uuid: new_uuid
    }, synchronize_session=False)
    # Migrate backfills
    Backfill.query.filter(Backfill.pipeline_uuid == old_uuid).update({
        Backfill.pipeline_uuid: new_uuid
    }, synchronize_session=False)
    db_connection.session.commit()
