import os
import tempfile
from unittest import TestCase

from mage_ai.server.api.downloads import ApiResourceDownloadHandler


class ApiResourceDownloadHandlerTests(TestCase):

    def assert_single_file_download_opens_as_binary(self, filename):
        content = b'\xff\xfearchive-data'
        handler = ApiResourceDownloadHandler.__new__(ApiResourceDownloadHandler)

        with tempfile.TemporaryDirectory() as tmp_dir:
            file_path = os.path.join(tmp_dir, filename)
            with open(file_path, 'wb') as file:
                file.write(content)

            file_pointer = handler.get_file_pointer([file_path], [filename])
            try:
                self.assertEqual(content, file_pointer.read())
            finally:
                file_pointer.close()

    def test_get_file_pointer_opens_zip_as_binary(self):
        self.assert_single_file_download_opens_as_binary('archive.zip')

    def test_get_file_pointer_opens_tar_gz_as_binary(self):
        self.assert_single_file_download_opens_as_binary('archive.tar.gz')
