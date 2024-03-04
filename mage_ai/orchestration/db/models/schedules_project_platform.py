from datetime import datetime, timedelta, timezone
from math import ceil
from statistics import stdev
from typing import Dict, List

import dateutil.parser
import pytz
from croniter import croniter
from dateutil.relativedelta import relativedelta
from sqlalchemy import or_
from sqlalchemy.sql import func
from sqlalchemy.sql.functions import coalesce

from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.base import classproperty
from mage_ai.settings.platform import build_repo_path_for_all_projects
from mage_ai.settings.platform.utils import (
    get_pipeline_from_platform,
    get_pipeline_from_platform_async,
)
from mage_ai.shared.array import find
from mage_ai.shared.constants import ENV_PROD
from mage_ai.shared.dates import compare
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import clean_name


class PipelineScheduleProjectPlatformMixin:
    @classproperty
    def repo_query_project_platform(cls):
        repo_paths = []

        queries = Project().repo_path_for_database_query('pipeline_schedules')
        if queries:
            repo_paths.extend(queries)

        repo_paths.extend([d.get(
            'full_path',
        ) for d in build_repo_path_for_all_projects(mage_projects_only=True).values()])

        return cls.query.filter(
            or_(
                cls.repo_path.in_(repo_paths),
                cls.repo_path.is_(None),
            )
        )

    @property
    def pipeline_project_platform(self) -> 'Pipeline':
        return get_pipeline_from_platform(
            self.pipeline_uuid,
            check_if_exists=True,
            repo_path=self.repo_path,
        )

    @property
    def pipeline_in_progress_runs_count_project_platform(self) -> int:
        from mage_ai.orchestration.db.models.schedules import PipelineRun

        return (
            PipelineRun.select(func.count(PipelineRun.id))
            .filter(
                PipelineRun.pipeline_schedule_id == self.id,
                PipelineRun.status.in_(
                    [
                        PipelineRun.PipelineRunStatus.INITIAL,
                        PipelineRun.PipelineRunStatus.RUNNING,
                    ]
                ),
                (coalesce(PipelineRun.passed_sla, False).is_(False)),
            )
            .scalar()
        )

    @property
    def pipeline_runs_count_project_platform(self) -> int:
        from mage_ai.orchestration.db.models.schedules import PipelineRun

        return (
            PipelineRun.select(func.count(PipelineRun.id))
            .filter(
                PipelineRun.pipeline_schedule_id == self.id,
            )
            .scalar()
        )

    @property
    def last_pipeline_run_status_project_platform(self) -> str:
        from mage_ai.orchestration.db.models.schedules import PipelineRun

        query_result = (
            PipelineRun.select(PipelineRun.id, PipelineRun.status)
            .filter(
                PipelineRun.pipeline_schedule_id == self.id,
            )
            .order_by(
                PipelineRun.created_at.desc(),
            )
            .first()
        )

        if query_result is None:
            return None

        return query_result.status

    @safe_db_query
    def should_schedule_project_platform(
        self,
        previous_runtimes: List[int] = None,
        pipeline: Pipeline = None,
    ) -> bool:
        """
        Determine whether a pipeline schedule should be executed based on its configuration and
        history.

        Args:
            previous_runtimes (List[int], optional): A list of previous execution runtimes,
                in seconds, used for decision-making when scheduling based on landing time.
                Defaults to None.

        Returns:
            bool: True if the schedule should be executed; False otherwise.

        Note:
            This method evaluates whether a pipeline schedule should be executed, taking into
            account various factors such as the schedule's status, start time, landing time,
            schedule interval, and previous runtimes. It returns True if the schedule should be
            executed and False otherwise.
        """
        now = datetime.now(tz=pytz.UTC)

        if self.status != ScheduleStatus.ACTIVE:
            return False

        if not self.landing_time_enabled() and \
                self.start_time is not None and \
                compare(now, self.start_time.replace(tzinfo=pytz.UTC)) == -1:
            return False

        pipeline_use = pipeline or self.pipeline
        if not pipeline_use:
            try:
                Pipeline.get(self.pipeline_uuid)
            except Exception:
                print(
                    f'[WARNING] Pipeline {self.pipeline_uuid} cannot be found '
                    + f'for pipeline schedule ID {self.id}.',
                )
                return False

        if self.schedule_interval == ScheduleInterval.ONCE:
            pipeline_run_count = self.pipeline_runs_count
            if pipeline_run_count == 0:
                return True
            executor_count = pipeline_use.executor_count
            # Used by streaming pipeline to launch multiple executors
            if executor_count > 1 and pipeline_run_count < executor_count:
                return True
        elif self.schedule_interval == ScheduleInterval.ALWAYS_ON:
            if self.pipeline_runs_count == 0:
                return True
            else:
                from mage_ai.orchestration.db.models.schedules import PipelineRun

                return self.last_pipeline_run_status not in [
                    PipelineRun.PipelineRunStatus.RUNNING,
                    PipelineRun.PipelineRunStatus.INITIAL,
                ]
        else:
            current_execution_date = self.current_execution_date()
            if current_execution_date is None:
                return False

            # If the execution date is before start time, don't schedule it
            if self.start_time is not None and \
                    compare(current_execution_date, self.start_time.replace(tzinfo=pytz.UTC)) == -1:
                return False

            # If there is a pipeline_run with an execution_date the same as the
            # current_execution_date, then don’t schedule
            if not find(
                lambda x: compare(
                    x.execution_date.replace(tzinfo=pytz.UTC),
                    current_execution_date,
                ) == 0,
                self.fetch_pipeline_runs([self.id])
            ):
                if self.landing_time_enabled():
                    if not previous_runtimes or len(previous_runtimes) == 0:
                        return True
                    else:
                        runtime = ceil(sum(previous_runtimes) / len(previous_runtimes))

                        if len(previous_runtimes) >= 2:
                            sd = ceil(stdev(previous_runtimes) / 2)
                        else:
                            sd = 0

                        # This may cause duplicate pipeline runs to be scheduled if
                        # there is more than 1 scheduler running.
                        if datetime.now(timezone.utc) >= current_execution_date - timedelta(
                            seconds=runtime + sd,
                        ):
                            return True
                else:
                    return True
        return False


