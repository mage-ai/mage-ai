"""
Unit tests for file download binary extension handling in downloads.py
Tests verify that binary file formats (.parquet, .delta, .avro, .pkl, etc.) 
are correctly opened in binary mode while text files use text mode.
"""
import os
import tempfile
import shutil
from unittest import TestCase
from unittest.mock import Mock

from mage_ai.server.api.downloads import ApiResourceDownloadHandler


class TestApiResourceDownloadHandlerGetFilePointer(TestCase):
    """Test cases for get_file_pointer method with binary extensions"""

    def setUp(self):
        """Set up test fixtures - runs before each test"""
        # Create temporary directory for test files
        self.temp_dir = tempfile.mkdtemp()
        
        # Create mock Tornado application and request
        mock_application = Mock()
        mock_application.ui_methods = {}
        mock_application.ui_modules = {}
        mock_request = Mock()
        
        # Create handler instance with mocked dependencies
        self.handler = ApiResourceDownloadHandler(application=mock_application, request=mock_request)

    def tearDown(self):
        """Clean up test fixtures - runs after each test"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_csv_file_text_mode(self):
        """Test that CSV files are opened in text mode"""
        csv_file = os.path.join(self.temp_dir, 'test.csv')
        with open(csv_file, 'w') as f:
            f.write('col1,col2\n1,2\n')

        file_pointer = self.handler.get_file_pointer([csv_file], ['test.csv'])
        
        # CSV should be opened in text mode (no 'b' in mode)
        self.assertFalse('b' in file_pointer.mode)
        file_pointer.close()

    def test_parquet_file_binary_mode(self):
        """Test that parquet files are opened in binary mode"""
        parquet_file = os.path.join(self.temp_dir, 'test.parquet')
        with open(parquet_file, 'wb') as f:
            f.write(b'PAR1')

        file_pointer = self.handler.get_file_pointer([parquet_file], ['test.parquet'])
        
        # Parquet should be opened in binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()

    def test_delta_file_binary_mode(self):
        """Test that delta files are opened in binary mode"""
        delta_file = os.path.join(self.temp_dir, 'test.delta')
        with open(delta_file, 'wb') as f:
            f.write(b'\x00\x01\x02\x03')

        file_pointer = self.handler.get_file_pointer([delta_file], ['test.delta'])
        
        # Delta should be opened in binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()

    def test_avro_file_binary_mode(self):
        """Test that avro files are opened in binary mode"""
        avro_file = os.path.join(self.temp_dir, 'test.avro')
        with open(avro_file, 'wb') as f:
            f.write(b'Obj\x01')

        file_pointer = self.handler.get_file_pointer([avro_file], ['test.avro'])
        
        # Avro should be opened in binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()

    def test_pickle_file_binary_mode(self):
        """Test that pickle files are opened in binary mode"""
        pickle_file = os.path.join(self.temp_dir, 'test.pkl')
        with open(pickle_file, 'wb') as f:
            f.write(b'\x80\x04')

        file_pointer = self.handler.get_file_pointer([pickle_file], ['test.pkl'])
        
        # Pickle should be opened in binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()

    def test_multiple_files_creates_zip(self):
        """Test that multiple files are zipped together"""
        csv_file1 = os.path.join(self.temp_dir, 'test1.csv')
        csv_file2 = os.path.join(self.temp_dir, 'test2.csv')
        
        with open(csv_file1, 'w') as f:
            f.write('col1,col2\n1,2\n')
        with open(csv_file2, 'w') as f:
            f.write('col3,col4\n3,4\n')

        file_pointer = self.handler.get_file_pointer(
            [csv_file1, csv_file2],
            ['test1.csv', 'test2.csv']
        )
        
        # Should be a binary file (zip)
        self.assertTrue('b' in file_pointer.mode)
        
        # Verify it's a zip file by checking magic bytes
        file_pointer.seek(0)
        magic_bytes = file_pointer.read(2)
        self.assertEqual(magic_bytes, b'PK')
        file_pointer.close()

    def test_compound_extensions_tar_gz(self):
        """Test files with compound extensions like .tar.gz"""
        # .tar.gz IS in binary_extensions, should be binary mode
        tar_gz_file = os.path.join(self.temp_dir, 'archive.tar.gz')
        with open(tar_gz_file, 'wb') as f:
            f.write(b'\x1f\x8b')

        file_pointer = self.handler.get_file_pointer([tar_gz_file], ['archive.tar.gz'])
        
        # tar.gz is in binary_extensions, so binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()

    def test_zip_file_binary_mode(self):
        """Test that .zip files are opened in binary mode"""
        zip_file = os.path.join(self.temp_dir, 'archive.zip')
        with open(zip_file, 'wb') as f:
            f.write(b'PK\x03\x04')

        file_pointer = self.handler.get_file_pointer([zip_file], ['archive.zip'])
        
        # Zip should be opened in binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()

    def test_gz_file_binary_mode(self):
        """Test that .gz files are opened in binary mode"""
        gz_file = os.path.join(self.temp_dir, 'archive.gz')
        with open(gz_file, 'wb') as f:
            f.write(b'\x1f\x8b\x08')

        file_pointer = self.handler.get_file_pointer([gz_file], ['archive.gz'])
        
        # Gz should be opened in binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()

    def test_tar_file_binary_mode(self):
        """Test that .tar files are opened in binary mode"""
        tar_file = os.path.join(self.temp_dir, 'archive.tar')
        with open(tar_file, 'wb') as f:
            f.write(b'ustar\x00')

        file_pointer = self.handler.get_file_pointer([tar_file], ['archive.tar'])
        
        # Tar should be opened in binary mode
        self.assertTrue('b' in file_pointer.mode)
        file_pointer.close()
