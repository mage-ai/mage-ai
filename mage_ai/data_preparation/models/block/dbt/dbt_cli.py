from typing import List

import pandas as pd
import simplejson
from dbt.cli.main import dbtRunner, dbtRunnerResult

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.dbt.constants import (
    FLAG_PROFILES_DIR,
    FLAG_PROJECT_DIR,
)
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.server.logger import Logger
from mage_ai.shared.parsers import encode_complex

logger = Logger().new_server_logger(__name__)


class DBTCli:
    def __init__(
        self,
        logger: Logger = None,
        profiles_dir: str = None,
        project_path: str = None,
        **kwargs,
    ):
        # e.g. /home/src/default_repo/dbt/demo
        # e.g. /home/src/default_repo/platform/dbt/demo
        # The file in this directory is dbt_project.yml
        self.project_path = project_path
        # The file in this directory is profiles.yml
        # $ dbt run --profiles-dir path/to/directory
        self.profiles_dir = profiles_dir or self.project_path

        if logger:
            self.logger = DictLogger(logger)
        else:
            logger_manager = LoggerManagerFactory.get_logger_manager()
            self.logger = DictLogger(logger_manager.logger)

        self.result = []

        self.__tags = dict(
            profiles_dir=self.profiles_dir,
            project_path=self.project_path,
        )

    def invoke(self, cli_args: List[str], **kwargs) -> dbtRunnerResult:
        dbt = dbtRunner()

        if self.profiles_dir and f'--{FLAG_PROFILES_DIR}' not in cli_args:
            cli_args += [f'--{FLAG_PROFILES_DIR}', self.profiles_dir]

        if self.project_path and f'--{FLAG_PROJECT_DIR}' not in cli_args:
            cli_args += [f'--{FLAG_PROJECT_DIR}', self.project_path]

        log_args = ' '.join(map(str, cli_args))
        self.__info(f'DBTCli.invoke with args: {log_args}', **self.__tags)

        res = dbt.invoke(cli_args)
        self.result.append(res)

        return res

    def show(
        self,
        model_file_path: str,
        limit: int = DATAFRAME_SAMPLE_COUNT_PREVIEW,
        **kwargs,
    ):
        return self.invoke([
            'show',
            '--select',
            model_file_path,  # e.g. models/example/my_first_dbt_model.sql
            '--limit',
            limit,
        ])

    def to_pandas(self, result: dbtRunnerResult) -> pd.DataFrame:
        results = result.result.results
        run_result = results[0]
        table = run_result.agate_table

        return pd.DataFrame([row.dict() for row in table.rows])

    def __info(self, message: str, **tags) -> None:
        if self.logger:
            if isinstance(self.logger, DictLogger):
                self.logger.info(message, **tags)
            else:
                self.logger.info(message)
        else:
            if tags:
                tags_json = simplejson.dumps(
                    tags,
                    default=encode_complex,
                    ignore_nan=True,
                )
                message = f'{message} ({tags_json})'

            print(f'[INFO] DBTCLI: {message}')
