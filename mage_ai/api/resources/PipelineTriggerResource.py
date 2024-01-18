from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.triggers import (
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
    get_triggers_by_pipeline,
)
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineSchedule


class PipelineTriggerResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        parent_model = kwargs['parent_model']

        return self.build_result_set(
            get_triggers_by_pipeline(parent_model.uuid),
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        parent_model = kwargs['parent_model']
        error = ApiError.RESOURCE_INVALID

        pipeline_schedule_id = payload.get('pipeline_schedule_id')
        trigger_name = payload.get('name')
        if not pipeline_schedule_id and not trigger_name:
            error.update(dict(message='Pipeline schedule ID or trigger name is required.'))
            raise ApiError(error)

        trigger = None
        if pipeline_schedule_id:
            pipeline_schedule = PipelineSchedule.query.get(pipeline_schedule_id)
            trigger = Trigger(
                last_enabled_at=pipeline_schedule.last_enabled_at,
                name=pipeline_schedule.name,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
                schedule_interval=pipeline_schedule.schedule_interval,
                schedule_type=pipeline_schedule.schedule_type,
                settings=pipeline_schedule.settings,
                sla=pipeline_schedule.sla,
                start_time=pipeline_schedule.start_time,
                status=pipeline_schedule.status,
                variables=pipeline_schedule.variables,
            )
        else:
            trigger = Trigger(**payload)

        if not trigger:
            error.update(dict(message='Trigger failed to save or update.'))
            raise ApiError(error)

        add_or_update_trigger_for_pipeline_and_persist(trigger, parent_model.uuid)

        return self(trigger, user, **kwargs)
