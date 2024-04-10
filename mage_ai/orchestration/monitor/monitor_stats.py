import enum
from datetime import datetime, timedelta
from functools import reduce
from typing import Callable, Dict, List, Union

import dateutil.parser
from sqlalchemy.sql import func

from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.functions import format_datetime
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.settings.platform.constants import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import group_by, merge_dict

NO_PIPELINE_SCHEDULE_ID = 'no_pipeline_schedule_id'
NO_PIPELINE_SCHEDULE_NAME = 'no_pipeline_schedule_name'


class MonitorStatsType(str, enum.Enum):
    PIPELINE_RUN_COUNT = 'pipeline_run_count'
    PIPELINE_RUN_TIME = 'pipeline_run_time'
    BLOCK_RUN_COUNT = 'block_run_count'
    BLOCK_RUN_TIME = 'block_run_time'


class MonitorStats:
    @property
    def repo_path(self) -> str:
        return get_repo_path(root_project=True)

    def get_stats(
        self,
        stats_type: MonitorStatsType,
        pipeline_uuid: str = None,
        start_time: str = None,
        end_time: str = None,
        **kwargs,
    ) -> Dict:
        if end_time is None:
            end_time = datetime.utcnow()
        else:
            end_time = dateutil.parser.parse(end_time)
        if start_time is None:
            start_time = end_time - timedelta(days=30)
        else:
            start_time = dateutil.parser.parse(start_time)
        new_kwargs = merge_dict(dict(
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
            end_time=end_time,
        ), kwargs)
        if stats_type == MonitorStatsType.PIPELINE_RUN_COUNT:
            return self.get_pipeline_run_count(**new_kwargs)
        elif stats_type == MonitorStatsType.PIPELINE_RUN_TIME:
            return self.get_pipeline_run_time(**new_kwargs)
        elif stats_type == MonitorStatsType.BLOCK_RUN_COUNT:
            return self.get_block_run_count(**new_kwargs)
        elif stats_type == MonitorStatsType.BLOCK_RUN_TIME:
            return self.get_block_run_time(**new_kwargs)

    def __filter(
        self,
        query,
        end_time: datetime = None,
        pipeline_schedule_id: int = None,
        pipeline_uuid: str = None,
        start_time: datetime = None,
    ) -> List:
        filter_statement = []

        if pipeline_uuid is not None:
            filter_statement.append(PipelineRun.pipeline_uuid == pipeline_uuid)

        if start_time is not None:
            filter_statement.append(PipelineRun.created_at >= start_time)

        if end_time is not None:
            filter_statement.append(PipelineRun.created_at <= end_time)

        if pipeline_schedule_id is not None:
            filter_statement.append(PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id))

        if filter_statement:
            return query.filter(*filter_statement)

        return query

    def get_pipeline_run_count(
        self,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        group_by_pipeline_type: Union[str, bool] = False,
        pipeline_schedule_id: int = None,
        **kwargs,
    ) -> Dict:
        now = datetime.utcnow().timestamp()

        query = (
            PipelineRun.
            select(
                PipelineRun.created_at,
                PipelineRun.pipeline_schedule_id,
                PipelineRun.pipeline_uuid,
                PipelineRun.status,
                PipelineSchedule.name,
                format_datetime(PipelineRun.created_at, [
                    'year',
                    'month',
                    'day',
                ]).label('ds_created_at'),
            ).
            join(PipelineSchedule, PipelineRun.pipeline_schedule_id == PipelineSchedule.id)
        )

        query = self.__filter(
            query,
            end_time=end_time,
            pipeline_schedule_id=pipeline_schedule_id,
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
        )

        pipeline_runs = query.all()
        # Query: 11.1094
        # Query: 2.7102 (after optimization)
        print(f'Query: {round((datetime.utcnow().timestamp() - now) * 10000) / 10000}')

        now = datetime.utcnow().timestamp()
        stats_by_schedule_id = dict()
        pipelines_mapping = {}
        for uuid in set([p.pipeline_uuid for p in pipeline_runs]):
            try:
                pipeline = Pipeline.get(
                    uuid,
                    all_projects=project_platform_activated(),
                    check_if_exists=False,
                    repo_path=self.repo_path,
                )
                pipelines_mapping[pipeline.uuid] = pipeline
            except Exception as err:
                print(f'[ERROR] MonitorStats.get_pipeline_run_count: {err}.')
        # 0.2497
        print(f'Mapping: {round((datetime.utcnow().timestamp() - now) * 10000) / 10000}')

        now = datetime.utcnow().timestamp()
        for p in pipeline_runs:
            if p.pipeline_schedule_id is None:
                pipeline_schedule_id = NO_PIPELINE_SCHEDULE_ID
                pipeline_schedule_name = NO_PIPELINE_SCHEDULE_NAME
            else:
                pipeline_schedule_id = p.pipeline_schedule_id
                pipeline_schedule_name = p.name
            if pipeline_schedule_id not in stats_by_schedule_id:
                stats_by_schedule_id[pipeline_schedule_id] = dict(
                    name=pipeline_schedule_name,
                    data=dict(),
                )
            # p.created_at.strftime >= 1000 ms
            # Loop: 0.5338
            created_at_formatted = p.ds_created_at  # Negligible time
            data = stats_by_schedule_id[pipeline_schedule_id]['data']
            if created_at_formatted not in data:
                data[created_at_formatted] = dict()

            if group_by_pipeline_type:
                # Loop: 0.734
                if p.pipeline_uuid in pipelines_mapping:
                    pipeline_type = pipelines_mapping[p.pipeline_uuid].type
                    if pipeline_type not in data[created_at_formatted]:
                        data[created_at_formatted][pipeline_type] = dict()
                    if p.status not in data[created_at_formatted][pipeline_type]:
                        data[created_at_formatted][pipeline_type][p.status] = 1
                    else:
                        data[created_at_formatted][pipeline_type][p.status] += 1
            else:
                if p.status not in data[created_at_formatted]:
                    data[created_at_formatted][p.status] = 1
                else:
                    data[created_at_formatted][p.status] += 1
        # Loop: 2.4017
        # Loop: 1.0568 (optimized)
        print(f'Loop: {round((datetime.utcnow().timestamp() - now) * 10000) / 10000}')

        return stats_by_schedule_id

    def get_pipeline_run_time(
        self,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        **kwargs,
    ) -> Dict:
        now = datetime.utcnow().timestamp()

        select = [
            PipelineRun.completed_at,
            PipelineRun.created_at,
            format_datetime(PipelineRun.created_at, [
                'year',
                'month',
                'day',
            ]).label('ds_created_at'),
        ]

        if pipeline_uuid:
            select.append(PipelineRun.pipeline_uuid)

        if start_time or end_time:
            select.append(PipelineRun.created_at)

        query = self.__filter(
            PipelineRun.select(*select),
            end_time=end_time,
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
        ).filter(PipelineRun.completed_at != None, PipelineRun.created_at != None)  # noqa: E711

        pipeline_runs = query.all()
        # v1: 11.4428
        # v2: 2.2877
        print(f'Query: {round((datetime.utcnow().timestamp() - now) * 10000) / 10000}')

        now = datetime.utcnow().timestamp()
        pipeline_run_by_date = group_by(lambda p: p.ds_created_at, pipeline_runs)

        def __mean_runtime(pipeline_runs):
            runtime_list = [(p.completed_at - p.created_at).total_seconds()
                            for p in pipeline_runs if p.completed_at > p.created_at]
            if len(runtime_list) == 0:
                return 0
            return sum(runtime_list) / len(runtime_list)
        pipeline_run_time_by_date = {k: __mean_runtime(v) for k, v in pipeline_run_by_date.items()}
        # v1: 0.7857
        print(f'Mapping: {round((datetime.utcnow().timestamp() - now) * 10000) / 10000}')

        return {pipeline_uuid: dict(name=pipeline_uuid, data=pipeline_run_time_by_date)}

    def get_block_run_count(
        self,
        end_time: datetime = None,
        pipeline_schedule_id: int = None,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        **kwargs,
    ) -> Dict:
        now = datetime.utcnow().timestamp()

        select_query = [
            BlockRun.block_uuid.label('name'),
            BlockRun.status,
            func.count(BlockRun.block_uuid).label('n_count'),
            format_datetime(BlockRun.created_at, [
                'year',
                'month',
                'day',
            ]).label('ds_created_at'),
        ]
        filter_query = []

        if end_time is not None or start_time is not None:
            if start_time is not None:
                filter_query.append(BlockRun.created_at >= start_time)
            if end_time is not None:
                filter_query.append(BlockRun.created_at <= end_time)

        if pipeline_schedule_id is not None:
            filter_query.append(PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id))
            select_query.append(PipelineRun.pipeline_schedule_id)

        if pipeline_uuid is None:
            query = BlockRun.select(*select_query)
        else:
            select_query += [BlockRun.pipeline_run_id, PipelineRun.pipeline_uuid]
            query = (
                BlockRun.
                select(*select_query).
                join(PipelineRun, PipelineRun.id == BlockRun.pipeline_run_id).
                filter(PipelineRun.pipeline_uuid == pipeline_uuid)
            )

        if filter_query:
            query = query.filter(*filter_query)

        block_runs = (
            query.
            group_by('name', BlockRun.status, 'ds_created_at', *select_query[4:]).
            all()
        )
        # v1: 21.6741
        # v2: 1.24
        print(f'Query: {round((datetime.utcnow().timestamp() - now) * 10000) / 10000}')

        now = datetime.utcnow().timestamp()

        def _reduce(obj, tup):
            name, status, count, ds_created_at = tup[:4]
            if name not in obj:
                obj[name] = dict(data={}, name=name)
            if ds_created_at not in obj[name]['data']:
                obj[name]['data'][ds_created_at] = {}
            obj[name]['data'][ds_created_at][status] = count
            return obj
        mapping = reduce(_reduce, block_runs, {})

        # v1: <= 1
        # v2: 0
        print(f'Mapping: {round((datetime.utcnow().timestamp() - now) * 10000) / 10000}')

        return mapping

    def get_block_run_time(
        self,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        **kwargs,
    ) -> Dict:
        block_runs = self.__filter_block_runs(
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
            end_time=end_time,
            **kwargs,
        )
        block_runs = block_runs.filter(BlockRun.completed_at != None).all()  # noqa: E711

        def __stats_func(block_runs):
            runtime_list = [(b.completed_at - b.created_at).total_seconds()
                            for b in block_runs if b.completed_at > b.created_at]
            if len(runtime_list) == 0:
                return 0
            return sum(runtime_list) / len(runtime_list)

        return self.__cal_block_run_stats(block_runs, __stats_func)

    def __filter_block_runs(
        self,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        **kwargs,
    ) -> Dict:
        block_runs = BlockRun.query
        if pipeline_uuid is not None:
            block_runs = (
                block_runs.
                join(
                    PipelineRun,
                    PipelineRun.id == BlockRun.pipeline_run_id,
                ).
                filter(
                    PipelineRun.pipeline_uuid == pipeline_uuid,
                )
            )
        if start_time is not None:
            block_runs = block_runs.filter(BlockRun.created_at >= start_time)
        if end_time is not None:
            block_runs = block_runs.filter(BlockRun.created_at <= end_time)

        pipeline_schedule_id = kwargs.get('pipeline_schedule_id')
        if pipeline_schedule_id is not None:
            block_runs = block_runs.filter(
                PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id)
            )
        return block_runs

    def __cal_block_run_stats(
        self,
        block_runs: List[BlockRun],
        stats_func: Callable
    ) -> Dict:
        block_runs_by_uuid = group_by(lambda b: b.block_uuid, block_runs)
        block_run_stats = dict()
        for uuid, sub_block_runs in block_runs_by_uuid.items():
            sub_block_runs_by_date = group_by(
                lambda b: b.created_at.strftime('%Y-%m-%d'),
                sub_block_runs,
            )
            sub_block_runs_stats = {k: stats_func(v) for k, v in sub_block_runs_by_date.items()}
            block_run_stats[uuid] = dict(
                name=uuid,
                data=sub_block_runs_stats,
            )
        return block_run_stats
