import asyncio
import urllib.parse
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List

from sqlalchemy import or_
from sqlalchemy.orm import aliased

from mage_ai.ai.constants import LLMUseCase
from mage_ai.api.operations.constants import (
    DELETE,
    DETAIL,
    META_KEY_LIMIT,
    META_KEY_OFFSET,
    META_KEY_ORDER_BY,
)
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.api.resources.BlockResource import BlockResource
from mage_ai.api.resources.LlmResource import LlmResource
from mage_ai.authentication.operation_history.utils import (
    load_pipelines_detail_async,
    record_create_pipeline_async,
    record_detail_pipeline_async,
)
from mage_ai.cache.pipeline import PipelineCache
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    PipelineStatus,
)
from mage_ai.data_preparation.models.custom_templates.custom_pipeline_template import (
    CustomPipelineTemplate,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.triggers import (
    ScheduleStatus,
    get_trigger_configs_by_name,
    update_triggers_for_pipeline_and_persist,
)
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.pipeline_scheduler import (
    PipelineScheduler,
    retry_pipeline_run,
)
from mage_ai.server.active_kernel import switch_active_kernel
from mage_ai.server.kernels import PIPELINE_TO_KERNEL_NAME, KernelName
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find_index
from mage_ai.shared.hash import group_by, ignore_keys, merge_dict
from mage_ai.shared.strings import is_number
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class PipelineResource(BaseResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        limit = (meta or {}).get(META_KEY_LIMIT, None)
        if limit is not None:
            limit = int(limit)
        offset = (meta or {}).get(META_KEY_OFFSET, 0)
        if offset is not None:
            offset = int(offset)

        sorts = []
        reverse_sort = False
        order_by = (meta or {}).get(META_KEY_ORDER_BY, None)
        if order_by is not None and not isinstance(order_by, list):
            order_by = [order_by]
        if order_by:
            for idx, val in enumerate(order_by):
                val = val.lower().replace(' ', '_')
                if val.startswith('-'):
                    if idx == 0:
                        reverse_sort = True
                    val = val[1:]
                sorts.append(val)

        include_schedules = query.get('include_schedules', [False])
        if include_schedules:
            include_schedules = include_schedules[0]

        search_query = query.get('search', [None])
        if search_query:
            search_query = search_query[0]

        tags = query.get('tag[]', [])
        if tags:
            new_tags = []
            for tag in tags:
                new_tags += tag.split(',')
            tags = new_tags

        pipeline_types = query.get('type[]', [])
        if pipeline_types and len(pipeline_types) == 1:
            pipeline_types = pipeline_types[0]
        if pipeline_types and isinstance(pipeline_types, str):
            pipeline_types = pipeline_types.split(',')

        pipeline_statuses = query.get('status[]', [])
        if pipeline_statuses and len(pipeline_statuses) == 1:
            pipeline_statuses = pipeline_statuses[0]
        if pipeline_statuses and isinstance(pipeline_statuses, str):
            pipeline_statuses = pipeline_statuses.split(',')

        from_history_days = query.get('from_history_days', [None])
        if from_history_days:
            from_history_days = from_history_days[0]

        history_by_pipeline_uuid = {}
        if from_history_days is not None and is_number(from_history_days):
            timestamp_start = (datetime.utcnow() - timedelta(
                hours=24 * int(from_history_days),
            )).timestamp()
            history = await load_pipelines_detail_async(timestamp_start=timestamp_start)
            history = sorted(
                history,
                key=lambda x: int(x.timestamp),
                reverse=True,
            )

            for h in history:
                pipeline_uuid = str(h.resource.get('uuid'))
                if pipeline_uuid not in history_by_pipeline_uuid:
                    history_by_pipeline_uuid[pipeline_uuid] = [h]

            pipeline_uuids = list(history_by_pipeline_uuid.keys())
        elif tags:
            from mage_ai.cache.tag import NO_TAGS_QUERY, TagCache

            await TagCache.initialize_cache()

            cache = TagCache()
            pipeline_uuids = cache.get_pipeline_uuids_with_tags(tags)

            if NO_TAGS_QUERY in tags:
                pipeline_uuids_with_tags = set(cache.get_all_pipeline_uuids_with_tags())
                all_pipeline_uuids = set(Pipeline.get_all_pipelines(get_repo_path()))
                pipeline_uuids_without_tags = list(all_pipeline_uuids - pipeline_uuids_with_tags)
                pipeline_uuids = pipeline_uuids + pipeline_uuids_without_tags
        else:
            pipeline_uuids = Pipeline.get_all_pipelines(get_repo_path())

        if search_query:
            pipeline_uuids = list(filter(
                lambda x: search_query.lower() in x.lower() or
                search_query.lower() in x.lower().split(' '),
                pipeline_uuids,
            ))

        total_count = len(pipeline_uuids)
        await UsageStatisticLogger().pipelines_impression(lambda: total_count)

        if not sorts:
            pipeline_uuids = sorted(pipeline_uuids, reverse=reverse_sort)

        offset_limit_applied = False
        # Offset and limit now. If these filters exist, we must limit and offset after the filter.
        if not sorts and not pipeline_types and not pipeline_statuses:
            if offset:
                pipeline_uuids = pipeline_uuids[offset:]
            if limit:
                pipeline_uuids = pipeline_uuids[:(limit + 1)]
            offset_limit_applied = True

        cache = await PipelineCache.initialize_cache()

        async def get_pipeline(uuid: str) -> Pipeline:
            try:
                return await Pipeline.get_async(uuid)
            except Exception as err:
                err_message = f'Error loading pipeline {uuid}: {err}.'
                if err.__class__.__name__ == 'OSError' and 'Too many open files' in err.strerror:
                    raise Exception(err_message)
                else:
                    print(err_message)
                    return None

        pipeline_uuids_miss = []
        pipelines = []

        if pipeline_types:
            for pipeline_dict in cache.get_models(types=pipeline_types):
                pipelines.append(Pipeline(
                    pipeline_dict['pipeline']['uuid'],
                    config=pipeline_dict['pipeline'],
                ))
        else:
            for uuid in pipeline_uuids:
                pipeline_dict = cache.get_model(dict(uuid=uuid))
                if pipeline_dict and pipeline_dict.get('pipeline'):
                    pipelines.append(Pipeline(uuid, config=pipeline_dict['pipeline']))
                else:
                    pipeline_uuids_miss.append(uuid)

        if len(pipeline_uuids_miss) >= 1:
            pipelines += await asyncio.gather(
                *[get_pipeline(uuid) for uuid in pipeline_uuids_miss]
            )

        pipelines = [p for p in pipelines if p is not None]

        @safe_db_query
        def query_pipeline_schedules(pipeline_uuids):
            a = aliased(PipelineSchedule, name='a')
            result = (
                PipelineSchedule.
                select(*[
                    a.created_at,
                    a.id,
                    a.name,
                    a.pipeline_uuid,
                    a.schedule_interval,
                    a.schedule_type,
                    a.start_time,
                    a.status,
                    a.updated_at,
                ]).
                filter(
                    a.pipeline_uuid.in_(pipeline_uuids),
                    or_(
                        a.repo_path == get_repo_path(),
                        a.repo_path.is_(None),
                    )
                )
            ).all()
            return group_by(lambda x: x.pipeline_uuid, result)

        mapping = {}
        if include_schedules:
            mapping = query_pipeline_schedules(pipeline_uuids)
        if pipeline_types:
            pipelines = [p for p in pipelines if p.type in pipeline_types]

        filtered_pipelines = []
        for pipeline in pipelines:
            schedules = []
            if mapping.get(pipeline.uuid):
                schedules = mapping[pipeline.uuid]
            pipeline.schedules = schedules

            if pipeline_statuses and (
                (PipelineStatus.ACTIVE in pipeline_statuses and
                    any(s.status == ScheduleStatus.ACTIVE
                        for s in pipeline.schedules)) or
                (PipelineStatus.INACTIVE in pipeline_statuses and
                    len(pipeline.schedules) > 0 and
                    all(s.status == ScheduleStatus.INACTIVE
                        for s in pipeline.schedules)) or
                (PipelineStatus.NO_SCHEDULES in pipeline_statuses and
                    len(pipeline.schedules) == 0)
            ):
                filtered_pipelines.append(pipeline)

        if include_schedules and pipeline_statuses:
            pipelines = filtered_pipelines

        if len(history_by_pipeline_uuid) >= 1:
            for pipeline in pipelines:
                if pipeline.uuid in history_by_pipeline_uuid:
                    pipeline.history = history_by_pipeline_uuid.get(pipeline.uuid)

        if sorts:
            def _sort_key(p, sorts=sorts, reverse_sort=reverse_sort):
                bools = []
                vals = []
                for k in sorts:
                    if 'blocks' == k.lower():
                        val = len(p.blocks_by_uuid)
                        vals.append(val)
                        bools.append(val is None if not reverse_sort else val is not None)
                    elif 'triggers' == k.lower():
                        val = len(p.blocks_by_uuid)
                        vals.append(val)
                        bools.append(val is None if not reverse_sort else val is not None)
                    elif hasattr(p, k):
                        val = getattr(p, k)
                        vals.append(val)
                        bools.append(val is None if not reverse_sort else val is not None)
                    else:
                        bools.append(False)

                return tuple(bools + vals)

            pipelines = sorted(
                pipelines,
                key=_sort_key,
                reverse=reverse_sort,
            )

        if offset_limit_applied:
            results = pipelines
        else:
            total_count = len(pipelines)
            start_index = offset or 0
            end_index = (start_index + limit if limit else total_count) + 1
            results = pipelines[start_index:end_index]

        results_size = len(results)
        has_next = limit and total_count > limit
        final_end_idx = results_size - 1 if has_next else results_size

        arr = results[0:final_end_idx]
        result_set = self.build_result_set(
            arr,
            user,
            **kwargs,
        )
        result_set.metadata = {
            'count': total_count,
            'results': len(arr),
            'next': has_next,
        }

        return result_set

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        clone_pipeline_uuid = payload.get('clone_pipeline_uuid')
        template_uuid = payload.get('custom_template_uuid')
        name = payload.get('name')
        pipeline_type = payload.get('type')
        llm_payload = payload.get('llm')
        pipeline = None

        if template_uuid:
            custom_template = CustomPipelineTemplate.load(template_uuid=template_uuid)
            pipeline = custom_template.create_pipeline(name)
        elif clone_pipeline_uuid is not None:
            source = Pipeline.get(clone_pipeline_uuid)
            pipeline = Pipeline.duplicate(source, name)
        else:
            pipeline = Pipeline.create(
                name,
                pipeline_type=pipeline_type,
                repo_path=get_repo_path(),
            )

            if llm_payload:
                llm_use_case = llm_payload.get('use_case')

                if LLMUseCase.GENERATE_PIPELINE_WITH_DESCRIPTION == llm_use_case:
                    llm_resource = await LlmResource.create(llm_payload, user, **kwargs)
                    llm_response = llm_resource.model.get('response')

                    blocks_mapping = {}

                    for block_number, block_payload_orig in llm_response.items():
                        block_payload = block_payload_orig.copy()

                        configuration = block_payload.get('configuration')
                        if configuration:
                            for k, v in configuration.items():
                                configuration[k] = v.value if isinstance(v, Enum) else v

                            block_payload['configuration'] = configuration

                        block_uuid = f'{pipeline.uuid}_block_{block_number}'
                        block_resource = await BlockResource.create(merge_dict(
                            dict(
                                name=block_uuid,
                                type=block_payload.get('block_type'),
                            ),
                            ignore_keys(block_payload, [
                                'block_type',
                                'upstream_blocks',
                            ]),
                        ), user, **merge_dict(kwargs, dict(
                            parent_model=pipeline,
                        )))

                        upstream_block_uuids = block_payload.get('upstream_blocks')

                        pipeline.add_block(
                            block_resource.model,
                            None,
                            priority=len(upstream_block_uuids) if upstream_block_uuids else 0,
                            widget=False,
                        )

                        blocks_mapping[block_number] = dict(
                            block=block_resource.model,
                            upstream_block_uuids=upstream_block_uuids,
                        )

                    for _block_number, config in blocks_mapping.items():
                        upstream_block_uuids = config['upstream_block_uuids']

                        if upstream_block_uuids and len(upstream_block_uuids) >= 1:
                            block = config['block']
                            arr = [f'{pipeline.uuid}_block_{bn}' for bn in upstream_block_uuids]
                            block.update(dict(upstream_blocks=arr))

        if pipeline:
            await UsageStatisticLogger().pipeline_create(
                pipeline,
                clone_pipeline_uuid=clone_pipeline_uuid,
                llm_payload=llm_payload,
                template_uuid=template_uuid,
            )

        await record_create_pipeline_async(
            resource_uuid=pipeline.uuid,
            user=user.id if user else None,
        )

        async def _on_create_callback(resource):
            cache = await PipelineCache.initialize_cache()
            cache.add_model(resource.model)

        self.on_create_callback = _on_create_callback

        return self(pipeline, user, **kwargs)

    @classmethod
    @safe_db_query
    async def get_model(self, pk):
        uuid = urllib.parse.unquote(pk)
        return await Pipeline.get_async(uuid)

    @classmethod
    @safe_db_query
    async def member(self, pk, user, **kwargs):
        pipeline = await Pipeline.get_async(pk)

        api_operation_action = kwargs.get('api_operation_action', None)
        if api_operation_action != DELETE:
            kernel_name = PIPELINE_TO_KERNEL_NAME[pipeline.type]
            switch_active_kernel(
                kernel_name,
                emr_config=pipeline.executor_config if kernel_name == KernelName.PYSPARK else None,
            )

        if api_operation_action == DETAIL:
            if Project(pipeline.repo_config).is_feature_enabled(
                FeatureUUID.OPERATION_HISTORY,
            ):
                await record_detail_pipeline_async(
                    resource_uuid=pipeline.uuid,
                    user=user.id if user else None,
                )

        query = kwargs.get('query', {})
        include_block_pipelines = query.get('include_block_pipelines', [False])
        if include_block_pipelines:
            include_block_pipelines = include_block_pipelines[0]
        if include_block_pipelines:
            from mage_ai.cache.block import BlockCache

            await BlockCache.initialize_cache()

        return self(pipeline, user, **kwargs)

    @safe_db_query
    async def delete(self, **kwargs):
        async def _on_delete_callback(resource):
            cache = await PipelineCache.initialize_cache()
            cache.remove_model(resource.model)

        self.on_delete_callback = _on_delete_callback
        return self.model.delete()

    @safe_db_query
    async def update(self, payload, **kwargs):
        if 'add_upstream_for_block_uuid' in payload:
            block_uuid = payload['add_upstream_for_block_uuid']
            block = self.model.get_block(block_uuid, widget=False)
            if BlockType.DBT == block.type and block.language == BlockLanguage.SQL:
                upstream_dbt_blocks_by_uuid = {
                    block.uuid: block
                    for block in block.upstream_dbt_blocks()
                }
                self.model.blocks_by_uuid.update(upstream_dbt_blocks_by_uuid)
                self.model.validate('A cycle was formed while adding a block')
                self.model.save()
            return self

        query = kwargs.get('query', {})
        update_content = query.get('update_content', [False])
        if update_content:
            update_content = update_content[0]

        llm_payload = payload.get('llm')
        if llm_payload:
            llm_use_case = llm_payload.get('use_case')
            llm_request = llm_payload.get('request')

            if 'pipeline_uuid' not in llm_payload:
                llm_payload['pipeline_uuid'] = self.model.uuid

            llm_resource = await LlmResource.create(llm_payload, self.current_user, **kwargs)
            llm_response = llm_resource.model.get('response')

            pipeline_doc = None
            block_docs = []
            blocks = self.model.blocks_by_uuid.values()

            async def _add_markdown_block(block_doc: str, block_uuid: str, priority: int):
                return await BlockResource.create(dict(
                    content=block_doc.strip() if block_doc else block_doc,
                    language=BlockLanguage.MARKDOWN,
                    name=f'Documentation for {block_uuid}',
                    priority=priority,
                    type=BlockType.MARKDOWN,
                ), self.current_user, **merge_dict(kwargs, dict(
                    parent_model=self.model,
                )))

            if LLMUseCase.GENERATE_DOC_FOR_BLOCK == llm_use_case:
                block_doc = llm_response.get('block_doc')
                if block_doc:
                    block_uuid = llm_request.get('block_uuid')
                    priority = find_index(lambda x: x.uuid == block_uuid, blocks)
                    await _add_markdown_block(block_doc, block_uuid, priority)
            elif LLMUseCase.GENERATE_DOC_FOR_PIPELINE == llm_use_case:
                block_docs = llm_response.get('block_docs', [])
                pipeline_doc = llm_response.get('pipeline_doc')

                if pipeline_doc:
                    lines = []
                    if payload.get('description'):
                        lines.append(payload.get('description'))
                    lines.append(pipeline_doc)
                    payload['description'] = '\n'.join(lines).strip()

            if block_docs and len(block_docs) >= 1:
                blocks_with_docs = list(zip(block_docs, blocks))
                blocks_with_docs.reverse()
                blocks_with_docs_length = len(blocks_with_docs)

                for idx, tup in enumerate(blocks_with_docs):
                    priority = blocks_with_docs_length - (idx + 1)
                    block_doc, block = tup

                    if block_doc:
                        await _add_markdown_block(block_doc, block.uuid, priority)

            if pipeline_doc:
                await _add_markdown_block(pipeline_doc, self.model.uuid, 0)

        pipeline_type = self.model.type
        await self.model.update(
            ignore_keys(payload, ['add_upstream_for_block_uuid']),
            update_content=update_content,
        )
        try:
            kernel_name = PIPELINE_TO_KERNEL_NAME[self.model.type]
            switch_active_kernel(
                kernel_name,
                emr_config=self.model.executor_config
                if kernel_name == KernelName.PYSPARK else None,
            )
        except Exception as e:
            pipeline_type_updated = payload.get('type')
            if pipeline_type_updated is not None and pipeline_type_updated != pipeline_type:
                await self.model.update(dict(type=pipeline_type))

            raise e

        @safe_db_query
        def update_schedule_status(status, pipeline_uuid):
            trigger_configs_by_name = get_trigger_configs_by_name(pipeline_uuid)
            triggers_in_code_to_update = []
            schedules = (
                PipelineSchedule.
                query.
                filter(PipelineSchedule.pipeline_uuid == pipeline_uuid)
            ).all()
            for schedule in schedules:
                trigger_config = trigger_configs_by_name.get(schedule.name)
                if trigger_config is not None:
                    trigger_config['status'] = status
                    triggers_in_code_to_update.append(trigger_config)
                schedule.update(status=status)

            if triggers_in_code_to_update:
                update_triggers_for_pipeline_and_persist(
                    triggers_in_code_to_update,
                    schedule.pipeline_uuid,
                )

        @safe_db_query
        def cancel_pipeline_runs(
            pipeline_uuid: str = None,
            pipeline_schedule_id: int = None,
            pipeline_runs: List[Dict] = None,
        ):
            if pipeline_runs is not None:
                pipeline_run_ids = [run.get('id') for run in pipeline_runs]
                pipeline_runs_to_cancel = (
                    PipelineRun.
                    query.
                    filter(PipelineRun.id.in_(pipeline_run_ids))
                )
            elif pipeline_schedule_id is not None:
                pipeline_runs_to_cancel = PipelineRun.in_progress_runs([pipeline_schedule_id])
            else:
                pipeline_runs_to_cancel = (
                    PipelineRun.
                    query.
                    filter(PipelineRun.pipeline_uuid == pipeline_uuid).
                    filter(PipelineRun.status.in_([
                        PipelineRun.PipelineRunStatus.INITIAL,
                        PipelineRun.PipelineRunStatus.RUNNING,
                    ]))
                )
            for pipeline_run in pipeline_runs_to_cancel:
                PipelineScheduler(pipeline_run).stop()

        def retry_pipeline_runs(pipeline_runs):
            for run in pipeline_runs:
                retry_pipeline_run(run)

        @safe_db_query
        def query_incomplete_block_runs(pipeline_uuid: str):
            a = aliased(PipelineRun, name='a')
            b = aliased(BlockRun, name='b')
            columns = [
                b.id,
                b.status,
                b.pipeline_run_id,
                a.status,
                a.pipeline_uuid,
            ]
            result = (
                PipelineRun.
                select(*columns).
                join(b, a.id == b.pipeline_run_id).
                filter(a.pipeline_uuid == pipeline_uuid).
                filter(a.status == PipelineRun.PipelineRunStatus.FAILED).
                filter(b.status.not_in([
                    BlockRun.BlockRunStatus.COMPLETED,
                    BlockRun.BlockRunStatus.CONDITION_FAILED,
                ]))
            ).all()

            return result

        def retry_incomplete_block_runs(pipeline_uuid: str):
            incomplete_block_run_results = query_incomplete_block_runs(pipeline_uuid)
            block_run_ids = [r[0] for r in incomplete_block_run_results]
            pipeline_run_ids = list(set([r[2] for r in incomplete_block_run_results]))
            BlockRun.batch_update_status(
                block_run_ids,
                BlockRun.BlockRunStatus.INITIAL,
            )
            PipelineRun.batch_update_status(
                pipeline_run_ids,
                PipelineRun.PipelineRunStatus.INITIAL,
            )

        status = payload.get('status')
        pipeline_uuid = self.model.uuid

        async def _update_callback(resource):
            if status:
                pipeline_schedule_id = payload.get('pipeline_schedule_id')
                pipeline_runs = payload.get('pipeline_runs')
                if status in [
                    ScheduleStatus.ACTIVE.value,
                    ScheduleStatus.INACTIVE.value,
                ]:
                    update_schedule_status(status, pipeline_uuid)
                elif status == PipelineRun.PipelineRunStatus.CANCELLED.value:
                    if pipeline_runs is not None:
                        cancel_pipeline_runs(pipeline_runs=pipeline_runs)
                    elif pipeline_schedule_id is not None:
                        cancel_pipeline_runs(pipeline_schedule_id=pipeline_schedule_id)
                    else:
                        cancel_pipeline_runs(pipeline_uuid=pipeline_uuid)
                elif status == 'retry' and pipeline_runs:
                    retry_pipeline_runs(pipeline_runs)
                elif status == 'retry_incomplete_block_runs':
                    retry_incomplete_block_runs(pipeline_uuid)

            cache = await PipelineCache.initialize_cache()
            cache.update_model(resource.model)

        self.on_update_callback = _update_callback

        return self
