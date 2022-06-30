from jupyter_client import KernelManager
from jupyter_client.multikernelmanager import MultiKernelManager
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.repo_manager import init_repo
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.server.kernel_output_parser import parse_output_message
from mage_ai.server.subscriber import get_messages
from mage_ai.server.websocket import WebSocketServer
import asyncio
import json
import os
import tornado.ioloop
import tornado.web

# TODO: Set repo_path when launching server
repo_path = os.path.join(os.getcwd(), 'default_repo')
if not os.path.exists(repo_path):
    init_repo(repo_path)
manager = KernelManager()


class BaseHandler(tornado.web.RequestHandler):
    def check_origin(self, origin):
        return True

    def set_default_headers(self):
        self.set_header('Content-Type', 'application/json')


class ApiHandler(BaseHandler):
    def get(self):
        value = self.get_argument('value', None)
        r = json.dumps(dict(
            method='get',
            value=value,
        ))
        self.write(r)
        self.finish()

    def post(self):
        r = json.dumps(dict(
            method='post',
        ))
        self.write(r)


class ApiFileListHandler(BaseHandler):
    def get(self):
        self.write(dict(files=File.get_all_files(repo_path)))

    def post(self):
        data = json.loads(self.request.body).get('file', {})
        file = File.create(data.get('name'), data.get('dir_path'), repo_path)
        self.write(dict(file=file.to_dict()))


class ApiFileContentHandler(BaseHandler):
    def get(self):
        file_path = self.get_argument('path', None)
        file = File.from_path(file_path, repo_path)
        self.write(dict(file=file.to_dict(include_content=True)))

    def post(self):
        data = json.loads(self.request.body).get('file', {})
        path = data.get('path')
        content = data.get('content')
        file = File.from_path(path, repo_path)
        file.update_content(content)
        self.write(dict(file=file.to_dict(include_content=True)))


class ApiPipelineHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, repo_path)
        self.write(dict(pipeline=pipeline.to_dict()))
        self.finish()

    def put(self, pipeline_uuid):
        """
        Allow updating pipeline name and uuid
        """
        pipeline = Pipeline(pipeline_uuid, repo_path)
        data = json.loads(self.request.body).get('pipeline', {})
        pipeline.update(data)
        self.write(dict(pipeline=pipeline.to_dict()))


class ApiPipelineListHandler(BaseHandler):
    def get(self):
        pipelines = Pipeline.get_all_pipelines(repo_path)
        self.write(dict(pipelines=pipelines))
        self.finish()

    def post(self):
        data = json.loads(self.request.body)
        name = data.get('pipeline', {}).get('name')
        pipeline = Pipeline.create(name, repo_path)
        self.write(dict(pipeline=pipeline.to_dict()))


class ApiPipelineBlockHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, repo_path)
        self.write(dict(block=pipeline.get_block(block_uuid).to_dict()))
        self.finish()

    def put(self, pipeline_uuid, block_uuid):
        """
        Allow updating block name, uuid, upstream_block, and downstream_blocks
        """
        pipeline = Pipeline(pipeline_uuid, repo_path)
        data = json.loads(self.request.body).get('block', {})
        block = pipeline.get_block(block_uuid)
        block.update(data)
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, repo_path)
        self.write(dict(blocks=pipeline.to_dict()['blocks']))
        self.finish()

    def post(self, pipeline_uuid):
        """
        Create block and add to pipeline
        """
        pipeline = Pipeline(pipeline_uuid, repo_path)
        block_data = json.loads(self.request.body).get('block', {})
        block = Block.create(block_data.get('name'), block_data.get('type'), repo_path)
        pipeline.add_block(block, block_data.get('upstream_blocks', []))
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockAnalysisHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, repo_path)
        block = pipeline.get_block(block_uuid)
        analyses = block.get_analyses()
        self.write(dict(analyses=analyses))


class ApiPipelineBlockOutputHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, repo_path)
        block = pipeline.get_block(block_uuid)
        outputs = block.get_outputs()
        self.write(dict(outputs=outputs))


class ApiPipelineVariableListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        variables = VariableManager(repo_path).get_variables_by_pipeline(pipeline_uuid)
        self.write(variables)
        self.finish()


class KernelsHandler(BaseHandler):
    def get(self, kernel_id, action):
        if 'interrupt' == action:
            manager.interrupt_kernel()
        elif 'restart' == action:
            manager.restart_kernel()

        r = json.dumps(dict(
            method='get',
            value=kernel_id,
        ))
        self.write(r)
        self.finish()


def make_app():
    return tornado.web.Application(
        [
            (r'/websocket/', WebSocketServer),
            (r'/api/', ApiHandler),
            (r'/api/files', ApiFileListHandler),
            (r'/api/file_content', ApiFileContentHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)', ApiPipelineHandler),
            (r'/api/pipelines', ApiPipelineListHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)',
                ApiPipelineBlockHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/analyses',
                ApiPipelineBlockAnalysisHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/outputs',
                ApiPipelineBlockOutputHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks', ApiPipelineBlockListHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/variables',
                ApiPipelineVariableListHandler),
            (r'/kernels/(?P<kernel_id>[\w\-]+)/(?P<action>\w+)', KernelsHandler),
        ],
        autoreload=True,
    )


async def main():
    manager.start_kernel()
    os.environ['KERNEL_ID'] = manager.kernel_id

    connection_file = manager.connection_file
    os.environ['CONNECTION_FILE'] = connection_file

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
