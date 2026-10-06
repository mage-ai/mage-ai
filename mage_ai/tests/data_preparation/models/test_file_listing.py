import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.FileResource import resolve_directory_path
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

    @patch('mage_ai.data_preparation.models.file.remove_base_repo_path_or_name')
    @patch('mage_ai.cache.block.BlockCache.get_pipeline_count_mapping')
    def test_unused_filter_uses_pipeline_counts(self, counts, cache_key):
        cache_key.side_effect = lambda path: os.path.relpath(path, self.root)
        counts.return_value = {os.path.join('nested', 'hello_file.py'): 2}
        result = File.get_all_files(str(self.root), unused_only=True)
        nested = next(child for child in result['children'] if child['name'] == 'nested')
        self.assertNotIn('hello_file.py', [child['name'] for child in nested['children']])
