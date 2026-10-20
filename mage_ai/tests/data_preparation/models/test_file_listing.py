import asyncio
import importlib
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from mage_ai.api.errors import ApiError
from mage_ai.api.file_executor import run_file_work
from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import LIST
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.api.resources.FileResource import (
    initialize_block_cache_for_file_listing,
    query_value_is_true,
    resolve_directory_path,
)
from mage_ai.cache.block import BlockCache
from mage_ai.data_preparation.models.file import File


class FileListingTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name) / 'workspace'
        (self.root / 'nested' / 'deeper').mkdir(parents=True)
        (self.root / 'root.txt').write_text('root')
        (self.root / 'nested' / 'hello_file.py').write_text('hello')
        (self.root / 'nested' / 'other.py').write_text('other')
        (self.root / 'nested' / 'deeper' / 'deep.txt').write_text('deep')

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_shallow_listing_contains_only_immediate_children(self):
        result = File.get_all_files(str(self.root), max_depth=2)
        children = {child['name']: child for child in result['children']}

        self.assertEqual({'nested', 'root.txt'}, set(children))
        self.assertEqual([], children['nested']['children'])
        self.assertFalse(children['nested']['children_loaded'])
        self.assertNotIn('children', children['root.txt'])

        nested = File.get_all_files(str(self.root / 'nested'), max_depth=2)
        nested_children = {child['name']: child for child in nested['children']}
        self.assertEqual({'deeper', 'hello_file.py', 'other.py'}, set(nested_children))
        self.assertFalse(nested_children['deeper']['children_loaded'])

    def test_default_listing_still_recurses(self):
        result = File.get_all_files(str(self.root))
        nested = next(child for child in result['children'] if child['name'] == 'nested')
        deeper = next(child for child in nested['children'] if child['name'] == 'deeper')
        self.assertEqual('deep.txt', deeper['children'][0]['name'])

    def test_scoped_directory_rejects_traversal_and_symlinks(self):
        self.assertEqual(
            str(self.root / 'nested'),
            resolve_directory_path(str(self.root), 'nested'),
        )
        with self.assertRaises(ApiError):
            resolve_directory_path(str(self.root), '..')
        (self.root / 'outside').symlink_to(self.temp_dir.name, target_is_directory=True)
        with self.assertRaises(ApiError):
            resolve_directory_path(str(self.root), 'outside')

    def test_search_matches_case_and_underscores(self):
        result = File.get_all_files(str(self.root), search='HELLO FILE')
        nested = next(child for child in result['children'] if child['name'] == 'nested')
        self.assertEqual(['hello_file.py'], [child['name'] for child in nested['children']])

    def test_query_boolean_values_from_tornado(self):
        for value in [True, 'true', 'True', b'true', b'True']:
            self.assertTrue(query_value_is_true(value))
        for value in [False, 'false', b'false', None]:
            self.assertFalse(query_value_is_true(value))

    @patch('mage_ai.data_preparation.models.file.remove_base_repo_path_or_name')
    @patch('mage_ai.cache.block.BlockCache.get_pipeline_count_mapping')
    def test_unused_filter_uses_pipeline_counts(self, counts, cache_key):
        cache_key.side_effect = lambda path: os.path.relpath(path, self.root)
        counts.return_value = {os.path.join('nested', 'hello_file.py'): 2}
        result = File.get_all_files(str(self.root), unused_only=True)
        nested = next(child for child in result['children'] if child['name'] == 'nested')
        self.assertNotIn('hello_file.py', [child['name'] for child in nested['children']])


class FileListingAsyncTest(unittest.IsolatedAsyncioTestCase):
    async def test_new_queries_are_allowed_for_authenticated_non_owner(self):
        base_policy = importlib.import_module('mage_ai.api.policies.BasePolicy')
        policy = FilePolicy(None, object(), api_operation_action=LIST)

        with patch.object(base_policy, 'REQUIRE_USER_AUTHENTICATION', True), \
                patch.object(base_policy, 'REQUIRE_USER_PERMISSIONS', False), \
                patch.object(FilePolicy, 'is_owner', return_value=False), \
                patch.object(
                    FilePolicy,
                    'has_at_least_editor_role_and_pipeline_edit_access',
                    return_value=False,
                ), \
                patch.object(FilePolicy, 'current_scope', return_value=OauthScope.CLIENT_PRIVATE):
            await policy.authorize_query(
                {
                    'directory_path': [b'.'],
                    'search': [b'hello'],
                    'unused_only': [b'true'],
                },
                api_operation_action=LIST,
            )

    async def test_cache_initialization_does_not_block_event_loop(self):
        async def slow_cache_initialization():
            time.sleep(0.1)

        with patch.object(BlockCache, 'initialize_cache', slow_cache_initialization):
            cache_task = asyncio.create_task(
                run_file_work(initialize_block_cache_for_file_listing),
            )
            await asyncio.sleep(0.02)
            self.assertFalse(cache_task.done())
            await cache_task
