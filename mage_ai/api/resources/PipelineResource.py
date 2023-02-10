from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db.models import PipelineSchedule
from mage_ai.orchestration.db import safe_db_query
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.server.active_kernel import switch_active_kernel
from mage_ai.server.kernels import PIPELINE_TO_KERNEL_NAME


class PipelineResource(GenericResource):
    @classmethod
    async def member(self, pk, user, **kwargs):
        pipeline = await Pipeline.get_async(pk)

        switch_active_kernel(PIPELINE_TO_KERNEL_NAME[pipeline.type])

        return self(pipeline, user, **kwargs)

    def delete(self, **kwargs):
        return self.model.delete()

    async def update(self, payload, **kwargs):
        query = kwargs.get('query', {})
        update_content = query.get('update_content', [False])
        if update_content:
            update_content = update_content[0]

        await self.model.update(payload, update_content=update_content)
        switch_active_kernel(PIPELINE_TO_KERNEL_NAME[self.model.type])

        @safe_db_query
        def update_schedule_status(status, pipeline_uuid):
            schedules = (
                PipelineSchedule.
                query.
                filter(PipelineSchedule.pipeline_uuid == pipeline_uuid)
            ).all()
            for schedule in schedules:
                schedule.update(status=status)

        status = payload.get('status')

        def _update_callback(resource):
            if status and status in [
                PipelineSchedule.ScheduleStatus.ACTIVE.value,
                PipelineSchedule.ScheduleStatus.INACTIVE.value,
            ]:
                update_schedule_status(status, resource.uuid)

        self.on_update_callback = _update_callback

        return self
