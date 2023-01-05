from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.utils.block.convert_content import convert_to_block
from mage_ai.server.api.base import BaseHandler
import asyncio
import json
import urllib.parse


class ApiBlockHandler(BaseHandler):
    def delete(self, block_type_and_uuid_encoded):
        block_type_and_uuid = urllib.parse.unquote(block_type_and_uuid_encoded)
        parts = block_type_and_uuid.split('/')
        if len(parts) != 2:
            raise Exception('The url path should be in block_type/block_uuid format.')
        block_type = parts[0]
        block_uuid = parts[1]
        block = Block(block_uuid, block_uuid, block_type)
        if not block.exists():
            raise Exception(f'Block {block_uuid} does not exist')
        block.delete()
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        include_outputs = self.get_bool_argument('include_outputs', True)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        self.write(
            dict(
                block=block.to_dict(
                    include_content=True,
                    include_outputs=include_outputs,
                )
            )
        )
        self.finish()

    def put(self, pipeline_uuid, block_uuid):
        """
        Allow updating block name, uuid, type, upstream_block, and downstream_blocks
        """
        pipeline = Pipeline.get(pipeline_uuid)
        data = json.loads(self.request.body).get('block', {})
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.update(data)
        self.write(dict(block=block.to_dict(include_content=True)))

    def delete(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.delete()
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        asyncio.run(block.execute())
        self.write(
            dict(
                block=block.to_dict(
                    include_outputs=True,
                )
            )
        )
        self.finish()


class ApiPipelineBlockListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        include_outputs = self.get_bool_argument('include_outputs', True)
        self.write(
            dict(
                blocks=pipeline.to_dict(
                    include_content=True,
                    include_outputs=include_outputs,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )['blocks']
            )
        )
        self.finish()

    def post(self, pipeline_uuid):
        """
        Create block and add to pipeline
        """
        pipeline = Pipeline.get(pipeline_uuid)
        payload = json.loads(self.request.body).get('block', {})
        block = Block.create(
            payload.get('name') or payload.get('uuid'),
            payload.get('type'),
            get_repo_path(),
            config=payload.get('config'),
            configuration=payload.get('configuration'),
            language=payload.get('language'),
            pipeline=pipeline,
            priority=payload.get('priority'),
            upstream_block_uuids=payload.get('upstream_blocks', []),
        )

        content = payload.get('content')
        if content:
            if payload.get('converted_from'):
                content = convert_to_block(block, content)

            block.update_content(content)

        self.write(dict(block=block.to_dict(include_content=True)))


class ApiPipelineBlockAnalysisHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        analyses = block.get_analyses()
        self.write(dict(analyses=analyses))


class ApiPipelineBlockOutputHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        # Only fetch dataframe variables by default
        outputs = block.get_outputs(
            include_print_outputs=False,
            sample_count=None,
            variable_type=VariableType.DATAFRAME,
        )

        self.write(dict(outputs=outputs))
