from datetime import datetime, timedelta
from typing import Dict, List

import dateutil.parser
from dateutil.relativedelta import relativedelta

from mage_ai.data_preparation.models.triggers import ScheduleInterval, ScheduleStatus
from mage_ai.orchestration.db.models.schedules import (
    Backfill,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.shared.hash import merge_dict


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
            schedule_interval=ScheduleInterval.ONCE,
            start_time=datetime.utcnow(),
            variables=backfill_variables,
            settings=backfill.settings,
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
            variables=merge_dict(backfill_variables or {}, backfill_run_variables),
        )
        pipeline_runs.append(pipeline_run)

    backfill.update(pipeline_schedule_id=pipeline_schedule.id)
    pipeline_schedule.update(status=ScheduleStatus.ACTIVE)

    return pipeline_runs


def preview_run_dates(backfill: Backfill) -> List[Dict]:
    variables_list = __build_variables_list(backfill)

    return variables_list


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
    backfill.pipeline_schedule.update(status=ScheduleStatus.INACTIVE)


def __build_variables_list(backfill: Backfill) -> List[Dict]:
    if backfill.block_uuid:
        return []

    dates = __build_dates(backfill)
    number_of_dates = len(dates)

    arr = []

    for idx, execution_date in enumerate(dates):
        interval_end_datetime = None
        interval_seconds = None
        interval_start_datetime = execution_date
        interval_start_datetime_previous = None

        if idx < number_of_dates - 1:
            interval_end_datetime = dates[idx + 1]
            interval_seconds = (
                interval_end_datetime.timestamp() - interval_start_datetime.timestamp()
            )
        elif idx >= 1 and idx == number_of_dates - 1:
            # Last date
            interval_start_datetime_previous = dates[idx - 1]
            interval_seconds = (
                interval_start_datetime.timestamp() - interval_start_datetime_previous.timestamp()
            )
            interval_end_datetime = interval_start_datetime + timedelta(seconds=interval_seconds)

        if not interval_start_datetime_previous and (interval_seconds and interval_start_datetime):
            interval_start_datetime_previous = interval_start_datetime - timedelta(
                seconds=interval_seconds,
            )

        if interval_end_datetime:
            interval_end_datetime = interval_end_datetime.isoformat()

        if interval_start_datetime:
            interval_start_datetime = interval_start_datetime.isoformat()

        if interval_start_datetime_previous:
            interval_start_datetime_previous = interval_start_datetime_previous.isoformat()

        arr.append(dict(
            ds=execution_date.strftime('%Y-%m-%d'),
            execution_date=execution_date.isoformat(),
            hr=execution_date.strftime('%H'),
            interval_end_datetime=interval_end_datetime,
            interval_seconds=interval_seconds,
            interval_start_datetime=interval_start_datetime,
            interval_start_datetime_previous=interval_start_datetime_previous,
        ))

    return arr


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
            key = None
            if Backfill.IntervalType.MONTH == interval_type:
                key = 'months'
            elif Backfill.IntervalType.YEAR == interval_type:
                key = 'years'

            delta = {
                key: backfill.interval_units,
            }
            current_datetime = current_datetime + relativedelta(**delta)
            current_datetime = current_datetime.replace(tzinfo=current_datetime.tzinfo)

    return dates
