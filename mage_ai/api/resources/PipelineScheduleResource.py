import collections
import uuid
from datetime import datetime

import pytz
from sqlalchemy import case
from sqlalchemy.orm import joinedload
from sqlalchemy.sql.expression import func

from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import (
    ScheduleStatus,
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
    remove_trigger,
)
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    EventMatcher,
    PipelineRun,
    PipelineSchedule,
    pipeline_schedule_event_matcher_association_table,
)
from mage_ai.orchestration.db.models.tags import (
    Tag,
    TagAssociation,
    TagAssociationWithTag,
)
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict


class PipelineScheduleResource(DatabaseResource):
    datetime_keys = ['start_time']
    model_class = PipelineSchedule

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tag_associations_updated = None

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        """
        The result of this method will be a ResultSet of dictionaries. Each dict will already
        contain the additional fields that are needed for the pipeline schedule LIST endpoint.
        """
        pipeline = kwargs.get('parent_model')

        global_data_product_uuid = query_arg.get('global_data_product_uuid', [None])
        if global_data_product_uuid:
            global_data_product_uuid = global_data_product_uuid[0]

        tag_names = query_arg.get('tag[]', [])
        if tag_names:
            if isinstance(tag_names, str):
                tag_names = tag_names.split(',')

        schedule_types = query_arg.get('schedule_type[]', [])
        if schedule_types:
            schedule_types = schedule_types[0]
        if schedule_types:
            schedule_types = schedule_types.split(',')

        schedule_intervals = query_arg.get('schedule_interval[]', [])
        if schedule_intervals:
            schedule_intervals = schedule_intervals[0]
        if schedule_intervals:
            schedule_intervals = schedule_intervals.split(',')

        statuses = query_arg.get('status[]', [])
        if statuses:
            statuses = statuses[0]
        if statuses:
            statuses = statuses.split(',')

        if project_platform_activated():
            query = PipelineSchedule.query
        else:
            query = PipelineSchedule.repo_query

        tag_query = TagAssociation.select(
            Tag.name,
            TagAssociation.taggable_id,
            TagAssociation.taggable_type,
        ).join(
            Tag,
            Tag.id == TagAssociation.tag_id,
        )
        if len(tag_names) >= 1:
            tag_associations = tag_query.filter(
                Tag.name.in_(tag_names),
                TagAssociation.taggable_type == self.model_class.__name__,
            ).all()
            query = query.filter(
                PipelineSchedule.id.in_([ta.taggable_id for ta in tag_associations]),
            )

        if schedule_types:
            query = query.filter(
                PipelineSchedule.schedule_type.in_(schedule_types),
            )
        if schedule_intervals:
            query = query.filter(
                PipelineSchedule.schedule_interval.in_(schedule_intervals),
            )
        if statuses:
            query = query.filter(
                PipelineSchedule.status.in_(statuses),
            )

        if global_data_product_uuid or pipeline:
            if global_data_product_uuid:
                query = query.filter(
                    PipelineSchedule.global_data_product_uuid
                    == global_data_product_uuid,
                )
            else:
                query = query.filter(
                    PipelineSchedule.global_data_product_uuid.is_(None),
                    PipelineSchedule.pipeline_uuid == pipeline.uuid,
                )

            query = query.order_by(
                PipelineSchedule.id.desc(), PipelineSchedule.start_time.desc()
            )
        else:
            order_by = query_arg.get('order_by', [None])
            if order_by[0]:
                order_by = order_by[0]
                if order_by == 'created_at':
                    query = query.order_by(PipelineSchedule.created_at.desc())
                elif order_by == 'name':
                    query = query.order_by(PipelineSchedule.name.asc())
                elif order_by == 'pipeline_uuid':
                    query = query.order_by(PipelineSchedule.pipeline_uuid.asc())
                elif order_by == 'status':
                    query = query.order_by(PipelineSchedule.status.asc())
                elif order_by == 'schedule_type':
                    query = query.order_by(PipelineSchedule.schedule_type.asc())

        query = query.options(joinedload(PipelineSchedule.event_matchers))

        schedules = query.all()
        schedule_ids = [schedule.id for schedule in schedules]

        # Get fields to be returned in a single query. The result of this query
        # will be a record of (pipeline_schedule_id, pipeline_runs_count,
        # in_progress_runs_count, last_pipeline_run_id).
        schedule_data_query = (
            PipelineRun.select(
                PipelineRun.pipeline_schedule_id,
                func.count(PipelineRun.pipeline_schedule_id).label(
                    'pipeline_runs_count'
                ),
                func.sum(
                    case(
                        [
                            (
                                PipelineRun.status.in_(
                                    [
                                        PipelineRun.PipelineRunStatus.INITIAL,
                                        PipelineRun.PipelineRunStatus.RUNNING,
                                    ]
                                ),
                                1,
                            )
                        ],
                        else_=0,
                    )
                ).label('in_progress_runs_count'),
                func.max(PipelineRun.id).label('last_pipeline_run_id'),
            )
            .where(
                PipelineRun.pipeline_schedule_id.in_(schedule_ids),
            )
            .group_by(PipelineRun.pipeline_schedule_id)
        )
        pipeline_schedule_data = schedule_data_query.all()

        pipeline_runs_to_fetch = []
        for data in pipeline_schedule_data:
            pipeline_runs_to_fetch.append(data.last_pipeline_run_id)

        pipeline_run_statuses = (
            PipelineRun.select(
                PipelineRun.id,
                PipelineRun.status,
            )
            .filter(
                PipelineRun.id.in_(pipeline_runs_to_fetch),
            )
            .all()
        )

        pipeline_run_status_by_id = {
            pipeline_run.id: pipeline_run.status
            for pipeline_run in pipeline_run_statuses
        }

        run_counts_by_pipeline_schedule = {
            data.pipeline_schedule_id: dict(
                pipeline_runs_count=data.pipeline_runs_count,
                pipeline_in_progress_runs_count=data.in_progress_runs_count,
                last_pipeline_run_status=pipeline_run_status_by_id.get(
                    data.last_pipeline_run_id
                )
                if data.last_pipeline_run_id
                else None,
            )
            for data in pipeline_schedule_data
        }

        # Get tags for each pipeline schedule in a single query. The result of this query will be
        # a record of (taggable_id, taggable_type, tag_id, tag_name).
        tags = tag_query.filter(
            TagAssociation.taggable_id.in_(schedule_ids),
            TagAssociation.taggable_type == self.model_class.__name__,
        ).all()

        tags_by_pipeline_schedule = collections.defaultdict(list)
        for tag in tags:
            tags_by_pipeline_schedule[tag.taggable_id].append(tag.name)

        results = []
        for s in schedules:
            additional_fields = merge_dict(
                run_counts_by_pipeline_schedule.get(s.id, {}),
                dict(
                    next_pipeline_run_date=s.next_execution_date(),
                    tags=tags_by_pipeline_schedule.get(s.id, []),
                ),
            )
            results.append(
                merge_dict(
                    s.to_dict(include_attributes=['event_matchers']),
                    additional_fields,
                )
            )

        return self.build_result_set(
            results,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        pipeline = kwargs['parent_model']
        payload['pipeline_uuid'] = pipeline.uuid

        if 'repo_path' not in payload:
            payload['repo_path'] = (pipeline.repo_path if pipeline else None) or get_repo_path()
        if 'token' not in payload:
            payload['token'] = uuid.uuid4().hex
        if payload.get('status') == ScheduleStatus.ACTIVE and \
                payload.get('last_enabled_at') is None:
            payload['last_enabled_at'] = datetime.now(tz=pytz.UTC)

        if pipeline.should_save_trigger_in_code_automatically():

            def _callback(resource, kwargs=kwargs, user=user):
                from mage_ai.api.resources.PipelineTriggerResource import (
                    PipelineTriggerResource,
                )

                PipelineTriggerResource.create(
                    dict(pipeline_schedule_id=resource.id),
                    user,
                    **kwargs,
                )

            self.on_create_callback = _callback

        return super().create(payload, user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        arr = payload.pop('event_matchers', None)
        event_matchers = []
        if arr is not None:
            if len(arr) >= 1:
                event_matchers = EventMatcher.upsert_batch(
                    [merge_dict(p, dict(pipeline_schedule_ids=[self.id])) for p in arr],
                )

            ems = (
                EventMatcher.query.join(
                    pipeline_schedule_event_matcher_association_table,
                    EventMatcher.id
                    == pipeline_schedule_event_matcher_association_table.c.event_matcher_id,
                )
                .join(
                    PipelineSchedule,
                    PipelineSchedule.id
                    == pipeline_schedule_event_matcher_association_table.c.pipeline_schedule_id,
                )
                .filter(
                    PipelineSchedule.id == int(self.id),
                    EventMatcher.id.not_in([em.id for em in event_matchers]),
                )
            )
            for em in ems:
                new_ids = [
                    schedule
                    for schedule in em.pipeline_schedules
                    if schedule.id != self.id
                ]
                ps = [
                    p
                    for p in PipelineSchedule.query.filter(
                        PipelineSchedule.id.in_(new_ids)
                    )
                ]
                em.update(pipeline_schedules=ps)

        tag_names = payload.pop('tags', None)
        if tag_names is not None:
            # 1. Fetch all tag associations
            # 2. Delete any tag associations that don’t have a tag in tag_names
            tag_associations_to_keep = []
            tag_associations_to_delete = []
            for ta in self.tag_associations:
                if ta.name in tag_names:
                    tag_associations_to_keep.append(ta)
                else:
                    tag_associations_to_delete.append(ta)

            if len(tag_associations_to_delete) >= 1:
                delete_query = TagAssociation.__table__.delete().where(
                    TagAssociation.id.in_(
                        [ta.id for ta in tag_associations_to_delete],
                    ),
                )
                db_connection.session.execute(delete_query)

            # 3. Fetch all tags in tag_names that aren’t in tag associations
            existing_tags = Tag.query.filter(
                Tag.name.in_(tag_names),
                Tag.name.not_in([ta.name for ta in tag_associations_to_keep]),
            ).all()
            existing_tag_pks = []
            existing_tag_names = []
            for tag in existing_tags:
                existing_tag_pks.append(tag.id)
                existing_tag_names.append(tag.name)

            # 4. Create new tags
            tag_names_to_keep = [ta.name for ta in tag_associations_to_keep]
            tag_names_to_create = [
                tag_name
                for tag_name in tag_names
                if tag_name not in (existing_tag_names + tag_names_to_keep)
            ]

            new_tags = [Tag(name=tag_name) for tag_name in tag_names_to_create]
            db_connection.session.bulk_save_objects(
                new_tags,
                return_defaults=True,
            )

            # 5. Create tag associations
            tag_names_to_use = existing_tag_names.copy()
            tag_ids_to_use = existing_tag_pks.copy()
            for tag in new_tags:
                tag_names_to_use.append(tag.name)
                tag_ids_to_use.append(tag.id)

            new_tag_associations = [
                TagAssociation(
                    tag_id=tag_id,
                    taggable_id=self.model.id,
                    taggable_type=self.model.__class__.__name__,
                )
                for tag_id in tag_ids_to_use
            ]
            db_connection.session.bulk_save_objects(
                new_tag_associations,
                return_defaults=True,
            )

            tag_associations_updated = []
            for tag_name, new_tag_association in zip(
                tag_names_to_use, new_tag_associations
            ):
                taw = TagAssociationWithTag(
                    id=new_tag_association.id,
                    name=tag_name,
                    tag_id=new_tag_association.tag_id,
                    taggable_id=new_tag_association.taggable_id,
                    taggable_type=new_tag_association.taggable_type,
                )
                tag_associations_updated.append(taw)

            self.tag_associations_updated = (
                tag_associations_updated + tag_associations_to_keep
            )

        updated_status = payload.get('status')
        if updated_status == ScheduleStatus.ACTIVE and self.model.status == ScheduleStatus.INACTIVE:
            payload['last_enabled_at'] = datetime.now(tz=pytz.UTC)

        resource = super().update(payload)
        updated_model = resource.model

        pipeline = Pipeline.get(updated_model.pipeline_uuid)
        if pipeline:
            trigger = Trigger(
                last_enabled_at=updated_model.last_enabled_at,
                name=updated_model.name,
                pipeline_uuid=updated_model.pipeline_uuid,
                schedule_interval=updated_model.schedule_interval,
                schedule_type=updated_model.schedule_type,
                settings=updated_model.settings,
                sla=updated_model.sla,
                start_time=updated_model.start_time,
                status=updated_model.status,
                variables=updated_model.variables,
            )

            update_only_if_exists = (
                not pipeline.should_save_trigger_in_code_automatically()
            )

            add_or_update_trigger_for_pipeline_and_persist(
                trigger,
                pipeline.uuid,
                update_only_if_exists=update_only_if_exists,
            )

        return self

    def get_tag_associations(self):
        if self.tag_associations_updated is None:
            return self.tag_associations
        else:
            return self.tag_associations_updated

    @safe_db_query
    def delete(self, **kwargs):
        remove_trigger(self.model.name, self.model.pipeline_uuid)
        self.model.delete()

        return self


def __load_tag_associations(resource):
    from mage_ai.api.resources.TagResource import TagResource

    pipeline_schedule_ids = [r.id for r in resource.result_set()]
    result = (
        TagAssociation.select(
            TagAssociation.id,
            TagAssociation.tag_id,
            TagAssociation.taggable_id,
            TagAssociation.taggable_type,
            Tag.name,
        )
        .join(
            Tag,
            Tag.id == TagAssociation.tag_id,
        )
        .filter(
            TagAssociation.taggable_id.in_(pipeline_schedule_ids),
            TagAssociation.taggable_type == resource.model.__class__.__name__,
        )
        .all()
    )

    return TagResource.build_result_set(result, resource.current_user)


def __select_tag_associations(resource, arr):
    def _func(res):
        return resource.id == res.taggable_id

    return list(filter(_func, arr))


PipelineScheduleResource.register_collective_loader(
    'tag_associations',
    load=__load_tag_associations,
    select=__select_tag_associations,
)
