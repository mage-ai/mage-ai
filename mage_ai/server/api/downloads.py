import os
import tempfile
import zipfile

import jwt
from tornado import gen, iostream

from mage_ai.api.utils import authenticate_client_and_token
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.server.api.base import BaseHandler
from mage_ai.settings import JWT_DOWNLOAD_SECRET, REQUIRE_USER_AUTHENTICATION
from mage_ai.settings.repo import get_repo_path


class ApiDownloadHandler(BaseHandler):
    async def get(self, pipeline_uuid, block_uuid, **kwargs):
        self.set_header('Content-Type', 'text/csv')
        self.set_header('Content-Disposition', 'attachment; filename=' + f'{block_uuid}.csv')

        api_key = self.get_argument('api_key', None, True)
        token = self.get_argument('token', None, True)
        user = None
        if REQUIRE_USER_AUTHENTICATION:
            authenticated = False
            if api_key and token:
                oauth_client = Oauth2Application.query.filter(
                    Oauth2Application.client_id == api_key,
                ).first()
                if oauth_client:
                    oauth_token, valid = authenticate_client_and_token(oauth_client.id, token)
                    user = oauth_token.user
                    authenticated = valid and \
                        oauth_token and \
                        oauth_token.user
            if not authenticated:
                raise Exception('Unauthorized access to download block output.')

        repo_path = get_repo_path(user=user)

        pipeline = Pipeline.get(pipeline_uuid, repo_path=repo_path)
        block = pipeline.get_block(block_uuid)
        pipeline_run_id = self.get_argument('pipeline_run_id', None)
        execution_partition = None
        if pipeline_run_id is not None:
            pipeline_run = PipelineRun.query.get(pipeline_run_id)
            execution_partition = pipeline_run.execution_partition

        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')

        tables = block.get_outputs(
            execution_partition=execution_partition,
            include_print_outputs=False,
            csv_lines_only=True,
            sample=False,
            variable_type=VariableType.DATAFRAME,
        )
        for data in tables:
            table = data.get('table', [])
            line_count = len(table)
            for line in range(0, line_count):
                is_last_line = line == line_count - 1
                try:
                    csv_line = table[line] if is_last_line else table[line] + '\n'
                    self.write(csv_line.encode('UTF-8'))
                except iostream.StreamClosedError:
                    break
                if line % 5000 == 0 or is_last_line:
                    await self.flush()
                    # Sleep for a nanosecond so other handlers can run and avoid blocking
                    await gen.sleep(0.000000001)


class ApiResourceDownloadHandler(BaseHandler):

    def get(self, token):
        try:
            decoded_payload = jwt.decode(token, JWT_DOWNLOAD_SECRET, algorithms=['HS256'])

            file_name = decoded_payload['file_name']
            file_list = decoded_payload['file_list']
            self.ignore_folder_structure = decoded_payload['ignore_folder_structure']

            self.abs_repo_path = os.path.abspath(get_repo_path())

            relative_file_list = list(map(self.relative_path_mapping, file_list))

            try:
                file_pointer = self.get_file_pointer(file_list, relative_file_list)

                while True:
                    _buffer = file_pointer.read(4096)
                    if not _buffer:
                        break
                    self.write(_buffer)
            except Exception as e:
                self.set_status(400)
                self.write(f'Error fetching file {file_name}.\n{e}')
            finally:
                file_pointer.close()

            self.set_header('Content-Type', 'application/force-download')
            self.set_header('Content-Disposition', f'attachment; filename={file_name}')
            self.flush()
        except jwt.exceptions.ExpiredSignatureError:
            self.set_status(400)
            self.write('Download token is expired.')
        except (jwt.exceptions.InvalidSignatureError, jwt.exceptions.DecodeError):
            self.set_status(400)
            self.write('Download token is invalid.')
        except ValueError as e:
            self.set_status(400)
            self.write(f'Attepmt at fetching file outside of project folder: {e}')

    # file pointer points to either a singular file or a temporary zip
    def get_file_pointer(self, file_list, relative_file_list):
        if len(file_list) == 1:
            if file_list[0].endswith('.xlsx'):  # Check if it's an XLSX file
                return open(file_list[0], 'rb')  # Open in binary mode for XLSX
            else:
                return open(file_list[0])
        return self.zip_files(file_list, relative_file_list)

    # creates a temporary zip and returns the (open) file pointer
    def zip_files(self, file_list, relative_file_list):
        zip_file = tempfile.NamedTemporaryFile(suffix='.zip', mode='w+b')
        with zipfile.ZipFile(zip_file, 'w') as zipf:
            for path, relative in zip(file_list, relative_file_list):
                zipf.write(path, relative)
        zip_file.seek(0)  # set cursor to start of file to prepare for content extraction
        return zip_file

    def relative_path_mapping(self, path):
        abs_path = os.path.abspath(path)
        common_ground = os.path.commonpath([self.abs_repo_path, abs_path])

        # trying to access files outside of the project folder
        if common_ground != self.abs_repo_path:
            raise ValueError(abs_path)

        return (os.path.basename(abs_path)
                if self.ignore_folder_structure
                else os.path.relpath(abs_path, common_ground))
