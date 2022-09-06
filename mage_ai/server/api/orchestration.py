from .base import BaseDetailHandler, BaseHandler
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import (
    BlockRun,
    EventMatcher,
    PipelineRun,
    PipelineSchedule,
    pipeline_schedule_event_matcher_association_table,
)
from mage_ai.shared.hash import group_by, merge_dict
from sqlalchemy import distinct, func
from sqlalchemy.orm import aliased


class ApiBlockRunDetailHandler(BaseHandler):
    model_class = BlockRun

    def put(self, block_run_id):
        payload = self.get_payload()
        # Only allow update block run status
        status = payload.get('status')
        if status is not None:
            block_run = BlockRun.query.get(int(block_run_id))
            if status != block_run.status:
                block_run.update(status=status)
        self.write(dict(block_run=block_run.to_dict()))


class ApiAllBlockRunListHandler(BaseHandler):
    model_class = BlockRun

    def get(self):
        query = BlockRun.query

        a = aliased(BlockRun, name='a')
        b = aliased(PipelineRun, name='b')
        c = aliased(PipelineSchedule, name='c')

        columns = [
            a.block_uuid,
            a.completed_at,
            a.created_at,
            a.id,
            a.pipeline_run_id,
            a.status,
            a.updated_at,
            c.id.label('pipeline_schedule_id'),
            c.name.label('pipeline_schedule_name'),
        ]

        query = (
            BlockRun.
            select(*columns).
            join(b, a.pipeline_run_id == b.id).
            join(c, b.pipeline_schedule_id == c.id)
        )

        pipeline_run_id = self.get_argument('pipeline_run_id', None)
        if pipeline_run_id:
            query = (
                query.
                filter(a.pipeline_run_id == int(pipeline_run_id))
            )

        pipeline_uuid = self.get_argument('pipeline_uuid', None)
        if pipeline_uuid:
            query = (
                query.
                filter(c.pipeline_uuid == pipeline_uuid)
            )

        query = (
            query.
            order_by(a.created_at.desc(), a.completed_at.desc())
        ).all()
        collection = [r for r in query]

        self.write(dict(block_runs=collection))
        self.finish()


class ApiBlockRunListHandler(BaseHandler):
    model_class = BlockRun

    def get(self, pipeline_run_id):
        block_runs = BlockRun.query.filter(
            BlockRun.pipeline_run_id == int(pipeline_run_id),
        ).all()
        collection = [r.to_dict() for r in block_runs]

        self.write(dict(block_runs=collection))
        self.finish()


class ApiBlockRunLogHandler(BaseHandler):
    def get(self, block_run_id):
        block_run = BlockRun.query.get(int(block_run_id))
        self.write(
            dict(
                log=block_run.log_file.to_dict(include_content=True),
            ),
        )


class ApiBlockRunOutputHandler(BaseHandler):
    def get(self, block_run_id):
        block_run = BlockRun.query.get(int(block_run_id))
        outputs = block_run.get_outputs()
        self.write(dict(outputs=outputs))


def process_pipeline_runs(
    handler,
    pipeline_schedule_id=None,
    pipeline_uuid=None,
):
    a = aliased(PipelineRun, name='a')
    b = aliased(PipelineSchedule, name='b')
    c = aliased(BlockRun, name='c')
    columns = [
        a.completed_at,
        a.created_at,
        a.execution_date,
        a.id,
        b.name.label('pipeline_schedule_name'),
        a.pipeline_schedule_id,
        a.pipeline_uuid,
        a.status,
        a.variables,
        a.updated_at,
    ]

    pipeline_runs = (
        PipelineRun.
        select(*columns, func.count(c.id).label('block_runs_count')).
        join(b, a.pipeline_schedule_id == b.id).
        join(c, a.id == c.pipeline_run_id, isouter=True)
    )

    if pipeline_schedule_id:
        pipeline_runs = (
            pipeline_runs.
            filter(a.pipeline_schedule_id == pipeline_schedule_id)
        )

    if pipeline_uuid:
        pipeline_runs = (
            pipeline_runs.
            filter(b.pipeline_uuid == pipeline_uuid)
        )

    pipeline_runs = (
        pipeline_runs.
        group_by(*columns).
        order_by(a.created_at.desc())
    ).all()

    collection = []
    for r in pipeline_runs:
        run_dict = dict(r._mapping)
        block_runs = BlockRun.query.filter(
            BlockRun.pipeline_run_id == int(r.id),
        ).all()
        run_dict['block_runs'] = [r.to_dict() for r in block_runs]
        collection.append(run_dict)

    handler.write(dict(pipeline_runs=collection))
    handler.finish()


class ApiAllPipelineRunListHandler(BaseHandler):
    datetime_keys = ['execution_date']
    model_class = PipelineRun

    def get(self):
        pipeline_uuid = self.get_argument('pipeline_uuid', None)
        process_pipeline_runs(self, pipeline_uuid=pipeline_uuid)


