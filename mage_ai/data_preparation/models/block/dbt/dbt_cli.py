from typing import Callable, Dict, List, Tuple

import pandas as pd
import simplejson
from dbt.cli.main import dbtRunner, dbtRunnerResult

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.block.dbt.constants import Flag, LogLevel
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.server.logger import Logger
from mage_ai.shared.parsers import encode_complex

logger_default = Logger().new_server_logger(__name__)


def build_logging_callback(logging_func: Callable, log_level: LogLevel = None):
    def __callback(event, log_level=log_level, logging_func=logging_func):
        log_levels = set([LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR])

        if LogLevel.DEBUG == log_level or event.info.level in log_levels:
            logging_func(event.info.level, event.info.msg)

    return __callback


def extract_failed_dbt_nodes(res: dbtRunnerResult) -> Tuple[List[str], List[str]]:
    """Return (failed_models, failed_tests) parsed from a dbtRunnerResult."""
    failed_models: List[str] = []
    failed_tests: List[str] = []

    if res is None:
        return failed_models, failed_tests

    result = getattr(res, 'result', None)
    results_list = getattr(result, 'results', result) if result is not None else None
    if not results_list:
        return failed_models, failed_tests

    for r in results_list:
        node = getattr(r, 'node', None)
        status = getattr(r, 'status', None)
        if node is None or status is None:
            continue

        status_str = str(status).lower()
        if 'success' in status_str or 'pass' in status_str:
            continue

        name = getattr(node, 'name', None) or getattr(node, 'unique_id', None)
        if not name:
            continue

        resource_type = str(getattr(node, 'resource_type', 'model')).lower()
        (failed_tests if resource_type == 'test' else failed_models).append(name)

    return failed_models, failed_tests


class DBTCli:
    def __init__(
        self,
        logger: Logger = None,
        profiles_dir: str = None,
        project_path: str = None,
        **kwargs,
    ):
        self.logger = logger or logger_default

        # e.g. /home/src/default_repo/dbt/demo
        # e.g. /home/src/default_repo/platform/dbt/demo
        # The file in this directory is dbt_project.yml
        self.project_path = project_path
        # The file in this directory is profiles.yml
        # $ dbt run --profiles-dir path/to/directory
        self.profiles_dir = profiles_dir or self.project_path

        self.result = []

    def invoke(
        self,
        cli_args: List[str],
        log_level: LogLevel = None,
        tags: Dict = None,
        **kwargs,
    ) -> dbtRunnerResult:
        dbt = dbtRunner(
            callbacks=[
                build_logging_callback(
                    self.__log,
                    log_level=log_level,
                ),
            ],
        )

        if self.profiles_dir and f'--{Flag.PROFILES_DIR}' not in cli_args:
            cli_args += [f'--{Flag.PROFILES_DIR}', self.profiles_dir]

        if self.project_path and f'--{Flag.PROJECT_DIR}' not in cli_args:
            cli_args += [f'--{Flag.PROJECT_DIR}', self.project_path]

        message = 'dbt'
        log_args = [message] + [str(a) for a in cli_args]
        if len(log_args) >= 2:
            pairs = []
            pair = []
            for line in log_args:
                pair.append(str(line))
                if len(pair) == 2:
                    pairs.append((' ').join(pair))
                    pair = []
            if len(pair) >= 1:
                pairs.append((' ').join(pair))

            message = ' \\\n    '.join(pairs)

        self.__info(message, tags)

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
        ], **kwargs)

    def to_pandas(self, result: dbtRunnerResult) -> pd.DataFrame:
        results = result.result.results
        if results:
            run_result = results[0]
            table = run_result.agate_table

            return pd.DataFrame([row.dict() for row in table.rows])

    def __debug(self, *args, **kwargs) -> None:
        self.__log(LogLevel.DEBUG, *args, **kwargs)

    def __info(self, *args, **kwargs) -> None:
        self.__log(LogLevel.INFO, *args, **kwargs)

    def __log(self, log_level: LogLevel, message: str, tags: Dict = None) -> None:
        if self.logger:
            if isinstance(self.logger, DictLogger):
                getattr(self.logger, log_level)(message, **(tags or {}))
            else:
                getattr(self.logger, log_level)(message)
        else:
            if tags:
                tags_json = simplejson.dumps(
                    tags,
                    default=encode_complex,
                    ignore_nan=True,
                )
                message = f'{message} ({tags_json})'
            # Intentionally avoid stdout logging when no logger is provided.
