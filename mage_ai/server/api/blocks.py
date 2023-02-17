from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.server.api.base import BaseHandler
import asyncio


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
