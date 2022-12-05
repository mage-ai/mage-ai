from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.orchestration.db.models import PipelineRun, BlockRun
from sqlalchemy import or_
from typing import Dict, List, Tuple
import json
import re


def calculate_metrics(pipeline_run: PipelineRun) -> Dict:
    pipeline = IntegrationPipeline.get(pipeline_run.pipeline_uuid)

    if PipelineType.INTEGRATION != pipeline.type:
        return

    stream_ors = []
    for s in pipeline.streams():
        stream = s['tap_stream_id']
        stream_ors += [
            BlockRun.block_uuid.contains(f'{pipeline.data_loader.uuid}:{stream}'),
            BlockRun.block_uuid.contains(f'{pipeline.data_exporter.uuid}:{stream}'),
        ]
    all_block_runs = BlockRun.query.filter(
        BlockRun.pipeline_run_id == pipeline_run.id,
        or_(*stream_ors),
    ).all()

    block_runs_by_stream = {}
    for br in all_block_runs:
        block_uuid = br.block_uuid
        parts = block_uuid.split(':')
        uuid = parts[0]
        stream = parts[1]
        if stream not in block_runs_by_stream:
            block_runs_by_stream[stream] = []
        block_runs_by_stream[stream].append(br)

    for s in pipeline.streams():
        stream = s['tap_stream_id']

        destinations = []
        sources = []

        block_runs = block_runs_by_stream.get(stream, [])
        for br in block_runs:
            logs_arr = br.logs['content'].split('\n')

            if f'{pipeline.data_loader.uuid}:{stream}' in br.block_uuid:
                sources.append(logs_arr)
            elif f'{pipeline.data_exporter.uuid}:{stream}' in br.block_uuid:
                destinations.append(logs_arr)

        block_runs_by_stream[stream] = dict(
            destinations=destinations,
            sources=sources,
        )

    shared_metric_keys = [
        'block_tags',
        'error',
        'errors',
        'message',
    ]

    block_metrics_by_stream = get_metrics(block_runs_by_stream, [
        ('sources', shared_metric_keys + [
            'record',
            'records',
        ]),
        ('destinations', shared_metric_keys + [
            'record',
            'records',
            'records_affected',
            'records_inserted',
            'records_updated',
            'state',
        ]),
    ])

    pipeline_logs_by_stream = {}
    pipeline_logs = pipeline_run.logs['content'].split('\n')
    for l in pipeline_logs:
        tags = parse_line(l)
        stream = tags.get('stream')
        if not stream:
            continue

        if stream not in pipeline_logs_by_stream:
            pipeline_logs_by_stream[stream] = []

        pipeline_logs_by_stream[stream].append(l)

    pipeline_metrics_by_stream = {}
    for s in pipeline.streams():
        stream = s['tap_stream_id']
        logs = pipeline_logs_by_stream.get(stream, [])

        pipeline_metrics_by_stream[stream] = get_metrics(dict(pipeline=dict(pipeline=[logs])), [
            ('pipeline', shared_metric_keys + [
                'bookmarks',
                'number_of_batches',
                'record_counts',
            ]),
        ])['pipeline']['pipeline']

    pipeline_run.update(metrics=dict(
        blocks=block_metrics_by_stream,
        destination=pipeline.destination_uuid,
        pipeline=pipeline_metrics_by_stream,
        source=pipeline.source_uuid,
    ))

    return pipeline_run.metrics


def parse_line(l: str) -> Dict:
    tags = {}
    text = re.sub('^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}', '', l).strip()

    try:
        data1 = json.loads(text)
        tags = data1.get('tags', {})
        try:
            data2 = json.loads(data1.get('message', ''))
            tags.update(data2.get('tags', {}))
        except json.JSONDecodeError as err:
            pass
    except json.JSONDecodeError as err:
        pass

    return tags


def get_metrics(logs_by_uuid: Dict, key_and_key_metrics: List[Tuple[str, List[str]]]) -> Dict:
    metrics = {}

    for uuid in logs_by_uuid.keys():
        metrics[uuid] = {}

        for key, key_metrics in key_and_key_metrics:
            metrics[uuid][key] = {}

            logs_for_uuid = logs_by_uuid[uuid][key]
            for logs in logs_for_uuid:
                temp_metrics = {}

                for idx, l in enumerate(logs):
                    tags = parse_line(l)

                    for key_metric in key_metrics:
                        if key_metric in tags:
                            temp_metrics[key_metric] = tags[key_metric]

                for key_metric, value in temp_metrics.items():
                    if key_metric not in metrics[uuid][key]:
                        metrics[uuid][key][key_metric] = 0

                    if type(value) is int:
                        metrics[uuid][key][key_metric] += value
                    else:
                        metrics[uuid][key][key_metric] = value

    return metrics
