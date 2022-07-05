from jupyter_client import KernelManager
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path, init_repo, set_repo_path
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.server.kernel_output_parser import parse_output_message
from mage_ai.server.subscriber import get_messages
from mage_ai.server.websocket import WebSocketServer
import asyncio
import json
import os
import tornado.ioloop
import tornado.web
import traceback

manager = KernelManager()


class BaseHandler(tornado.web.RequestHandler):
    def check_origin(self, origin):
        return True

    def options(self, **kwargs):
        self.set_status(204)
        self.finish()

    def set_default_headers(self):
        self.set_header('Access-Control-Allow-Headers', '*')
        self.set_header('Access-Control-Allow-Methods', 'DELETE, GET, PATCH, POST, PUT, OPTIONS')
        self.set_header('Access-Control-Allow-Origin', '*')
        self.set_header('Content-Type', 'application/json')

    def write_error(self, status_code, **kwargs):
        if status_code == 500:
            exception = kwargs['exc_info'][1]
            self.write(
                dict(
                    error=dict(
                        code=status_code,
                        errors=traceback.format_stack(),
                        exception=str(exception),
                        message=traceback.format_exc(),
                    )
                )
            )


class ApiBlockHandler(BaseHandler):
    def delete(self, block_type, block_uuid):
        block = Block(block_uuid, block_uuid, block_type)
        if not block.exists():
            raise Exception(f'Block {block_uuid} does not exist')
        block.delete()
        self.write(dict(block=block.to_dict()))


class ApiFileListHandler(BaseHandler):
    def get(self):
        self.write(dict(files=File.get_all_files(get_repo_path())))

    def post(self):
        data = json.loads(self.request.body).get('file', {})
        file = File.create(data.get('name'), data.get('dir_path'), get_repo_path())
        self.write(dict(file=file.to_dict()))


class ApiFileContentHandler(BaseHandler):
    def get(self):
        file_path = self.get_argument('path', None)
        file = File.from_path(file_path, get_repo_path())
        self.write(dict(file=file.to_dict(include_content=True)))

    def post(self):
        data = json.loads(self.request.body).get('file', {})
        path = data.get('path')
        content = data.get('content')
        file = File.from_path(path, get_repo_path())
        file.update_content(content)
        self.write(dict(file=file.to_dict(include_content=True)))


class ApiPipelineHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        include_content = self.get_argument('include_content', False)
        self.write(dict(pipeline=pipeline.to_dict(include_content=include_content)))
        self.finish()

    def put(self, pipeline_uuid):
        """
        Allow updating pipeline name and uuid
        """
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        update_content = self.get_argument('update_content', False)
        data = json.loads(self.request.body).get('pipeline', {})
        pipeline.update(data, update_content=update_content)
        self.write(dict(pipeline=pipeline.to_dict(include_content=update_content)))


class ApiPipelineExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        asyncio.run(pipeline.execute())
        self.write(dict(pipeline=pipeline.to_dict()))
        self.finish()


class ApiPipelineListHandler(BaseHandler):
    def get(self):
        pipelines = Pipeline.get_all_pipelines(get_repo_path())
        self.write(dict(pipelines=pipelines))
        self.finish()

    def post(self):
        data = json.loads(self.request.body)
        name = data.get('pipeline', {}).get('name')
        pipeline = Pipeline.create(name, get_repo_path())
        self.write(dict(pipeline=pipeline.to_dict()))


class ApiPipelineBlockHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        self.write(dict(block=pipeline.get_block(block_uuid).to_dict()))
        self.finish()

    def put(self, pipeline_uuid, block_uuid):
        """
        Allow updating block name, uuid, upstream_block, and downstream_blocks
        """
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        data = json.loads(self.request.body).get('block', {})
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.update(data)
        self.write(dict(block=block.to_dict()))

    def delete(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.delete()
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        asyncio.run(block.execute())
        self.write(dict(block=block.to_dict(include_outputs=True)))
        self.finish()


class ApiPipelineBlockListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        self.write(dict(blocks=pipeline.to_dict()['blocks']))
        self.finish()

    def post(self, pipeline_uuid):
        """
        Create block and add to pipeline
        """
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block_data = json.loads(self.request.body).get('block', {})
        block = Block.create(
            block_data.get('name') or block_data.get('uuid'),
            block_data.get('type'),
            get_repo_path(),
            pipeline=pipeline,
            upstream_block_uuids=block_data.get('upstream_blocks', []),
            config=block_data.get('config'),
        )
        pipeline.add_block(block, block_data.get('upstream_blocks', []))
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockAnalysisHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        analyses = block.get_analyses()
        self.write(dict(analyses=analyses))


class ApiPipelineBlockOutputHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        outputs = block.get_outputs()
        self.write(dict(outputs=outputs))


class ApiPipelineVariableListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        variables = VariableManager(get_repo_path()).get_variables_by_pipeline(pipeline_uuid)
        self.write(variables)
        self.finish()


class KernelsHandler(BaseHandler):
    def get(self, kernel_id=None):
        kernels = []

        if manager.has_kernel:
            kernels.append(
                dict(
                    alive=manager.is_alive(),
                    id=manager.kernel_id,
                    name=manager.kernel_name,
                )
            )

        r = json.dumps(dict(kernels=kernels))
        self.write(r)

    def post(self, kernel_id, action_type):
        if 'interrupt' == action_type:
            manager.interrupt_kernel()
        elif 'restart' == action_type:
            try:
                manager.restart_kernel()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    manager.start_kernel()
            os.environ['CONNECTION_FILE'] = manager.connection_file

        r = json.dumps(
            dict(
                kernel=dict(
                    id=kernel_id,
                ),
            )
        )
        self.write(r)
        self.finish()


def make_app():
    return tornado.web.Application(
        [
            (r'/websocket/', WebSocketServer),
            (r'/api/blocks/(?P<block_type>\w+)/(?P<block_uuid>\w+)', ApiBlockHandler),
            (r'/api/files', ApiFileListHandler),
            (r'/api/file_content', ApiFileContentHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/execute', ApiPipelineExecuteHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)', ApiPipelineHandler),
            (r'/api/pipelines', ApiPipelineListHandler),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/execute',
                ApiPipelineBlockExecuteHandler,
            ),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)',
                ApiPipelineBlockHandler,
            ),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/analyses',
                ApiPipelineBlockAnalysisHandler,
            ),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/outputs',
                ApiPipelineBlockOutputHandler,
            ),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks', ApiPipelineBlockListHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/variables', ApiPipelineVariableListHandler),
            (r'/api/kernels', KernelsHandler),
            (r'/api/kernels/(?P<kernel_id>[\w\-]*)/(?P<action_type>[\w\-]*)', KernelsHandler),
        ],
        autoreload=True,
    )


async def main(repo_path: str = None):
    if repo_path is None:
        repo_path = os.path.join(os.getcwd(), 'default_repo')
    if not os.path.exists(repo_path):
        init_repo(repo_path)
    set_repo_path(repo_path)

    manager.start_kernel()
    os.environ['CONNECTION_FILE'] = manager.connection_file

    app = make_app()
    app.listen(6789)

    get_messages(
        manager.client(),
        lambda content: WebSocketServer.send_message(
            parse_output_message(content),
        ),
    )

    await asyncio.Event().wait()


if __name__ == '__main__':
    print('Starting server...')

    asyncio.run(main())
