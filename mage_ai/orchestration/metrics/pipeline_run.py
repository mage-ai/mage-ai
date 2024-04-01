import json
import re
from copy import deepcopy
from typing import Dict, List, Tuple

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.shared.hash import merge_dict

KEY_DESTINATION = 'destinations'
KEY_SOURCE = 'sources'

SHARED_METRIC_KEYS = [
    'block_tags',
    'error',
    'errors',
    'message',
]

KEY_TO_METRICS = {
    KEY_DESTINATION: SHARED_METRIC_KEYS
    + [
        'record',
        'records',
        'records_affected',
        'records_inserted',
        'records_updated',
        'state',
    ],
    KEY_SOURCE: SHARED_METRIC_KEYS
    + [
        'record',
        'records',
    ],
}


def calculate_pipeline_run_metrics(
    pipeline_run: PipelineRun,
    pipeline,
    logger=None,
    logging_tags: Dict = None,
) -> Dict:
    if not pipeline_run:
        return

    if logging_tags is None:
        logging_tags = dict()
    if logger:
        logger.info(
            f'Calculate metrics for pipeline run {pipeline_run.id} started.',
            **logging_tags,
        )
    try:
        __calculate_metrics(pipeline_run, pipeline)
        if logger:
            logger.info(
                f'Calculate metrics for pipeline run {pipeline_run.id} completed.',
                **merge_dict(logging_tags, dict(metrics=pipeline_run.metrics)),
            )
    except Exception as e:
        if logger:
            logger.error(
                f'Failed to calculate metrics for pipeline run {pipeline_run.id}.',
                **logging_tags,
                error=e,
            )


def calculate_source_metrics(
    pipeline_run: PipelineRun,
    block_run: BlockRun,
    pipeline,
    stream: str,
    logger=None,
    logging_tags: Dict = None,
):
    return __calculate_block_metrics(
        pipeline_run,
        block_run,
        pipeline,
        stream,
        KEY_SOURCE,
        logger=logger,
        logging_tags=logging_tags,
    )


def calculate_destination_metrics(
    pipeline_run: PipelineRun,
    block_run: BlockRun,
    pipeline,
    stream: str,
    logger=None,
    logging_tags: Dict = None,
) -> Dict:
    return __calculate_block_metrics(
        pipeline_run,
        block_run,
        pipeline,
        stream,
        KEY_DESTINATION,
        logger=logger,
        logging_tags=logging_tags,
    )


def __calculate_block_metrics(
    pipeline_run: PipelineRun,
    block_run: BlockRun,
    pipeline,
    stream: str,
    key: str,
    logger=None,
    logging_tags: Dict = None,
) -> Dict:
    """
    Calculate metrics for an integration block. Depending on the "key" argument, the
    source or destination metrics will be update for the specified stream.

    Args:
        pipeline_run (PipelineRun): The pipeline run being run.
        block_run (BlockRun): The block run to calculate metrics for. Metrics are calculated
            by parsing the block run logs.
        stream (str): The stream to calculate metrics for.
        key (str): The key to use when updating the metrics.
        logger (optional): The logger to use for logging.
        logging_tags (Dict, optional): The logging tags to use for logging.

    Returns:
        Dict: The calculated metrics.
    """
    if logging_tags is None:
        logging_tags = dict()
    if logger:
        logger.info(
            f'Calculate {key} metrics for stream {stream} started.',
            **logging_tags,
        )
    try:
        logs_arr = block_run.logs['content'].split('\n')
        logs_by_uuid = {key: [logs_arr]}
        metrics = get_metrics(
            {stream: logs_by_uuid},
            [(key, KEY_TO_METRICS.get(key, []))],
        )

        existing_metrics = deepcopy(pipeline_run.metrics or {})

        # Each source/destination block calculate metrics for only the block run itself
        # so we need to add the newly calculated metrics to the existing metrics.
        updated_block_metrics = existing_metrics.get('blocks', {})

        if stream not in updated_block_metrics:
            updated_block_metrics[stream] = {}

        if key not in updated_block_metrics[stream]:
            updated_block_metrics[stream][key] = {}

        for key_metric, value in metrics[stream][key].items():
            if key_metric not in updated_block_metrics[stream][key]:
                updated_block_metrics[stream][key][key_metric] = 0

            if isinstance(value, int):
                updated_block_metrics[stream][key][key_metric] += value
            else:
                updated_block_metrics[stream][key][key_metric] = value

        existing_metrics['blocks'] = updated_block_metrics

        new_metrics = merge_dict(
            existing_metrics,
            dict(
                destination=pipeline.destination_uuid,
                source=pipeline.source_uuid,
            ),
        )

        pipeline_run.update(metrics=new_metrics)

        if logger:
            logger.info(
                f'Calculate {key} metrics for stream {stream} completed.',
                **merge_dict(logging_tags, dict(metrics=pipeline_run.metrics)),
            )
        return pipeline_run.metrics
    except Exception as e:
        if logger:
            logger.error(
                f'Failed to calculate {key} metrics for stream {stream}.',
                **logging_tags,
                error=e,
            )


def __calculate_metrics(pipeline_run: PipelineRun, pipeline) -> Dict:
    """
    Calculate metrics for an integration pipeline run. Only the "pipeline" field
    in the metrics will be updated by calling this method.

    Metrics are calculated by parsing the logging tags of the integration pipeline run.

    Args:
        pipeline_run (PipelineRun): The pipeline run to calculate metrics for.

    Returns:
        Dict: The calculated metrics.
    """
    if PipelineType.INTEGRATION != pipeline.type:
        return

    streams = [s['tap_stream_id'] for s in pipeline.streams()]

    shared_metric_keys = [
        'block_tags',
        'error',
        'errors',
        'message',
    ]

    pipeline_metrics_by_stream = {}
    pipeline_logs_by_stream = {}
    pipeline_logs = pipeline_run.logs['content'].split('\n')
    for pipeline_log in pipeline_logs:
        tags = parse_line(pipeline_log)
        stream = tags.get('stream')
        if not stream:
            continue

        if stream not in pipeline_logs_by_stream:
            pipeline_logs_by_stream[stream] = []

        pipeline_logs_by_stream[stream].append(pipeline_log)

    for stream in streams:
        logs = pipeline_logs_by_stream.get(stream, [])

        pipeline_metrics_by_stream[stream] = get_metrics(
            dict(pipeline=dict(pipeline=[logs])),
            [
                (
                    'pipeline',
                    shared_metric_keys
                    + [
                        'bookmarks',
                        'number_of_batches',
                        'record_counts',
                    ],
                ),
            ],
        )['pipeline']['pipeline']

    existing_metrics = pipeline_run.metrics or {}
    existing_blocks_metrics = existing_metrics.get(
        'blocks', {stream: {} for stream in streams}
    )

    pipeline_run.update(
        metrics=dict(
            blocks=existing_blocks_metrics,
            destination=pipeline.destination_uuid,
            pipeline=pipeline_metrics_by_stream,
            source=pipeline.source_uuid,
        )
    )

    return pipeline_run.metrics


def parse_line(line: str) -> Dict:
    """
    Parses a line of text and extracts tags from the JSON data.

    Args:
        line (str): The input line to parse.

    Returns:
        Dict: A dictionary containing the extracted tags.

    Example:
        >>> line = '2023-01-01T12:34:56 {"tags": {"tag1": "value1", "tag2": "value2"}}'
        >>> parse_line(line)
        {'tag1': 'value1', 'tag2': 'value2'}
    """
    tags = {}

    # Remove timestamp from the beginning of the line
    text = re.sub(r'^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}', '', line).strip()

    try:
        data1 = json.loads(text)
        if type(data1) is str:
            return tags
        tags = data1.get('tags', {})
        message = data1.get('message', '')
        try:
            data2 = json.loads(message)
            tags.update(data2.get('tags', {}))
        except json.JSONDecodeError:
            tags.update(data1)
            if 'error_stacktrace' in data1:
                tags['error'] = data1['error_stacktrace']
            if 'error' in data1:
                tags['errors'] = data1['error']
    except json.JSONDecodeError:
        pass

    return tags


def get_metrics(
    logs_by_uuid: Dict, key_and_key_metrics: List[Tuple[str, List[str]]]
) -> Dict:
    metrics = {}

    for uuid in logs_by_uuid.keys():
        metrics[uuid] = {}

        for key, key_metrics in key_and_key_metrics:
            metrics[uuid][key] = {}

            logs_for_uuid = logs_by_uuid[uuid][key]
            for logs in logs_for_uuid:
                temp_metrics = {}

                for _, l in enumerate(logs):
                    tags = parse_line(l)
                    if not tags:
                        continue

                    for key_metric in key_metrics:
                        if key_metric in tags:
                            if key_metric not in temp_metrics or key != KEY_DESTINATION:
                                temp_metrics[key_metric] = [tags[key_metric]]
                            else:
                                temp_metrics[key_metric].append(tags[key_metric])

                for key_metric, value_list in temp_metrics.items():
                    if key_metric not in metrics[uuid][key]:
                        metrics[uuid][key][key_metric] = 0

                    for value in value_list:
                        if type(value) is int:
                            metrics[uuid][key][key_metric] += value
                        else:
                            metrics[uuid][key][key_metric] = value

    return metrics
