from mage_ai.orchestration.db import TEST_DB, db_connection
from mage_ai.orchestration.db.database_manager import database_manager
from mage_ai.shared.logger import LoggingLevel
import os
import shutil
import unittest


class DBTestCase(unittest.TestCase):
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
        database_manager.run_migrations(log_level=LoggingLevel.ERROR)
        db_connection.start_session()

    @classmethod
    def tearDownClass(self):
        shutil.rmtree(self.repo_path)
        db_connection.close_session()
        os.remove(TEST_DB)
        super().tearDownClass()


class TestCase(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass
