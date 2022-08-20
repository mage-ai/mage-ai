from mage_ai.orchestration.db.models import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler


def schedule():
    """
    1. Check whether any new pipeline runs need to be scheduled.
    2. In active pipeline runs, check whether any block runs need to be scheduled.
    """
    active_pipeline_schedules = PipelineSchedule.active_schedules()

    for pipeline_schedule in active_pipeline_schedules:
        if pipeline_schedule.should_schedule():
            payload = dict(
                execution_date=pipeline_schedule.current_execution_date(),
                pipeline_schedule_id=pipeline_schedule.id,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
            )
            pipeline_run = PipelineRun.create(**payload)
            PipelineScheduler(pipeline_run).start(should_schedule=False)
    active_pipeline_runs = PipelineRun.active_runs()
    for r in active_pipeline_runs:
        PipelineScheduler(r).schedule()
