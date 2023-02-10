from mage_ai.shared.io import safe_write, safe_write_async
from mage_ai.tests.base_test import TestCase
import asyncio
import os


class IOTests(TestCase):
    def test_safe_write(self):
        file_path = 'test_file_write'
        with open(file_path, 'w') as fp:
            fp.write('MESSAGE1')

        safe_write(file_path, 'MESSAGE2')
        with open(file_path, 'r') as fp:
            self.assertEqual(fp.read(), 'MESSAGE2')

        def write_func(fp, content):
            raise Exception('Fail to write')

        with self.assertRaises(Exception) as err:
            safe_write(file_path, 'MESSAGE3', write_func=write_func)
            self.assertTrue('Fail to write' in str(err.exception))
        with open(file_path, 'r') as fp:
            self.assertEqual(fp.read(), 'MESSAGE2')
        os.remove(file_path)

    def test_safe_write_sync(self):
        file_path = 'test_file_write_2'
        with open(file_path, 'w') as fp:
            fp.write('MESSAGE1')

        asyncio.run(safe_write_async(file_path, 'MESSAGE2'))
        with open(file_path, 'r') as fp:
            self.assertEqual(fp.read(), 'MESSAGE2')

        async def write_func_async(fp, content):
            raise Exception('Fail to write async')

        with self.assertRaises(Exception) as err:
            asyncio.run(safe_write_async(file_path, 'MESSAGE3', write_func=write_func_async))
            self.assertTrue('Fail to write async' in str(err.exception))
        with open(file_path, 'r') as fp:
            self.assertEqual(fp.read(), 'MESSAGE2')
        os.remove(file_path)
