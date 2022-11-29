# from mage_ai.data_preparation.models.constants import PipelineType
# from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
# from mage_ai.orchestration.db.models import PipelineRun


# def calculate_metrics(pipeline_run: PipelineRun) -> None:
#     pipeline = IntegrationPipeline.get(pipeline_run.pipeline_uuid)

#     if PipelineType.INTEGRATION != pipeline.type:
#         return


# from mage_ai.data_preparation.models.constants import PipelineType
# from sqlalchemy import or_

# from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
# from mage_ai.orchestration.db.models import PipelineRun, BlockRun
# from mage_ai.orchestration.db import db_connection

# db_connection.start_session()

# pipeline_run = PipelineRun.query.get(15615)
# pipeline = IntegrationPipeline.get(pipeline_run.pipeline_uuid)

# pipeline_logs = pipeline_run.logs['content'].split('\n')

# block_runs_by_stream = {}

# for s in pipeline.streams():
#     stream = s['tap_stream_id']

#     destinations = []
#     sources = []

#     for br in BlockRun.query.filter(
#         BlockRun.pipeline_run_id == pipeline_run.id,
#         or_(
#             BlockRun.block_uuid.contains(f'{pipeline.data_loader.uuid}:{stream}'),
#             BlockRun.block_uuid.contains(f'{pipeline.data_exporter.uuid}:{stream}'),
#         ),
#     ).all():
#         logs_arr = br.logs['content'].split('\n')

#         if f'{pipeline.data_loader.uuid}:{stream}' in br.block_uuid:
#             sources.append(logs_arr)
#         elif f'{pipeline.data_exporter.uuid}:{stream}' in br.block_uuid:
#             destinations.append(logs_arr)

#     block_runs_by_stream[stream] = dict(
#         destinations=destinations,
#         sources=sources,
#     )


# import re
# import json

# def get_metrics(logs_by_uuid, key_and_key_metrics):
#     metrics = {}

#     for uuid in logs_by_uuid.keys():
#         metrics[uuid] = {}

#         for key, key_metrics in key_and_key_metrics:
#             metrics[uuid][key] = {}

#             logs_for_uuid = logs_by_uuid[uuid][key]
#             for logs in logs_for_uuid:
#                 temp_metrics = {}

#                 for idx, l in enumerate(logs):
#                     text = re.sub('^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}', '', l).strip()
#                     try:
#                         data1 = json.loads(text)
#                         tags = data1.get('tags', {})
#                         try:
#                             data2 = json.loads(data1.get('message', ''))
#                             tags.update(data2.get('tags', {}))
#                         except json.JSONDecodeError as err:
#                             pass

#                         for key_metric in key_metrics:
#                             if key_metric in tags:
#                                 temp_metrics[key_metric] = tags[key_metric]
#                     except json.JSONDecodeError as err:
#                         pass

#                 for key_metric, value in temp_metrics.items():
#                     if key_metric not in metrics[uuid][key]:
#                         metrics[uuid][key][key_metric] = 0
#                     metrics[uuid][key][key_metric] += value

#     return metrics

# get_metrics(block_runs_by_stream, [
#     ('sources', ['records']),
#     ('destinations', [
#         'records',
#         'records_affected',
#         'records_inserted',
#         'records_updated',
#     ]),
# ])

# get_metrics(dict(pipeline=dict(pipeline=[pipeline_logs])), [
#     ('pipeline', [
#         'destination_table',
#         'stream',
#         'bookmarks',
#         'record_counts',
#         'number_of_batches',
#     ]),
# ])

# # block_runs_by_stream['user_with_emails']['destinations'][0][0]