class PipelineRunProjectPlatformMixin:
    @property
    def pipeline_project_platform(self) -> 'Pipeline':
        return get_pipeline_from_platform(
            self.pipeline_uuid,
            repo_path=self.pipeline_schedule.repo_path if self.pipeline_schedule else None,
        )

    def get_variables_project_platform(
        self,
        extra_variables: Dict = None,
        pipeline_uuid: str = None,
    ) -> Dict:
        if extra_variables is None:
            extra_variables = dict()

        pipeline_run_variables = self.variables or {}
        event_variables = self.event_variables or {}

        variables = merge_dict(
            merge_dict(
                get_global_variables(
                    pipeline_uuid or self.pipeline_uuid,
                    pipeline=self.pipeline,
                ) or dict(),
                self.pipeline_schedule.variables or dict(),
            ),
            pipeline_run_variables,
        )

        # For backwards compatibility
        for k, v in event_variables.items():
            if k not in variables:
                variables[k] = v

        if self.execution_date:
            variables['ds'] = self.execution_date.strftime('%Y-%m-%d')
            variables['hr'] = self.execution_date.strftime('%H')

        variables['env'] = ENV_PROD
        variables['event'] = merge_dict(variables.get('event', {}), event_variables)
        variables['execution_date'] = self.execution_date
        variables['execution_partition'] = self.execution_partition

        interval_end_datetime = variables.get('interval_end_datetime')
        interval_seconds = variables.get('interval_seconds')
        interval_start_datetime = variables.get('interval_start_datetime')
        interval_start_datetime_previous = variables.get('interval_start_datetime_previous')

        if interval_end_datetime or \
                interval_seconds or \
                interval_start_datetime or \
                interval_start_datetime_previous:
            if interval_end_datetime:
                try:
                    variables['interval_end_datetime'] = dateutil.parser.parse(
                        interval_end_datetime,
                    )
                except Exception as err:
                    print(f'[ERROR] PipelineRun.get_variables: {err}')

            if interval_start_datetime:
                try:
                    variables['interval_start_datetime'] = dateutil.parser.parse(
                        interval_start_datetime,
                    )
                except Exception as err:
                    print(f'[ERROR] PipelineRun.get_variables: {err}')

            if interval_start_datetime_previous:
                try:
                    variables['interval_start_datetime_previous'] = dateutil.parser.parse(
                        interval_start_datetime_previous,
                    )
                except Exception as err:
                    print(f'[ERROR] PipelineRun.get_variables: {err}')
        elif self.execution_date and ScheduleType.TIME == self.pipeline_schedule.schedule_type:
            interval_end_datetime = None
            interval_seconds = None
            interval_start_datetime = self.execution_date
            interval_start_datetime_previous = None

            if (
                ScheduleInterval.ONCE == self.pipeline_schedule.schedule_interval
                or ScheduleInterval.ALWAYS_ON == self.pipeline_schedule.schedule_interval
            ):
                pass
            elif ScheduleInterval.DAILY == self.pipeline_schedule.schedule_interval:
                interval_seconds = 60 * 60 * 24
            elif ScheduleInterval.HOURLY == self.pipeline_schedule.schedule_interval:
                interval_seconds = 60 * 60 * 1
            elif ScheduleInterval.MONTHLY == self.pipeline_schedule.schedule_interval:
                interval_end_datetime = interval_start_datetime + relativedelta(months=1)
                interval_seconds = (
                    interval_end_datetime.timestamp() - interval_start_datetime.timestamp()
                )
            elif ScheduleInterval.WEEKLY == self.pipeline_schedule.schedule_interval:
                interval_seconds = 60 * 60 * 24 * 7
            else:
                try:
                    cron_itr = croniter(
                        self.pipeline_schedule.schedule_interval,
                        self.execution_date,
                    )
                    current = cron_itr.get_current(datetime)
                    interval_start_datetime_previous = cron_itr.get_prev(datetime)
                    # get_prev and get_next changes the state of the cron iterator, so we need
                    # to call get_next again to go back to the original state
                    cron_itr.get_next()
                    interval_end_datetime = cron_itr.get_next(datetime)
                    interval_seconds = (
                        interval_end_datetime.timestamp() - current.timestamp()
                    )
                except Exception:
                    pass

            if interval_seconds and not interval_end_datetime:
                interval_end_datetime = interval_start_datetime + timedelta(
                    seconds=interval_seconds,
                )

            if interval_seconds and interval_start_datetime:
                interval_start_datetime_previous = interval_start_datetime - timedelta(
                    seconds=interval_seconds,
                )

            variables['interval_end_datetime'] = interval_end_datetime
            variables['interval_seconds'] = interval_seconds
            variables['interval_start_datetime'] = interval_start_datetime
            variables['interval_start_datetime_previous'] = interval_start_datetime_previous

        variables.update(extra_variables)

        return variables

    async def logs_async_project_platform(self) -> List[Dict]:
        repo_path = None
        if self.pipeline_schedule:
            repo_path = self.pipeline_schedule.repo_path

        pipeline = await get_pipeline_from_platform_async(
            self.pipeline_uuid,
            repo_path=repo_path,
        )

        pipeline_logs = await LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline_uuid,
            partition=self.execution_partition,
            repo_config=pipeline.repo_config,
        ).get_logs_async()
        scheduler_logs = await LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline_uuid,
            filename='scheduler.log',
            partition=self.execution_partition,
            repo_config=pipeline.repo_config,
        ).get_logs_async()
        return [pipeline_logs, scheduler_logs]


class BlockRunProjectPlatformMixin:
    async def logs_async_project_platform(self, repo_path: str = None):
        if not repo_path and self.pipeline_run and self.pipeline_run.pipeline_schedule:
            repo_path = self.pipeline_run.pipeline_schedule.repo_path

        pipeline = await get_pipeline_from_platform_async(
            self.pipeline_run.pipeline_uuid,
            repo_path=repo_path,
        )

        return await LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=pipeline.uuid,
            block_uuid=clean_name(self.block_uuid),
            partition=self.pipeline_run.execution_partition,
            repo_config=pipeline.repo_config,
        ).get_logs_async()
