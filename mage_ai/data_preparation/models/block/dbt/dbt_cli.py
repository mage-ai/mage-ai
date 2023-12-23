import os
from typing import List

import pandas as pd
from dbt.cli.main import dbtRunner, dbtRunnerResult

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.server.logger import Logger

logger = Logger().new_server_logger(__name__)


class DBTCli:
    def __init__(
        self,
        project_path: str,
        profiles_dir: str = None,
        **kwargs,
    ):
        self.orig_dir = os.getcwd()
        # e.g. /home/src/default_repo/dbt/demo
        # e.g. /home/src/default_repo/platform/dbt/demo
        # The file in this directory is dbt_project.yml
        self.project_path = project_path
        # The file in this directory is profiles.yml
        # $ dbt run --profiles-dir path/to/directory
        self.profiles_dir = profiles_dir or project_path

        self.logger_manager = LoggerManagerFactory.get_logger_manager()
        self.logger = DictLogger(self.logger_manager.logger)

        self.__tags = dict(
            profiles_dir=self.profiles_dir,
            project_path=self.project_path,
        )

    def __enter__(self):
        os.chdir(self.project_path)
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        os.chdir(self.orig_dir)

    def invoke(self, cli_args: List[str], **kwargs) -> dbtRunnerResult:
        dbt = dbtRunner()

        log_args = ' '.join(map(str, cli_args))
        self.logger.info(f'DBTCli.invoke with args: {log_args}', **self.__tags)

        res = dbt.invoke(cli_args)

        return res

    def to_pandas(
        self,
        model_file_path: str,
        limit: int = DATAFRAME_SAMPLE_COUNT_PREVIEW,
        **kwargs,
    ):
        res = self.invoke([
            'show',
            '--select',
            model_file_path,  # e.g. models/example/my_first_dbt_model.sql
            '--limit',
            limit,
        ])
        result = res.result
        results = result.results
        run_result = results[0]
        table = run_result.agate_table

        return pd.DataFrame([row.dict() for row in table.rows])
