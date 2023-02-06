from datetime import datetime, timedelta
from mage_ai.orchestration.db.models import Backfill, PipelineRun, PipelineSchedule
from mage_ai.shared.hash import merge_dict
from typing import Dict, List
import dateutil.parser


def start_backfill(backfill: Backfill) -> List[PipelineRun]:
    pipeline_runs = []
    variables_list = __build_variables_list(backfill)

    if len(variables_list) == 0:
        return []

    backfill_variables = backfill.variables

    pipeline_schedule = backfill.pipeline_schedule
    if not pipeline_schedule:
        pipeline_schedule = PipelineSchedule.create(
            name=f'Backfill {backfill.name}',
            pipeline_uuid=backfill.pipeline_uuid,
            schedule_interval=PipelineSchedule.ScheduleInterval.ONCE,
            start_time=datetime.utcnow(),
            variables=backfill_variables,
        )

    for backfill_run_variables in variables_list:
        execution_date = None
        if 'execution_date' in backfill_run_variables:
            execution_date = dateutil.parser.parse(backfill_run_variables['execution_date'])
        pipeline_run = PipelineRun.create(
            backfill_id=backfill.id,
            execution_date=execution_date,
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=backfill.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.RUNNING,
            variables=merge_dict(backfill_variables or {}, backfill_run_variables),
        )
        pipeline_runs.append(pipeline_run)

    backfill.update(pipeline_schedule_id=pipeline_schedule.id)
    pipeline_schedule.update(status=PipelineSchedule.ScheduleStatus.ACTIVE)

    return pipeline_runs


def cancel_backfill(backfill: Backfill) -> None:
    for pipeline_run in PipelineRun.query.filter(
        PipelineRun.backfill_id == backfill.id,
        PipelineRun.status.not_in([
            PipelineRun.PipelineRunStatus.CANCELLED,
            PipelineRun.PipelineRunStatus.COMPLETED,
            PipelineRun.PipelineRunStatus.FAILED,
        ]),
    ):
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.CANCELLED)

    backfill.update(status=Backfill.Status.CANCELLED)
    backfill.pipeline_schedule.update(status=PipelineSchedule.ScheduleStatus.INACTIVE)


def __build_variables_list(backfill: Backfill) -> List[Dict]:
    if backfill.block_uuid:
        return []

    dates = __build_dates(backfill)
    return [{
        'ds': execution_date.strftime('%Y-%m-%d'),
        'execution_date': execution_date.isoformat(),
        'hr': execution_date.strftime('%H'),
    } for execution_date in dates]


def __build_dates(backfill: Backfill) -> List[datetime]:
    dates = []

    current_datetime = backfill.start_datetime
    while current_datetime <= backfill.end_datetime:
        dates.append(current_datetime)

        interval_type = backfill.interval_type
        if interval_type not in [
            Backfill.IntervalType.MONTH,
            Backfill.IntervalType.YEAR,
        ]:
            unit = f'{interval_type.value}s'
            if Backfill.IntervalType.CUSTOM == interval_type:
                unit = 'seconds'
            current_datetime += timedelta(**{unit: backfill.interval_units})
        else:
            month = 1 if Backfill.IntervalType.MONTH == interval_type else 0
            year = 1 if Backfill.IntervalType.YEAR == interval_type else 0
            current_datetime = datetime(
                current_datetime.year + year,
                current_datetime.month + month,
                current_datetime.day,
                current_datetime.hour,
                current_datetime.minute,
                current_datetime.second,
            ).replace(tzinfo=current_datetime.tzinfo)

    return dates
