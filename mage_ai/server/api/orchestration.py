from .base import (
    META_KEY_LIMIT,
    BaseDetailHandler,
    BaseHandler,
)
from datetime import datetime
from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import (
    BlockRun,
    EventMatcher,
    PipelineRun,
    PipelineSchedule,
    pipeline_schedule_event_matcher_association_table,
)
from mage_ai.orchestration.pipeline_scheduler import get_variables
from mage_ai.shared.hash import merge_dict
from sqlalchemy.orm import aliased, joinedload
import json


class ApiBlockRunDetailHandler(BaseHandler):
    model_class = BlockRun

    @safe_db_query
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

    @safe_db_query
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

    @safe_db_query
    def get(self, pipeline_run_id):
        block_runs = BlockRun.query.filter(
            BlockRun.pipeline_run_id == int(pipeline_run_id),
        ).all()
        collection = [r.to_dict() for r in block_runs]

        self.write(dict(block_runs=collection))
        self.finish()


class ApiBlockRunLogHandler(BaseHandler):
    @safe_db_query
    def get(self, block_run_id):
        block_run = BlockRun.query.get(int(block_run_id))
        self.write(
            dict(
                log=block_run.logs,
            ),
        )


class ApiBlockRunOutputHandler(BaseHandler):
    @safe_db_query
    def get(self, block_run_id):
        block_run = BlockRun.query.get(int(block_run_id))
        outputs = block_run.get_outputs()
        self.write(dict(outputs=outputs))


def process_pipeline_runs(
    handler,
    pipeline_schedule_id=None,
    pipeline_uuid=None,
    status=None,
):
    results = (
        PipelineRun.
        query.
        options(joinedload(PipelineRun.block_runs)).
        options(joinedload(PipelineRun.pipeline_schedule))
    )
    if pipeline_schedule_id is not None:
        results = results.filter(PipelineRun.pipeline_schedule_id == pipeline_schedule_id)
    if pipeline_uuid is not None:
        results = results.filter(PipelineRun.pipeline_uuid == pipeline_uuid)
    if status is not None:
        results = results.filter(PipelineRun.status == status)
    initial_results = \
        results.order_by(PipelineRun.execution_date.desc(), PipelineRun.id.desc())

    results = handler.limit(initial_results)

    collection = [r.to_dict(include_attributes=[
                                'block_runs',
                                'block_runs_count',
                                'pipeline_schedule_name',
                            ])
                  for r in results]

    # If runs from a certain execution date are included in the results, then
    # we want to include all of the attempts for that execution date. We need
    # to do this because the frontend groups retries.
    if handler.get_argument(META_KEY_LIMIT, None) is not None and \
        len(collection) > 0 and \
            (pipeline_uuid is not None or pipeline_schedule_id is not None):

        first_execution_date = results[0].execution_date
        additional_results = \
            initial_results.filter(PipelineRun.execution_date == first_execution_date)
        filter_dates = []
        if additional_results[0].id != results[0].id:
            filter_dates.append(collection[0]['execution_date'])

        last_execution_date = results[-1].execution_date
        additional_results = \
            initial_results.filter(PipelineRun.execution_date == last_execution_date)
        addons = [
            r.to_dict(include_attributes=[
                        'block_runs',
                        'block_runs_count',
                        'pipeline_schedule_name',
                    ])
            for r in additional_results
        ]
        filter_dates.append(collection[-1]['execution_date'])
        collection = \
            list(filter(lambda x: x['execution_date'] not in filter_dates, collection)) + addons

    handler.write(dict(pipeline_runs=collection, total_count=initial_results.count()))
    handler.finish()


class ApiAllPipelineRunListHandler(BaseHandler):
    datetime_keys = ['execution_date']
    model_class = PipelineRun

    @safe_db_query
    def get(self):
        pipeline_uuid = self.get_argument('pipeline_uuid', None)
        status = self.get_argument('status', None)
        process_pipeline_runs(self, pipeline_uuid=pipeline_uuid, status=status)


class ApiPipelineRunDetailHandler(BaseDetailHandler):
    model_class = PipelineRun

    @safe_db_query
    def get(self, pipeline_run_id):
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))
        block_runs = pipeline_run.block_runs

        pipeline_run_dict = pipeline_run.to_dict()
        block_runs_json = []
        for r in block_runs:
            block_run = r.to_dict()
            block_run['pipeline_schedule_id'] = pipeline_run.pipeline_schedule_id
            block_run['pipeline_schedule_name'] = pipeline_run.pipeline_schedule.name
            block_runs_json.append(block_run)
        pipeline_run_dict['block_runs'] = block_runs_json

        self.write(dict(pipeline_run=pipeline_run_dict))

    @safe_db_query
    def put(self, pipeline_run_id):
        payload = self.get_payload()
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))

        if payload.get('action') == 'retry_blocks':
            if pipeline_run.status != PipelineRun.PipelineRunStatus.COMPLETED:
                pipeline_run.refresh()
                pipeline = Pipeline.get(pipeline_run.pipeline_uuid)
                incomplete_block_runs = \
                    list(
                        filter(
                            lambda br: br.status != BlockRun.BlockRunStatus.COMPLETED,
                            pipeline_run.block_runs
                        )
                    )

                from mage_ai.orchestration.execution_process_manager import execution_process_manager
                if PipelineType.STREAMING != pipeline.type:
                    if PipelineType.INTEGRATION == pipeline.type:
                        execution_process_manager.terminate_pipeline_process(pipeline_run.id)
                    else:
                        for br in incomplete_block_runs:
                            execution_process_manager.terminate_block_process(pipeline_run.id, br.id)

                from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
                pipeline_scheduler = PipelineScheduler(pipeline_run)

                pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
                pipeline_scheduler.schedule(incomplete_block_runs)
        elif payload.get('status') == PipelineRun.PipelineRunStatus.CANCELLED:
            from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
            PipelineScheduler(pipeline_run).stop()
        self.write(dict(pipeline_run=pipeline_run.to_dict()))


