import importlib
import uuid

from sqlalchemy.orm import selectinload

from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.data_preparation.models.triggers import (
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
    remove_trigger,
)
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    EventMatcher,
    PipelineSchedule,
    pipeline_schedule_event_matcher_association_table,
)
from mage_ai.orchestration.db.models.tags import (
    Tag,
    TagAssociation,
    TagAssociationWithTag,
)
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

        query = PipelineSchedule.repo_query

        if len(tag_names) >= 1:
            tag_associations = (
                TagAssociation.
                select(
                    Tag.name,
                    TagAssociation.taggable_id,
                    TagAssociation.taggable_type,
                ).
                join(
                    Tag,
                    Tag.id == TagAssociation.tag_id,
                ).
                filter(
                    Tag.name.in_(tag_names),
                    TagAssociation.taggable_type == self.model_class.__name__,
                ).
                all()
            )
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
            query = (
                query.
                options(selectinload(PipelineSchedule.event_matchers)).
                options(selectinload(PipelineSchedule.pipeline_runs))
            )

            if global_data_product_uuid:
                query = query.filter(
                    PipelineSchedule.global_data_product_uuid == global_data_product_uuid,
                )
            else:
                query = query.filter(
                    PipelineSchedule.global_data_product_uuid.is_(None),
                    PipelineSchedule.pipeline_uuid == pipeline.uuid,
                )

            return query.order_by(PipelineSchedule.id.desc(), PipelineSchedule.start_time.desc())

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

        return query.all()

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        pipeline = kwargs['parent_model']
        payload['pipeline_uuid'] = pipeline.uuid

        if 'repo_path' not in payload:
            payload['repo_path'] = get_repo_path()
        if 'token' not in payload:
            payload['token'] = uuid.uuid4().hex

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
                    PipelineSchedule.id == int(self.id),
                    EventMatcher.id.not_in([em.id for em in event_matchers]),
                )
            )
            for em in ems:
                new_ids = [schedule for schedule in em.pipeline_schedules if schedule.id != self.id]
                ps = [p for p in PipelineSchedule.query.filter(PipelineSchedule.id.in_(new_ids))]
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
            tag_names_to_create = \
                [tag_name for tag_name in tag_names if tag_name not in (
                    existing_tag_names + tag_names_to_keep
                )]

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

            new_tag_associations = [TagAssociation(
                tag_id=tag_id,
                taggable_id=self.model.id,
                taggable_type=self.model.__class__.__name__,
            ) for tag_id in tag_ids_to_use]
            db_connection.session.bulk_save_objects(
                new_tag_associations,
                return_defaults=True,
            )

            tag_associations_updated = []
            for tag_name, new_tag_association in zip(tag_names_to_use, new_tag_associations):
                taw = TagAssociationWithTag(
                    id=new_tag_association.id,
                    name=tag_name,
                    tag_id=new_tag_association.tag_id,
                    taggable_id=new_tag_association.taggable_id,
                    taggable_type=new_tag_association.taggable_type,
                )
                tag_associations_updated.append(taw)

            self.tag_associations_updated = tag_associations_updated + tag_associations_to_keep

        resource = super().update(payload)
        updated_model = resource.model
        trigger = Trigger(
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
        add_or_update_trigger_for_pipeline_and_persist(
            trigger,
            updated_model.pipeline_uuid,
            update_only_if_exists=True,
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
    pipeline_schedule_ids = [r.id for r in resource.result_set()]
    result = (
        TagAssociation.
        select(
            TagAssociation.id,
            TagAssociation.tag_id,
            TagAssociation.taggable_id,
            TagAssociation.taggable_type,
            Tag.name,
        ).
        join(
            Tag,
            Tag.id == TagAssociation.tag_id,
        ).
        filter(
            TagAssociation.taggable_id.in_(pipeline_schedule_ids),
            TagAssociation.taggable_type == resource.model.__class__.__name__,
        ).
        all()
    )
    TagResource = getattr(
        importlib.import_module('mage_ai.api.resources.TagResource'),
        'TagResource',
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
