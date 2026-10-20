from mage_ai.orchestration.db import db_connection, safe_db_query


@safe_db_query
def transfer_related_models_for_pipeline(old_uuid: str, new_uuid: str):
    from mage_ai.orchestration.db.models.schedules import (
        Backfill,
        PipelineRun,
        PipelineSchedule,
    )

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


@safe_db_query
def get_active_project_for_user(user, root_project_uuid: str) -> str:
    from mage_ai.orchestration.db.models.projects import UserProject
    return UserProject.query.filter(
        UserProject.user_id == user.id,
        UserProject.root_project_uuid == root_project_uuid,
        UserProject.active.is_(True),
    ).one_or_none()


@safe_db_query
def activate_project_for_user(user, root_project_uuid: str, project_name: str):
    from mage_ai.orchestration.db.models.projects import UserProject
    projects = UserProject.query.filter(
        UserProject.user_id == user.id,
        UserProject.root_project_uuid == root_project_uuid,
    )

    projects.update({
        UserProject.active: False
    }, synchronize_session=False)

    project_updated = False
    for project in projects:
        if project.project_name == project_name:
            project.update(active=True, commit=False)
            project_updated = True

    if not project_updated:
        UserProject.create(
            user_id=user.id,
            root_project_uuid=root_project_uuid,
            project_name=project_name,
            active=True,
            commit=False,
        )

    db_connection.session.commit()
