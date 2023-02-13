from mage_ai.api.operations.constants import META_KEY_LIMIT
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import (
    EventMatcher,
    PipelineRun,
    pipeline_schedule_event_matcher_association_table,
)
from mage_ai.shared.hash import merge_dict
from sqlalchemy.orm import selectinload


class PipelineRunResource(DatabaseResource):
    datetime_keys = ['execution_date']
    model_class = PipelineRun

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        pipeline_schedule_id = None
        parent_model = kwargs.get('parent_model')
        if parent_model:
            pipeline_schedule_id = parent_model.id

        backfill_id = query_arg.get('backfill_id', [None])
        if backfill_id:
            backfill_id = backfill_id[0]
        pipeline_uuid = query_arg.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        status = query.get('status', [None])
        if status:
            status = status[0]
        order_by_arg = self.get_argument('order_by[]', [None])
        if order_by_arg:
            order_by_arg = order_by_arg[0]

        order_by = None
        if order_by_arg:
            order_by = []
            for s in order_by_arg.split(','):
                parts = s.strip().split(' ')
                if len(parts) >= 2:
                    order_by.append((parts[0], parts[1]))
                else:
                    order_by.append((parts[0], 'asc'))

        results = (
            PipelineRun.
            query.
            options(selectinload(PipelineRun.block_runs)).
            options(selectinload(PipelineRun.pipeline_schedule))
        )

        if backfill_id is not None:
            results = results.filter(PipelineRun.backfill_id == int(backfill_id))
        if pipeline_schedule_id is not None:
            results = results.filter(PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id))
        if pipeline_uuid is not None:
            results = results.filter(PipelineRun.pipeline_uuid == pipeline_uuid)
        if status is not None:
            results = results.filter(PipelineRun.status == status)

        if order_by:
            arr = []
            for tup in order_by:
                col, asc_desc = tup
                asc_desc = asc_desc.lower()
                pr_col = getattr(PipelineRun, col)
                arr.append(getattr(pr_col, asc_desc)())
            initial_results = results.order_by(*arr)
        else:
            initial_results = \
                results.order_by(PipelineRun.execution_date.desc(), PipelineRun.id.desc())

        # collection = [r.to_dict(include_attributes=[
        #     'block_runs',
        #     'block_runs_count',
        #     'pipeline_schedule_name',
        #     'pipeline_schedule_token',
        #     'pipeline_schedule_type',
        # ]) for r in results]

        # If runs from a certain execution date are included in the results, then
        # we want to include all of the attempts for that execution date. We need
        # to do this because the frontend groups retries.

        return results

    # @classmethod
    # def create(self, payload, user, **kwargs):
    #     pipeline = kwargs['parent_model']
    #     payload['pipeline_uuid'] = pipeline.uuid
    #     return super().create(payload, user, **kwargs)

    # @safe_db_query
    # def update(self, payload, **kwargs):
    #     arr = payload.pop('event_matchers', None)
    #     event_matchers = []
    #     if arr is not None:
    #         if len(arr) >= 1:
    #             event_matchers = EventMatcher.upsert_batch(
    #                 [merge_dict(p, dict(pipeline_schedule_ids=[self.id])) for p in arr],
    #             )

    #         ems = (
    #             EventMatcher.
    #             query.
    #             join(
    #                 pipeline_schedule_event_matcher_association_table,
    #                 EventMatcher.id ==
    #                 pipeline_schedule_event_matcher_association_table.c.event_matcher_id
    #             ).
    #             join(
    #                 PipelineRun,
    #                 PipelineRun.id ==
    #                 pipeline_schedule_event_matcher_association_table.c.pipeline_schedule_id
    #             ).
    #             filter(
    #                 PipelineRun.id == int(self.id),
    #                 EventMatcher.id.not_in([em.id for em in event_matchers]),
    #             )
    #         )
    #         for em in ems:
    #             new_ids = [schedule for schedule in em.pipeline_schedules if schedule.id != self.id]
    #             ps = [p for p in PipelineRun.query.filter(PipelineRun.id.in_(new_ids))]
    #             em.update(pipeline_schedules=ps)

    #     super().update(payload)

    #     return self
