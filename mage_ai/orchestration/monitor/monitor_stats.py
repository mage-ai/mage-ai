from datetime import datetime, timedelta
from mage_ai.shared.hash import group_by, merge_dict
from mage_ai.orchestration.db.models import BlockRun, PipelineRun
from sqlalchemy.orm import joinedload
from typing import Callable, Dict, List
import dateutil.parser
import enum


class MonitorStatsType(str, enum.Enum):
    PIPELINE_RUN_COUNT = 'pipeline_run_count'
    PIPELINE_RUN_TIME = 'pipeline_run_time'
    BLOCK_RUN_COUNT = 'block_run_count'
    BLOCK_RUN_TIME = 'block_run_time'


class MonitorStats:
    def get_stats(
        self,
        stats_type: MonitorStatsType,
        pipeline_uuid: str = None,
        start_time: str = None,
        end_time: str = None,
        **kwargs,
    ) -> Dict:
        if end_time is None:
            end_time = datetime.now()
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

    def get_pipeline_run_count(
        self,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        **kwargs,
    ) -> Dict:
        pipeline_runs = self.__filter_pipeline_runs(
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
            end_time=end_time,
            **kwargs,
        )
        pipeline_runs = pipeline_runs.all()
        stats_by_schedule_id = dict()
        for p in pipeline_runs:
            if p.pipeline_schedule_id not in stats_by_schedule_id:
                stats_by_schedule_id[p.pipeline_schedule_id] = dict(
                    name=p.pipeline_schedule_name,
                    data=dict(),
                )
            created_at_formatted = p.created_at.strftime('%Y-%m-%d')
            data = stats_by_schedule_id[p.pipeline_schedule_id]['data']
            if created_at_formatted not in data:
                data[created_at_formatted] = dict()
            if p.status not in data[created_at_formatted]:
                data[created_at_formatted][p.status] = 1
            else:
                data[created_at_formatted][p.status] += 1
        return stats_by_schedule_id

    def get_pipeline_run_time(
        self,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        **kwargs,
    ) -> Dict:
        pipeline_runs = self.__filter_pipeline_runs(
            pipeline_uuid=pipeline_uuid,
            start_time=start_time,
            end_time=end_time,
            **kwargs,
        )
        pipeline_runs = pipeline_runs.filter(PipelineRun.completed_at != None).all()
        pipeline_run_by_date = group_by(lambda p: p.created_at.strftime('%Y-%m-%d'), pipeline_runs)

        def __mean_runtime(pipeline_runs):
            runtime_list = [(p.completed_at - p.created_at).total_seconds()
                            for p in pipeline_runs if p.completed_at > p.created_at]
            if len(runtime_list) == 0:
                return 0
            return sum(runtime_list) / len(runtime_list)
        pipeline_run_time_by_date = {k: __mean_runtime(v) for k, v in pipeline_run_by_date.items()}
        return {pipeline_uuid: dict(name=pipeline_uuid, data=pipeline_run_time_by_date)}

    def get_block_run_count(
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
        block_runs = block_runs.all()

        def __stats_func(block_runs):
            count_by_status = dict()
            for b in block_runs:
                if b.status in count_by_status:
                    count_by_status[b.status] += 1
                else:
                    count_by_status[b.status] = 1
            return count_by_status

        return self.__cal_block_run_stats(block_runs, __stats_func)

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
        block_runs = block_runs.filter(BlockRun.completed_at != None).all()

        def __stats_func(block_runs):
            runtime_list = [(b.completed_at - b.created_at).total_seconds()
                            for b in block_runs if b.completed_at > b.created_at]
            if len(runtime_list) == 0:
                return 0
            return sum(runtime_list) / len(runtime_list)

        return self.__cal_block_run_stats(block_runs, __stats_func)

    def __filter_pipeline_runs(
        self,
        pipeline_uuid: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        **kwargs
    ) -> Dict:
        pipeline_runs = PipelineRun.query.options(joinedload(PipelineRun.pipeline_schedule))
        if pipeline_uuid is not None:
            pipeline_runs = pipeline_runs.filter(PipelineRun.pipeline_uuid == pipeline_uuid)
        if start_time is not None:
            pipeline_runs = pipeline_runs.filter(PipelineRun.created_at >= start_time)
        if end_time is not None:
            pipeline_runs = pipeline_runs.filter(PipelineRun.created_at <= end_time)
        pipeline_schedule_id = kwargs.get('pipeline_schedule_id')
        if pipeline_schedule_id is not None:
            pipeline_runs = pipeline_runs.filter(
                PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id)
            )

        return pipeline_runs

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
