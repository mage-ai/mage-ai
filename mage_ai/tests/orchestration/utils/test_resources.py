import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from mage_ai.orchestration.utils.resources import get_memory


class TestGetMemory(unittest.TestCase):
    """Test cases for the get_memory function."""

    @patch('os.path.exists')
    @patch('builtins.open', create=True)
    def test_get_memory_cgroup_v1(self, mock_open, mock_exists):
        """Test memory reading from cgroup v1 files."""
        # Setup: cgroup v1 paths exist
        def exists_side_effect(path):
            return path in [
                "/sys/fs/cgroup/memory/memory.usage_in_bytes",
                "/sys/fs/cgroup/memory/memory.limit_in_bytes"
            ]
        
        mock_exists.side_effect = exists_side_effect
        
        # Mock file reads: 1387 MB usage, 4768 MB limit (from the issue)
        usage_bytes = 1387 * 1024 * 1024
        limit_bytes = 4768 * 1024 * 1024
        
        mock_file_handles = {
            "/sys/fs/cgroup/memory/memory.usage_in_bytes": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: str(usage_bytes)
            ),
            "/sys/fs/cgroup/memory/memory.limit_in_bytes": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: str(limit_bytes)
            ),
        }
        
        def open_side_effect(path, mode='r'):
            return mock_file_handles.get(path)
        
        mock_open.side_effect = open_side_effect
        
        # Execute
        free_memory, used_memory, total_memory = get_memory()
        
        # Assert
        self.assertAlmostEqual(used_memory, 1387.0, places=1)
        self.assertAlmostEqual(total_memory, 4768.0, places=1)
        self.assertAlmostEqual(free_memory, 3381.0, places=1)

    @patch('os.path.exists')
    @patch('builtins.open', create=True)
    def test_get_memory_cgroup_v2(self, mock_open, mock_exists):
        """Test memory reading from cgroup v2 files."""
        # Setup: cgroup v2 paths exist, v1 don't
        def exists_side_effect(path):
            return path in [
                "/sys/fs/cgroup/memory.current",
                "/sys/fs/cgroup/memory.max"
            ]
        
        mock_exists.side_effect = exists_side_effect
        
        # Mock file reads
        usage_bytes = 1500 * 1024 * 1024
        limit_bytes = 5000 * 1024 * 1024
        
        # Create mock read() return value with strip() method
        usage_read_value = MagicMock()
        usage_read_value.strip.return_value = str(usage_bytes)
        
        limit_read_value = MagicMock()
        limit_read_value.strip.return_value = str(limit_bytes)
        
        mock_file_handles = {
            "/sys/fs/cgroup/memory.current": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: usage_read_value
            ),
            "/sys/fs/cgroup/memory.max": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: limit_read_value
            ),
        }
        
        def open_side_effect(path, mode='r'):
            return mock_file_handles.get(path)
        
        mock_open.side_effect = open_side_effect
        
        # Execute
        free_memory, used_memory, total_memory = get_memory()
        
        # Assert
        self.assertAlmostEqual(used_memory, 1500.0, places=1)
        self.assertAlmostEqual(total_memory, 5000.0, places=1)
        self.assertAlmostEqual(free_memory, 3500.0, places=1)

    @patch('os.path.exists')
    @patch('builtins.open', create=True)
    def test_get_memory_cgroup_v2_max_limit(self, mock_open, mock_exists):
        """Test memory reading from cgroup v2 with 'max' limit (no limit)."""
        # Setup: cgroup v2 with max limit
        def exists_side_effect(path):
            return path in [
                "/sys/fs/cgroup/memory.current",
                "/sys/fs/cgroup/memory.max"
            ]
        
        mock_exists.side_effect = exists_side_effect
        
        usage_bytes = 1500 * 1024 * 1024
        
        # Create mock read() return value with strip() method
        usage_read_value = MagicMock()
        usage_read_value.strip.return_value = str(usage_bytes)
        
        limit_read_value = MagicMock()
        limit_read_value.strip.return_value = "max"
        
        mock_file_handles = {
            "/sys/fs/cgroup/memory.current": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: usage_read_value
            ),
            "/sys/fs/cgroup/memory.max": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: limit_read_value
            ),
        }
        
        def open_side_effect(path, mode='r'):
            return mock_file_handles.get(path)
        
        mock_open.side_effect = open_side_effect
        
        # With 'max' limit, should fall back to free command
        # We'll mock subprocess as well
        with patch('subprocess.check_output') as mock_subprocess:
            mock_subprocess.return_value = b"Mem:     8000     4000     4000\nSwap:       0        0        0\nTotal:   8000     4000     4000"
            
            free_memory, used_memory, total_memory = get_memory()
            
            # Should use free command fallback
            self.assertEqual(total_memory, 8000.0)
            self.assertEqual(used_memory, 4000.0)
            self.assertEqual(free_memory, 4000.0)

    @patch('os.path.exists')
    @patch('subprocess.check_output')
    def test_get_memory_fallback_to_free(self, mock_subprocess, mock_exists):
        """Test fallback to 'free' command when cgroup files don't exist."""
        # Setup: no cgroup files exist
        mock_exists.return_value = False
        
        # Mock free command output
        mock_subprocess.return_value = b"Mem:     4570     1921     2533\nSwap:       0        0        0\nTotal:   4570     1921     2533"
        
        # Execute
        free_memory, used_memory, total_memory = get_memory()
        
        # Assert - values from the issue's screenshot
        self.assertEqual(total_memory, 4570.0)
        self.assertEqual(used_memory, 1921.0)
        self.assertEqual(free_memory, 2533.0)

    @patch('os.name', 'nt')
    def test_get_memory_windows(self):
        """Test that Windows returns None values."""
        free_memory, used_memory, total_memory = get_memory()
        
        self.assertIsNone(free_memory)
        self.assertIsNone(used_memory)
        self.assertIsNone(total_memory)

    @patch('os.path.exists')
    @patch('builtins.open', create=True)
    def test_get_memory_cgroup_v1_no_limit(self, mock_open, mock_exists):
        """Test memory reading with very large limit value (no limit set)."""
        # Setup: cgroup v1 paths exist
        def exists_side_effect(path):
            return path in [
                "/sys/fs/cgroup/memory/memory.usage_in_bytes",
                "/sys/fs/cgroup/memory/memory.limit_in_bytes"
            ]
        
        mock_exists.side_effect = exists_side_effect
        
        usage_bytes = 1500 * 1024 * 1024
        # Very large limit indicates no limit
        limit_bytes = 9223372036854771712
        
        # Create mock read() return value with strip() method
        usage_read_value = MagicMock()
        usage_read_value.strip.return_value = str(usage_bytes)
        
        limit_read_value = MagicMock()
        limit_read_value.strip.return_value = str(limit_bytes)
        
        mock_file_handles = {
            "/sys/fs/cgroup/memory/memory.usage_in_bytes": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: usage_read_value
            ),
            "/sys/fs/cgroup/memory/memory.limit_in_bytes": MagicMock(
                __enter__=lambda self: self,
                __exit__=lambda self, *args: None,
                read=lambda: limit_read_value
            ),
        }
        
        def open_side_effect(path, mode='r'):
            return mock_file_handles.get(path)
        
        mock_open.side_effect = open_side_effect
        
        # With no real limit, should fall back to free command
        with patch('subprocess.check_output') as mock_subprocess:
            mock_subprocess.return_value = b"Mem:     8000     4000     4000\nSwap:       0        0        0\nTotal:   8000     4000     4000"
            
            free_memory, used_memory, total_memory = get_memory()
            
            # Should use free command fallback
            self.assertEqual(total_memory, 8000.0)
            self.assertEqual(used_memory, 4000.0)
            self.assertEqual(free_memory, 4000.0)
