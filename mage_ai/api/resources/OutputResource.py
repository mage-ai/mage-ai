from typing import Dict

import pandas as pd

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block.data_integration.utils import (
    fetch_data,
    persist_data_for_stream,
    read_data_from_cache,
)
from mage_ai.data_preparation.models.block.utils import serialize_output
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import BlockRun
from mage_ai.settings.repo import get_repo_path


class OutputResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        query = {}
        for key in [
            'sample_count',
        ]:
            value = query_arg.get(key, [None])
            if value:
                value = value[0]
                if value is not None:
                    query[key] = value

        parent_model = kwargs['parent_model']

        outputs = []
        if type(parent_model) is BlockRun:
            outputs = parent_model.get_outputs(
                sample_count=query.get('sample_count', DATAFRAME_SAMPLE_COUNT),
                exclude_blank_variable_uuids=True,
            )

        return self.build_result_set(
            outputs,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload: Dict, user, **kwargs) -> 'OutputResource':
        block_uuid = payload.get('block_uuid')
        pipeline_uuid = payload.get('pipeline_uuid')
        partition = payload.get('partition')
        persist = payload.get('persist') or False
        refresh = payload.get('refresh') or False
        sample_count = payload.get('sample_count') or None
        if sample_count:
            sample_count = int(sample_count)

        model = dict(outputs=[])

        if block_uuid and pipeline_uuid:
            repo_path = get_repo_path(user=user)
            pipeline = Pipeline.get(pipeline_uuid, repo_path=repo_path)
            block = pipeline.get_block(block_uuid)

            if block.is_data_integration():
                streams = payload.get('streams')
                outputs_by_stream = {}
                outputs_by_stream_serialized = {}

                # 1. Try to get the sample data that is stored as block outputs
                if not refresh:
                    for stream in streams:
                        parent_stream = stream.get('parent_stream')
                        stream_id = stream.get('stream')
                        # This data is already serialized
                        outputs = read_data_from_cache(
                            block,
                            stream_id,
                            parent_stream=parent_stream,
                            partition=partition,
                            sample_count=sample_count,
                        )
                        if outputs:
                            outputs_by_stream[stream_id] = outputs[0]
                            outputs_by_stream_serialized[stream_id] = outputs[0]

                # 2. If no block outputs exist, invoke the sample data function
                if refresh:
                    # This data is not yet serialized
                    outputs_by_stream = fetch_data(
                        block,
                        partition=partition,
                        sample_count=sample_count,
                        selected_streams=streams,
                    )

                # 3. Store the sample data as block outputs for repeat reads
                if outputs_by_stream and len(outputs_by_stream) >= 1:
                    for stream_id, output in outputs_by_stream.items():
                        output_serialized = outputs_by_stream_serialized.get(stream_id)
                        if not output_serialized:
                            should_map_serialize_output = False
                            if isinstance(output, list) and len(output) >= 1:
                                if isinstance(output[0], pd.DataFrame):
                                    if len(output) >= 2:
                                        should_map_serialize_output = True
                                    else:
                                        output = output[0]

                            if should_map_serialize_output:
                                output_serialized = [serialize_output(block, o) for o in output]
                            else:
                                output_serialized = serialize_output(block, output)

                        model['outputs'].append(
                            dict(
                                data=output_serialized,
                                uuid=stream_id,
                            )
                        )

                        if refresh and persist:
                            persist_data_for_stream(
                                block,
                                stream_id,
                                output,
                                partition=partition,
                            )
        return self(model, user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        query = kwargs.get('query', {})

        payload = {}
        for key in [
            'block_uuid',
            'parent_stream',
            'partition',
            'sample_count',
            'stream',
        ]:
            value = query.get(key, [None])
            if value:
                value = value[0]
                payload[key] = value

        partition = payload.get('partition')
        sample_count = payload.get('sample_count') or None
        if sample_count:
            sample_count = int(sample_count)
        else:
            sample_count = DATAFRAME_SAMPLE_COUNT

        model = dict(outputs=[])

        pipeline = kwargs.get('parent_model')
        block = pipeline.get_block(pk)
        if block and block.is_data_integration():
            outputs_by_stream = {}
            outputs_by_stream_serialized = {}

            stream_id = payload.get('stream')
            if stream_id:
                # This data is already serialized
                outputs = read_data_from_cache(
                    block,
                    stream_id,
                    partition=partition,
                    sample_count=sample_count,
                )

                if outputs:
                    outputs_by_stream[stream_id] = outputs[0]
                    outputs_by_stream_serialized[stream_id] = outputs[0]

                if len(outputs_by_stream) >= 1:
                    for stream_id, output in outputs_by_stream.items():
                        output_serialized = outputs_by_stream_serialized.get(stream_id)
                        if not output_serialized:
                            output_serialized = serialize_output(block, output)

                        model['outputs'].append(
                            dict(
                                data=output_serialized,
                                uuid=stream_id,
                            )
                        )

        return self(model, user, **kwargs)
