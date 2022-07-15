from .base import BaseHandler
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path


class ApiPipelineWidgetDetailHandler(BaseHandler):
    pass


class ApiPipelineWidgetListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        include_outputs = self.get_bool_argument('include_outputs', True)

        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        collection = [widget.to_dict(
            include_content=True,
            include_outputs=include_outputs,
        ) for widget in pipeline.widgets_by_uuid.values()]

        self.write(dict(widgets=collection))
        self.finish()

    # def post(self, pipeline_uuid):
    #     """
    #     Create block and add to pipeline
    #     """
    #     pipeline = Pipeline(pipeline_uuid, get_repo_path())
    #     block_data = json.loads(self.request.body).get('block', {})
    #     block = Block.create(
    #         block_data.get('name') or block_data.get('uuid'),
    #         block_data.get('type'),
    #         get_repo_path(),
    #         config=block_data.get('config'),
    #         pipeline=pipeline,
    #         priority=block_data.get('priority'),
    #         upstream_block_uuids=block_data.get('upstream_blocks', []),
    #     )
    #     pipeline.add_block(block, block_data.get('upstream_blocks', []))
    #     self.write(dict(block=block.to_dict(include_content=True)))
