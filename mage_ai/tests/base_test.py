import logging
import os
import shutil
import sys
import unittest
from pathlib import Path

from faker import Faker

from mage_ai.data_preparation.repo_manager import init_project_uuid
from mage_ai.orchestration.db import TEST_DB, db_connection
from mage_ai.orchestration.db.database_manager import database_manager
from mage_ai.settings.repo import get_variables_dir, set_repo_path

if sys.version_info.major <= 3 and sys.version_info.minor <= 7:
    class AsyncDBTestCase():
        pass
else:
    class AsyncDBTestCase(unittest.IsolatedAsyncioTestCase):
        def setUp(self):
            self.faker = Faker()

        def tearDown(self):
            pass

        @classmethod
        def setUpClass(self):
            super().setUpClass()

            repo_path = None
            for fp in [
                os.path.dirname(os.getcwd()),
                os.getcwd(),
                'test'
            ]:
                repo_path = os.path.join(repo_path or '', fp)
                if not os.path.exists(repo_path):
                    os.makedirs(repo_path, exist_ok=True)

            self.repo_path = repo_path
            set_repo_path(self.repo_path)
            if not Path(self.repo_path).exists():
                Path(self.repo_path).mkdir()
            init_project_uuid()
            database_manager.run_migrations(log_level=logging.ERROR)
            db_connection.start_session(force=True)

        @classmethod
        def tearDownClass(self):
            if os.path.exists(self.repo_path):
                shutil.rmtree(self.repo_path)
            db_connection.close_session()

            if Path(TEST_DB).is_file():
                Path(TEST_DB).unlink()

            super().tearDownClass()


class DBTestCase(unittest.TestCase):
    def setUp(self):
        self.faker = Faker()

    def tearDown(self):
        pass

    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.repo_path = os.path.join(os.getcwd(), 'test')
        set_repo_path(self.repo_path)
        if not Path(self.repo_path).exists():
            Path(self.repo_path).mkdir()
        init_project_uuid()
        database_manager.run_migrations(log_level=logging.ERROR)
        db_connection.start_session(force=True)

    @classmethod
    def tearDownClass(self):
        try:
            shutil.rmtree(self.repo_path)
            shutil.rmtree(get_variables_dir())
        except Exception:
            pass
        db_connection.close_session()

        if Path(TEST_DB).is_file():
            Path(TEST_DB).unlink()

        super().tearDownClass()


class TestCase(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    @classmethod
    def setUpClass(self):
        super().setUpClass()
        repo_path = os.path.join(os.getcwd())
        if not os.path.exists(repo_path):
            os.makedirs(repo_path, exist_ok=True)

        repo_path = os.path.join(repo_path, 'test')
        if not os.path.exists(repo_path):
            os.makedirs(repo_path, exist_ok=True)

        self.repo_path = repo_path
        set_repo_path(self.repo_path)
        if not Path(self.repo_path).exists():
            Path(self.repo_path).mkdir()
        init_project_uuid()

    @classmethod
    def tearDownClass(self):
        try:
            shutil.rmtree(self.repo_path)
            shutil.rmtree(get_variables_dir())
        except Exception:
            pass
        super().tearDownClass()
