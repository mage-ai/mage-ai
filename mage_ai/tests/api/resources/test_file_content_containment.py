import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.FileContentResource import FileContentResource
from mage_ai.data_preparation.models.errors import FileNotInProjectError
from mage_ai.data_preparation.models.file import ensure_file_is_in_project


class FileContentContainmentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / 'project'
        self.repo.mkdir()
        self.outside = self.root / 'outside.txt'
        self.outside.write_text('outside sentinel')
        (self.repo / 'inside.txt').write_text('inside sentinel')
        for target in ['mage_ai.data_preparation.models.file.get_repo_path',
                       'mage_ai.api.resources.FileContentResource.get_repo_path']:
            patcher = patch(target, return_value=str(self.repo))
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = patch('mage_ai.api.resources.FileContentResource.add_absolute_path',
                        side_effect=lambda path: os.path.join(self.repo, path))
        patcher.start()
        self.addCleanup(patcher.stop)

    async def test_encoded_traversal_rejected_in_both_modes(self):
        # Tornado has decoded the HTTP path once before passing pk to member.
        for platform in [False, True]:
            with patch(
                'mage_ai.settings.platform.constants.project_platform_activated_flag', platform,
            ):
                for path in ['../outside.txt', '../../outside.txt', str(self.outside)]:
                    with self.subTest(platform=platform, path=path):
                        with self.assertRaises(ApiError):
                            await FileContentResource.member(quote(path, safe=''), None)
        self.assertEqual(self.outside.read_text(), 'outside sentinel')

    async def test_in_project_reads_and_writes_work_in_both_modes(self):
        for platform in [False, True]:
            with patch(
                'mage_ai.settings.platform.constants.project_platform_activated_flag', platform,
            ):
                resource = await FileContentResource.member(quote('inside.txt', safe=''), None)
                self.assertEqual(await resource.model.content_async(),
                                 (self.repo / 'inside.txt').read_text())
                await resource.update({'content': 'updated inside'})
                self.assertEqual((self.repo / 'inside.txt').read_text(), 'updated inside')

    async def test_symlink_read_and_new_write_outside_rejected(self):
        (self.repo / 'file-link').symlink_to(self.outside)
        (self.repo / 'directory-link').symlink_to(self.root, target_is_directory=True)
        for path in ['file-link', 'directory-link/new.txt']:
            with self.subTest(path=path), self.assertRaises(ApiError):
                await FileContentResource.member(quote(path, safe=''), None)
        self.assertFalse((self.root / 'new.txt').exists())

    def test_sibling_prefix_is_not_contained(self):
        sibling = self.root / 'project-other' / 'new.txt'
        with self.assertRaises(FileNotInProjectError):
            ensure_file_is_in_project(str(sibling))

    async def test_normalized_in_project_path_and_symlink_work(self):
        (self.repo / 'subdir').mkdir()
        (self.repo / 'inside-link').symlink_to(self.repo / 'inside.txt')
        for path in ['subdir/../inside.txt', 'inside-link']:
            resource = await FileContentResource.member(quote(path, safe=''), None)
            self.assertEqual(await resource.model.content_async(), 'inside sentinel')
