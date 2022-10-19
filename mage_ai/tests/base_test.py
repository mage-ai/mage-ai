import os
import shutil
import unittest


class TestCase(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.repo_path = os.getcwd() + '/test'
        if not os.path.exists(self.repo_path):
            os.mkdir(self.repo_path)

    @classmethod
    def tearDownClass(self):
        shutil.rmtree(self.repo_path)
        super().tearDownClass()
