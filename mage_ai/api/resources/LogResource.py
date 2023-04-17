from datetime import datetime
from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.constants import LOGS_DIR, PIPELINES_FOLDER
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun, PipelineSchedule
from mage_ai.shared.array import flatten
from sqlalchemy.orm import aliased
from typing import Dict, List
import json
import os
import re
import time

TIMESTAMP_REGEX = re.compile(r'([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}) (.+)')


def is_json_string(string):
    if not string:
        return False

    try:
        json.loads(string)
    except ValueError:
        return False

    return True


def initialize_log(log):
    content = log['content']
    match = re.match(TIMESTAMP_REGEX, content)

    datetime = match.group(1) if match else None
    data_raw = match.group(2) if match else None

    data = {}
    if data_raw and is_json_string(data_raw):
        data = json.loads(data_raw)

    return {
        **log,
        'created_at': datetime,
        'data': data,
    }


def initialize_logs(log) -> List[Dict]:
    content = log['content']
    parts = re.split(TIMESTAMP_REGEX, content)
    arr = []

    subparts = []
    for part in parts:
        if part == '\n':
            if len(subparts) >= 1:
                arr.append(' '.join(subparts).strip())
            subparts = []
        elif len(list(filter(bool, subparts))) <= 1:
            subparts.append(part.strip())
    arr.append(' '.join(subparts).strip())

    return list(map(lambda content2: initialize_log({
        **log,
        'content': content2,
    }), arr))


def remove_date_hour_subpath(path) -> str:
    parts = path.split('/')
    final_path = '/'.join(parts)
    if parts[-4] != LOGS_DIR:
        parts_without_date_hour_subpath = parts[:-3] + parts[-1:]
        final_path = '/'.join(parts_without_date_hour_subpath)

    return final_path


def get_log_filepaths(
    meta: Dict,
    log_filepath_groupings: List[tuple],
    groupings_count: int,
) -> Dict:
    log_filepaths_batch = log_filepath_groupings
    has_next = False
    if meta.get(META_KEY_LIMIT, None) is not None:
        limit = int(meta[META_KEY_LIMIT])
        log_filepaths_batch = log_filepath_groupings[:limit]
        has_next = groupings_count > limit
        if meta.get(META_KEY_OFFSET, None) is not None:
            offset = int(meta[META_KEY_OFFSET])
            log_filepaths_batch = log_filepath_groupings[offset:limit]

    log_filepaths = flatten([tuple[1] for tuple in log_filepaths_batch])

    return dict(
        filepaths=log_filepaths,
        has_next=has_next,
    )


def process_logs(
    logs: List[Dict],
    unix_start_timestamp: int = None,
    unix_end_timestamp: int = None,
) -> List[Dict]:
    logs_parsed_list = [initialize_logs(log) for log in logs]
    logs_parsed = flatten(logs_parsed_list)
    if unix_start_timestamp:
        logs_parsed = [
            log for log in logs_parsed
            if log.get('data', {}).get('timestamp', 0) >= unix_start_timestamp
        ]
    if unix_end_timestamp:
        logs_parsed = [
            log for log in logs_parsed
            if log.get('data', {}).get('timestamp', time.time()) <= unix_end_timestamp
        ]

    return logs_parsed


class LogResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        parent_model = kwargs['parent_model']

        arr = []
        next = False
        count = 0
        if type(parent_model) is BlockRun:
            arr = parent_model.logs
        elif issubclass(parent_model.__class__, Pipeline):
            logs_dict = await self.__pipeline_logs(parent_model, query, meta)
            arr = logs_dict['arr']
            next = logs_dict['next']
            count = logs_dict['count']

        result_set = self.build_result_set(
            arr,
            user,
            **kwargs,
        )
        result_set.metadata = {
            'count': count,
            'next': next,
        }

        return result_set

    @classmethod
    @safe_db_query
    async def __pipeline_logs(self, pipeline: Pipeline, query_arg, meta) -> Dict:
        pipeline_uuid = pipeline.uuid

        start_timestamp = query_arg.get('start_timestamp', [None])
        unix_start_timestamp = None
        unix_end_timestamp = None
        if start_timestamp:
            start_timestamp = start_timestamp[0]
        end_timestamp = query_arg.get('end_timestamp', [None])
        if end_timestamp:
            end_timestamp = end_timestamp[0]

        error = ApiError.RESOURCE_INVALID.copy()
        if start_timestamp:
            try:
                unix_start_timestamp = int(start_timestamp)
                start_timestamp = datetime.fromtimestamp(int(start_timestamp))
            except (ValueError, OverflowError):
                error.update(message='Value is invalid for start_timestamp.')
                raise ApiError(error)
        if end_timestamp:
            try:
                unix_end_timestamp = int(end_timestamp)
                end_timestamp = datetime.fromtimestamp(int(end_timestamp))
            except (ValueError, OverflowError):
                error.update(message='Value is invalid for end_timestamp.')
                raise ApiError(error)

        pipeline_schedule_ids = query_arg.get('pipeline_schedule_id[]', [None])
        if pipeline_schedule_ids:
            pipeline_schedule_ids = pipeline_schedule_ids[0]
        if pipeline_schedule_ids:
            pipeline_schedule_ids = pipeline_schedule_ids.split(',')
        else:
            pipeline_schedule_ids = []

        block_uuids = query_arg.get('block_uuid[]', [None])
        if block_uuids:
            block_uuids = block_uuids[0]
        if block_uuids:
            block_uuids = block_uuids.split(',')
        else:
            block_uuids = []

        pipeline_run_ids = query_arg.get('pipeline_run_id[]', [None])
        if pipeline_run_ids:
            pipeline_run_ids = pipeline_run_ids[0]
        if pipeline_run_ids:
            pipeline_run_ids = pipeline_run_ids.split(',')
        else:
            pipeline_run_ids = []

        block_run_ids = query_arg.get('block_run_id[]', [None])
        if block_run_ids:
            block_run_ids = block_run_ids[0]
        if block_run_ids:
            block_run_ids = block_run_ids.split(',')
        else:
            block_run_ids = []

        a = aliased(PipelineRun, name='a')
        b = aliased(PipelineSchedule, name='b')
        c = aliased(BlockRun, name='c')

        columns = [
            a.execution_date,
            a.pipeline_schedule_id,
            a.pipeline_uuid,
        ]

        pipeline_run_logs = []

        @safe_db_query
        def get_pipeline_runs():
            query = (
                PipelineRun.
                select(*columns).
                join(b, a.pipeline_schedule_id == b.id).
                filter(b.pipeline_uuid == pipeline_uuid).
                order_by(a.created_at.desc())
            )

            if len(pipeline_schedule_ids):
                query = (
                    query.
                    filter(a.pipeline_schedule_id.in_(pipeline_schedule_ids))
                )

            if len(pipeline_run_ids):
                query = (
                    query.
                    filter(a.id.in_(pipeline_run_ids))
                )

            rows = query.all()

            return dict(
                rows=rows,
            )

        has_next = False
        groupings_count = 0

        if not len(block_uuids) and not len(block_run_ids):
            start_dirs = [None]
            write_date_depth = 3
            if not pipeline_schedule_ids and not pipeline_run_ids:
                # Fetch all of pipeline's logs
                pass
            elif pipeline_run_ids:
                # Fetch logs for pipeline runs
                pipeline_run_results = get_pipeline_runs()
                pipeline_run_rows = pipeline_run_results['rows']
                start_dirs = []
                for row in pipeline_run_rows:
                    pipeline_run = PipelineRun()
                    pipeline_run.execution_date = row.execution_date
                    pipeline_run.pipeline_schedule_id = row.pipeline_schedule_id
                    pipeline_run.pipeline_uuid = row.pipeline_uuid
                    start_dirs.append(pipeline_run.log_dir_path)
                write_date_depth = 1
            elif pipeline_schedule_ids:
                # Fetch logs for triggers
                start_dirs = []
                for id in pipeline_schedule_ids:
                    pipeline_schedule = PipelineSchedule()
                    pipeline_schedule.id = id
                    pipeline_schedule.pipeline_uuid = pipeline_uuid
                    start_dir = pipeline_schedule.log_dir_path
                    start_dirs.append(start_dir)
                write_date_depth = 2

            log_filepath_groupings = []
            for start_dir in start_dirs:
                grouped_log_filepaths = pipeline.get_grouped_log_filepaths(
                    start_dir=start_dir,
                    start_timestamp=start_timestamp,
                    end_timestamp=end_timestamp,
                    write_date_depth=write_date_depth,
                )
                groupings_count += grouped_log_filepaths['count']
                log_filepath_groupings.extend(grouped_log_filepaths['filepath_groupings'])

            if not log_filepath_groupings:
                logs = []
            else:
                log_filepaths = get_log_filepaths(
                    meta,
                    log_filepath_groupings,
                    groupings_count,
                )
                logs = await pipeline.logs_async(filepaths=log_filepaths['filepaths'])
                has_next = log_filepaths['has_next']

            logs_parsed = process_logs(
                logs,
                unix_start_timestamp=unix_start_timestamp,
                unix_end_timestamp=unix_end_timestamp,
            )
            pipeline_run_logs.append(logs_parsed)

        @safe_db_query
        def get_block_runs():
            query = (
                BlockRun.
                select(*(columns + [
                    c.block_uuid,
                ])).
                join(a, a.id == c.pipeline_run_id).
                join(b, a.pipeline_schedule_id == b.id).
                filter(b.pipeline_uuid == pipeline_uuid).
                order_by(c.started_at.desc())
            )

            if len(block_uuids):
                query = (
                    query.
                    filter(c.block_uuid.in_(block_uuids))
                )

            if len(block_run_ids):
                query = (
                    query.
                    filter(c.id.in_(block_run_ids))
                )

            if len(pipeline_schedule_ids):
                query = (
                    query.
                    filter(a.pipeline_schedule_id.in_(pipeline_schedule_ids))
                )

            if len(pipeline_run_ids):
                query = (
                    query.
                    filter(a.id.in_(pipeline_run_ids))
                )

            rows = query.all()

            return dict(
                rows=rows,
            )

        block_run_results = get_block_runs()
        rows = block_run_results['rows']

        block_run_logs = []

        if len(block_uuids) or len(block_run_ids):
            processed_block_run_log_files = set()
            for row in rows:
                model = PipelineRun()
                model.execution_date = row.execution_date
                model.pipeline_schedule_id = row.pipeline_schedule_id
                model.pipeline_uuid = row.pipeline_uuid

                model2 = BlockRun()
                model2.block_uuid = row.block_uuid
                model2.pipeline_run = model

                logs = await model2.logs_async(
                        start_timestamp=start_timestamp,
                        end_timestamp=end_timestamp,
                    )
                logs_parsed_list = [initialize_logs(log) for log in logs]
                logs_parsed = flatten(logs_parsed_list)
                if unix_start_timestamp:
                    logs_parsed = [
                        log for log in logs_parsed
                        if log.get('data', {}).get('timestamp', 0) >= unix_start_timestamp
                    ]
                if unix_end_timestamp:
                    logs_parsed = [
                        log for log in logs_parsed
                        if log.get('data', {}).get('timestamp', time.time()) <= unix_end_timestamp
                    ]
                block_log_file_path = \
                    remove_date_hour_subpath(logs[0].get('path')) if logs else None
                if block_log_file_path and block_log_file_path not in processed_block_run_log_files:
                    block_run_logs.append(logs_parsed)
                    processed_block_run_log_files.add(block_log_file_path)

        return dict(
            arr=[
                dict(
                    block_run_logs=block_run_logs,
                    pipeline_run_logs=pipeline_run_logs,
                ),
            ],
            count=groupings_count,
            next=has_next,
        )