class ApiPipelineRunDetailHandler(BaseDetailHandler):
    model_class = PipelineRun

    def put(self, pipeline_run_id):
        super().put(pipeline_run_id)


class ApiPipelineRunListHandler(BaseHandler):
    datetime_keys = ['execution_date']
    model_class = PipelineRun

    def get(self, pipeline_schedule_id):
        process_pipeline_runs(self, pipeline_schedule_id=int(pipeline_schedule_id))

    def post(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))

        payload = self.get_payload()
        payload['pipeline_schedule_id'] = pipeline_schedule.id
        payload['pipeline_uuid'] = pipeline_schedule.pipeline_uuid
        pipeline_run = PipelineRun.create(**payload)

        from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
        PipelineScheduler(pipeline_run).start()

        self.write(dict(pipeline_run=pipeline_run.to_dict()))


class ApiPipelineRunLogHandler(BaseHandler):
    def get(self, pipeline_run_id):
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))
        self.write(
            dict(
                log=pipeline_run.log_file.to_dict(include_content=True),
            ),
        )


class ApiPipelineScheduleDetailHandler(BaseDetailHandler):
    datetime_keys = ['start_time']
    model_class = PipelineSchedule

    def get(self, pipeline_schedule_id):
        include_attributes = []
        if self.get_bool_argument('include_event_matchers', False):
            include_attributes.append('event_matchers')
        super().get(pipeline_schedule_id, include_attributes=include_attributes)

    def put(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))
        payload = self.get_payload()

        arr = payload.pop('event_matchers', [])
        event_matchers = []
        if len(arr) >= 1:
            event_matchers = EventMatcher.upsert_batch(
                [merge_dict(p, dict(pipeline_schedule_ids=[pipeline_schedule_id])) for p in arr],
            )

        pipeline_schedule.update(**payload)

        extra_data = {}
        include_attributes = []

        if len(event_matchers) >= 1:
            extra_data['event_matchers'] = [em.to_dict() for em in event_matchers]
        else:
            include_attributes.append('event_matchers')

        pipeline_schedule_data = merge_dict(
            pipeline_schedule.to_dict(include_attributes=include_attributes),
            extra_data,
        )

        self.write(dict(pipeline_schedule=pipeline_schedule_data))

    def delete(self, pipeline_schedule_id):
        super().delete(pipeline_schedule_id)


class ApiPipelineScheduleListHandler(BaseHandler):
    datetime_keys = ['start_time']
    model_class = PipelineSchedule

    def get(self, pipeline_uuid=None):
        try:
            if pipeline_uuid is None:
                results = PipelineSchedule.query.all()
                collection = [s.to_dict() for s in results]
            else:
                pipeline = Pipeline.get(pipeline_uuid)

                a = aliased(PipelineSchedule, name='a')
                b = aliased(PipelineRun, name='b')

                pipeline_schedule_columns = [
                    'created_at',
                    'id',
                    'name',
                    'pipeline_uuid',
                    'schedule_interval',
                    'schedule_type',
                    'start_time',
                    'status',
                    'updated_at',
                    'variables',
                ]
                columns = [getattr(a, col) for col in pipeline_schedule_columns] + [
                    EventMatcher.event_type,
                    EventMatcher.id.label('event_id'),
                    EventMatcher.name.label('event_matcher_name'),
                    EventMatcher.pattern.label('event_pattern'),
                ]

                results = (
                    PipelineSchedule.
                    select(*columns, func.count(distinct(b.id)).label('pipeline_runs_count')).
                    join(b, a.id == b.pipeline_schedule_id, isouter=True).
                    join(pipeline_schedule_event_matcher_association_table, a.id == pipeline_schedule_event_matcher_association_table.c.pipeline_schedule_id, isouter=True).
                    join(EventMatcher, EventMatcher.id == pipeline_schedule_event_matcher_association_table.c.event_matcher_id, isouter=True).
                    filter(a.pipeline_uuid == pipeline.uuid).
                    group_by(*columns).
                    order_by(a.start_time.desc(), a.id.desc())
                )

                collection = []
                for pipeline_schedule_id, arr in group_by(lambda x: x.id, results).items():
                    event_matchers = []
                    for schedule in arr:
                        if schedule.event_id:
                            event_matchers.append(dict(
                                event_type=schedule.event_type,
                                id=schedule.event_id,
                                name=schedule.event_matcher_name,
                                pattern=schedule.event_pattern,
                            ))

                    data = dict(event_matchers=event_matchers)

                    schedule = arr[0]
                    for col in pipeline_schedule_columns:
                        data[col] = getattr(schedule, col)
                    collection.append(data)
                collection.sort(key=lambda d: d['id'], reverse=True)
        except Exception as err:
            raise err
            collection = []

        self.write(dict(pipeline_schedules=collection))
        self.finish()

    def post(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)

        payload = self.get_payload()
        payload['pipeline_uuid'] = pipeline.uuid
        pipeline_schedule = PipelineSchedule.create(**payload)

        self.write(dict(pipeline_schedule=pipeline_schedule.to_dict()))