class ApiPipelineRunListHandler(BaseHandler):
    datetime_keys = ['execution_date']
    model_class = PipelineRun

    @safe_db_query
    def get(self, pipeline_schedule_id):
        status = self.get_argument('status', None)
        process_pipeline_runs(self, pipeline_schedule_id=int(pipeline_schedule_id), status=status)

    @safe_db_query
    def post(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))
        pipeline = Pipeline.get(pipeline_schedule.pipeline_uuid)

        payload = self.get_payload()
        if 'variables' not in payload:
            payload['variables'] = {}

        payload['pipeline_schedule_id'] = pipeline_schedule.id
        payload['pipeline_uuid'] = pipeline_schedule.pipeline_uuid
        if payload.get('execution_date') is None:
            payload['execution_date'] = datetime.now()

        is_integration = PipelineType.INTEGRATION == pipeline.type
        if is_integration:
            payload['create_block_runs'] = False

        body = self.request.body
        if body:
            payload['event_variables'] = {}

            for k, v in json.loads(body).items():
                if k == 'pipeline_run':
                    continue
                payload['event_variables'][k] = v

        pipeline_run = PipelineRun.create(**payload)

        from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
        pipeline_scheduler = PipelineScheduler(pipeline_run)

        if is_integration:
            initialize_state_and_runs(
                pipeline_run,
                pipeline_scheduler.logger,
                get_variables(pipeline_run),
            )
        pipeline_scheduler.start(should_schedule=False)

        self.write(dict(pipeline_run=pipeline_run.to_dict()))


class ApiPipelineRunLogHandler(BaseHandler):
    @safe_db_query
    def get(self, pipeline_run_id):
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))
        self.write(
            dict(
                log=pipeline_run.logs,
            ),
        )


class ApiPipelineScheduleDetailHandler(BaseDetailHandler):
    datetime_keys = ['start_time']
    model_class = PipelineSchedule

    @safe_db_query
    def get(self, pipeline_schedule_id):
        include_attributes = []
        if self.get_bool_argument('include_event_matchers', False):
            include_attributes.append('event_matchers')
        super().get(pipeline_schedule_id, include_attributes=include_attributes)

    @safe_db_query
    def put(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))
        payload = self.get_payload()

        arr = payload.pop('event_matchers', None)
        event_matchers = []
        if arr is not None:
            if len(arr) >= 1:
                event_matchers = EventMatcher.upsert_batch(
                    [merge_dict(p, dict(pipeline_schedule_ids=[pipeline_schedule_id]))
                     for p in arr],
                )

            ems = (
                EventMatcher.
                query.
                join(
                    pipeline_schedule_event_matcher_association_table,
                    EventMatcher.id ==
                    pipeline_schedule_event_matcher_association_table.c.event_matcher_id
                ).
                join(
                    PipelineSchedule,
                    PipelineSchedule.id ==
                    pipeline_schedule_event_matcher_association_table.c.pipeline_schedule_id
                ).
                filter(
                    PipelineSchedule.id == int(pipeline_schedule_id),
                    EventMatcher.id.not_in([em.id for em in event_matchers]),
                )
            )
            for em in ems:
                new_ids = [schedule for schedule in em.pipeline_schedules
                           if schedule.id != int(pipeline_schedule_id)]
                ps = [p for p in PipelineSchedule.query.filter(PipelineSchedule.id.in_(new_ids))]
                em.update(pipeline_schedules=ps)

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

    @safe_db_query
    def get(self, pipeline_uuid=None):
        try:
            if pipeline_uuid is None:
                results = PipelineSchedule.query.all()
                collection = [s.to_dict() for s in results]
            else:
                pipeline = Pipeline.get(pipeline_uuid)
                results = (
                    PipelineSchedule.
                    query.
                    options(joinedload(PipelineSchedule.event_matchers)).
                    options(joinedload(PipelineSchedule.pipeline_runs)).
                    filter(PipelineSchedule.pipeline_uuid == pipeline.uuid).
                    order_by(PipelineSchedule.start_time.desc(), PipelineSchedule.id.desc())
                )
                results = self.limit(results)
                collection = [r.to_dict(include_attributes=['event_matchers', 'pipeline_runs_count', 'last_pipeline_run_status'])
                              for r in results]
                collection.sort(key=lambda d: d['id'], reverse=True)
        except Exception as err:
            raise err
            collection = []

        self.write(dict(pipeline_schedules=collection))
        self.finish()

    @safe_db_query
    def post(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)

        payload = self.get_payload()
        payload['pipeline_uuid'] = pipeline.uuid
        pipeline_schedule = PipelineSchedule.create(**payload)

        self.write(dict(pipeline_schedule=pipeline_schedule.to_dict()))
