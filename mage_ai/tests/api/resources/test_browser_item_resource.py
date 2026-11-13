import os
import shutil
import tempfile
import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BrowserItemResource import BrowserItemResource
from mage_ai.system.browser.models import Item
from mage_ai.tests.base_test import AsyncDBTestCase


class BrowserItemResourceTest(AsyncDBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.original_path = os.getcwd()
        os.chdir(self.repo_path)

    @classmethod
    def tearDownClass(self):
        os.chdir(self.original_path)
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        self.outside_dir = tempfile.mkdtemp()
        self.outside_file = os.path.join(self.outside_dir, 'outside.txt')
        with open(self.outside_file, 'w') as f:
            f.write('outside the project')

    def tearDown(self):
        shutil.rmtree(self.outside_dir, ignore_errors=True)
        super().tearDown()

    def build_file_in_project(self, filename: str, content: str) -> str:
        file_path = os.path.join(self.repo_path, filename)
        with open(file_path, 'w') as f:
            f.write(content)
        return file_path

    async def test_member_file_outside_project(self):
        with self.assertRaises(ApiError) as context:
            await BrowserItemResource.member(
                urllib.parse.quote(self.outside_file, safe=''),
                None,
            )

        self.assertEqual(context.exception.type, ApiError.RESOURCE_INVALID['type'])

    async def test_member_file_outside_project_using_relative_path(self):
        relative_path = os.path.relpath(self.outside_file, self.repo_path)

        with self.assertRaises(ApiError) as context:
            await BrowserItemResource.member(
                urllib.parse.quote(relative_path, safe=''),
                None,
            )

        self.assertEqual(context.exception.type, ApiError.RESOURCE_INVALID['type'])

    async def test_member_file_in_project(self):
        file_path = self.build_file_in_project('browser_item.txt', 'in the project')

        resource = await BrowserItemResource.member(
            urllib.parse.quote(file_path, safe=''),
            None,
        )

        self.assertEqual(resource.model.content, 'in the project')
        os.remove(file_path)

    async def test_create_file_outside_project(self):
        file_path = os.path.join(self.outside_dir, 'created.txt')

        with self.assertRaises(ApiError) as context:
            await BrowserItemResource.create(
                dict(path=file_path, content='written by the API'),
                None,
            )

        self.assertEqual(context.exception.type, ApiError.RESOURCE_INVALID['type'])
        self.assertFalse(os.path.exists(file_path))

    async def test_create_file_in_project(self):
        file_path = os.path.join(self.repo_path, 'created.txt')

        await BrowserItemResource.create(
            dict(path=file_path, content='written by the API'),
            None,
        )

        self.assertTrue(os.path.exists(file_path))
        os.remove(file_path)

    async def test_update_file_outside_project(self):
        file_path = self.build_file_in_project('moved.txt', 'in the project')
        resource = BrowserItemResource(Item.load(path=file_path), None)

        with self.assertRaises(ApiError) as context:
            await resource.update(dict(path=os.path.join(self.outside_dir, 'moved.txt')))

        self.assertEqual(context.exception.type, ApiError.RESOURCE_INVALID['type'])
        self.assertTrue(os.path.exists(file_path))
        os.remove(file_path)

    async def test_collection_directory_outside_project(self):
        with self.assertRaises(ApiError) as context:
            await BrowserItemResource.collection(
                dict(directory=[self.outside_dir]),
                None,
                None,
            )

        self.assertEqual(context.exception.type, ApiError.RESOURCE_INVALID['type'])

    async def test_collection_paths_outside_project(self):
        with self.assertRaises(ApiError) as context:
            await BrowserItemResource.collection(
                dict(paths=[self.outside_dir]),
                None,
                None,
            )

        self.assertEqual(context.exception.type, ApiError.RESOURCE_INVALID['type'])
