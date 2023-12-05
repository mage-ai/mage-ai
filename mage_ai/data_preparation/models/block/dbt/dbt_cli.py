import argparse
import os
import sys
import threading
import time
from logging import Logger
from pathlib import Path
from typing import Any, List, Optional, Tuple

import dbt.flags as flags
import dbt.tracking
import pandas as pd
from dbt.contracts.graph.nodes import SeedNode
from dbt.contracts.results import RunResult, RunStatus
from dbt.events.eventmgr import LoggerConfig
from dbt.events.functions import EVENT_MANAGER
from dbt.exceptions import DbtInternalError, DbtRuntimeError
from dbt.graph import ResourceTypeSelector
from dbt.main import (
    DBTArgumentParser,
    _add_common_arguments,
    _add_defer_arguments,
    _add_selection_arguments,
    _add_table_mutability_arguments,
    _build_base_subparser,
    _build_build_subparser,
    _build_clean_subparser,
    _build_compile_subparser,
    _build_debug_subparser,
    _build_deps_subparser,
    _build_docs_generate_subparser,
    _build_docs_serve_subparser,
    _build_docs_subparser,
    _build_init_subparser,
    _build_list_subparser,
    _build_parse_subparser,
    _build_run_operation_subparser,
    _build_run_subparser,
    _build_seed_subparser,
    _build_snapshot_subparser,
    _build_source_freshness_subparser,
    _build_source_subparser,
    _build_test_subparser,
    adapter_management,
    read_user_config,
)
from dbt.node_types import NodeType
from dbt.task.compile import CompileRunner, CompileTask
from dbt.task.seed import SeedRunner

from mage_ai.data_preparation.models.block.dbt.constants import SKIP_LIMIT_ADAPTER_NAMES


class DBTCli:
    """
    Uses dbt.tests.utils.run_dbt approach from dbt-core==1.4.7 to execute dbt commands
    Also backports `dbt show` command to dbt 1.4.7 in order to use dbt to properly handle
    previews for dbt models. This is done by
    - reimplementing the argparse
    - providing a ShowTask
    """

    def __init__(self, args: List[str], logger: Optional[Logger] = None) -> None:
        """
        Initiate a dbt cli interface.

        Args:
            args (List[str]): cli args as parsed by a shell
        """
        self.__args = args
        self.__logger = logger
        self.__parsed_args: Optional[Any] = None
        self.__result: Optional[Any] = None
        self.__success: Optional[bool] = None

        # dbt changes the current dir to the dbt project
        # this is needed to reset the current dir
        self.__cwd = str(Path.cwd())

        self.__parse_args(args)

    def invoke(self) -> Tuple[Any, bool]:
        """
        Invokes dbt from the parsed args

        Returns:
            Tuple[Any, bool]: result of the dbt cli call and whether the call was successful
        """
        if self.__logger:
            self.__logger.info(
                'Invoke dbt with the following arguments:\n' +
                'dbt ' +
                ' '.join(self.__args).replace(' --', ' \\\n  --')
            )

        user_config = read_user_config(flags.PROFILES_DIR)
        flags.set_from_args(self.__parsed_args, user_config)

        dbt.tracking.initialize_from_flags()

        dbt_logger = LoggerConfig(
            name='mage_dbt',
            use_colors=True,
            logger=self.__logger
        )
        EVENT_MANAGER.loggers = []
        EVENT_MANAGER.add_logger(dbt_logger)

        try:
            with adapter_management():
                task = self.__parsed_args.cls.from_args(args=self.__parsed_args)
                self.__result = task.run()
                self.__success = task.interpret_results(self.__result)
        finally:
            # Always change back the directory
            os.chdir(self.__cwd)
        return self.__result, self.__success

    def to_pandas(self) -> Tuple[Optional[pd.DataFrame], Any, bool]:
        """
        Invokes dbt and returns a preview table as dataframe, if possible.
        Currentöy only `dbt show` and `dbt seed` support this.

        Returns:
            Tuple[Optional[pd.DataFrame], Any, bool]:
                result table as pandas Dataframe,
                result of the dbt cli call,
                and whether the call was successful
        """
        self.invoke()
        df = None
        if len(self.__result.results) >= 1 and hasattr(self.__result.results[0], 'agate_table'):
            df = pd.DataFrame(
                data=self.__result.results[0].agate_table.rows,
                columns=self.__result.results[0].agate_table.column_names
            )
        return df, self.__result, self.__success

    def __build_show_subparser(
        self,
        subparsers: argparse.ArgumentParser,
        base_subparser: argparse.ArgumentParser
    ) -> argparse.ArgumentParser:
        """
        Builds argparse subparser for dbt show command.

        Args:
            subparsers:
                Subparser which this subparser extends
            base_subparser:
                Base subparser used for this subparser

        Returns:
            DBTArgumentParser: Backported argparse subparser for show command
        """
        show_sub = subparsers.add_parser(
            "show",
            parents=[base_subparser],
            help="""Generates executable SQL for a named resource or inline query,
            runs that SQL, and returns a preview of the results.
            Does not materialize anything to the warehouse.""",
        )
        show_sub.add_argument(
            "--inline",
            help="Pass SQL inline to dbt compile and show",
        )
        show_sub.add_argument(
            "--limit",
            type=int,
            default=5,
            help="Limit the number of results returned by dbt show",
        )
        show_sub.add_argument(
            "--output",
            choices=["json", "text"],
            default="text",
            help="Output format for dbt compile and dbt show",
        )
        show_sub.set_defaults(cls=ShowTask, which="show", rpc_method="show")
        return show_sub

    def __parse_args(
        self,
        args: List[str],
        cls: argparse.ArgumentParser = DBTArgumentParser
    ) -> None:
        """
        Parses cli arguments for dbt. Based on dbt.main.parse_args but extended
        to be able to parse `dbt show` command.

        Args:
            args (List[str]): cli arguments passed to dbt
        """
        p = cls(
            prog="dbt",
            description="""
            An ELT tool for managing your SQL transformations and data models.
            For more documentation on these commands, visit: docs.getdbt.com
            """,
            epilog="""
            Specify one of these sub-commands and you can find more help from
            there.
            """,
        )

        p.add_argument(
            "--version",
            action="dbtversion",
            help="""
            Show version information
            """,
        )

        p.add_argument(
            "-r",
            "--record-timing-info",
            default=None,
            type=str,
            help="""
            When this option is passed, dbt will output low-level timing stats to
            the specified file. Example: `--record-timing-info output.profile`
            """,
        )

        p.add_argument(
            "-d",
            "--debug",
            action="store_true",
            default=None,
            help="""
            Display debug logging during dbt execution. Useful for debugging and
            making bug reports.
            """,
        )

        p.add_argument(
            "--log-format",
            choices=["text", "json", "default"],
            default=None,
            help="""Specify the log format, overriding the command's default.""",
        )

        p.add_argument(
            "--no-write-json",
            action="store_false",
            default=None,
            dest="write_json",
            help="""
            If set, skip writing the manifest and run_results.json files to disk
            """,
        )
        colors_flag = p.add_mutually_exclusive_group()
        colors_flag.add_argument(
            "--use-colors",
            action="store_const",
            const=True,
            default=None,
            dest="use_colors",
            help="""
            Colorize the output DBT prints to the terminal. Output is colorized by
            default and may also be set in a profile or at the command line.
            Mutually exclusive with --no-use-colors
            """,
        )
        colors_flag.add_argument(
            "--no-use-colors",
            action="store_const",
            const=False,
            dest="use_colors",
            help="""
            Do not colorize the output DBT prints to the terminal. Output is
            colorized by default and may also be set in a profile or at the
            command line.
            Mutually exclusive with --use-colors
            """,
        )

        p.add_argument(
            "--printer-width",
            dest="printer_width",
            help="""
            Sets the width of terminal output
            """,
        )

        warn_error_flag = p.add_mutually_exclusive_group()
        warn_error_flag.add_argument(
            "--warn-error",
            action="store_true",
            default=None,
            help="""
            If dbt would normally warn, instead raise an exception. Examples
            include --select that selects nothing, deprecations, configurations
            with no associated models, invalid test configurations, and missing
            sources/refs in tests.
            """,
        )

        warn_error_flag.add_argument(
            "--warn-error-options",
            default=None,
            help="""
            If dbt would normally warn, instead raise an exception based on
            include/exclude configuration. Examples include --select that selects
            nothing, deprecations, configurations with no associated models,
            invalid test configurations, and missing sources/refs in tests.
            This argument should be a YAML string, with keys 'include' or 'exclude'.
            eg. '{"include": "all", "exclude": ["NoNodesForSelectionCriteria"]}'
            """,
        )

        p.add_argument(
            "--no-version-check",
            dest="version_check",
            action="store_false",
            default=None,
            help="""
            If set, skip ensuring dbt's version matches the one specified in
            the dbt_project.yml file ('require-dbt-version')
            """,
        )

        p.add_optional_argument_inverse(
            "--partial-parse",
            enable_help="""
            Allow for partial parsing by looking for and writing to a pickle file
            in the target directory. This overrides the user configuration file.
            """,
            disable_help="""
            Disallow partial parsing. This overrides the user configuration file.
            """,
        )

        # if set, run dbt in single-threaded mode: thread count is ignored, and
        # calls go through `map` instead of the thread pool. This is useful for
        # getting performance information about aspects of dbt that normally run in
        # a thread, as the profiler ignores child threads. Users should really
        # never use this.
        p.add_argument(
            "--single-threaded",
            action="store_true",
            help=argparse.SUPPRESS,
        )

        # if set, will use the latest features from the static parser instead of
        # the stable static parser.
        p.add_argument(
            "--use-experimental-parser",
            action="store_true",
            default=None,
            help="""
            Enables experimental parsing features.
            """,
        )

        # if set, will disable the use of the stable static parser and instead
        # always rely on jinja rendering.
        p.add_argument(
            "--no-static-parser",
            default=None,
            dest="static_parser",
            action="store_false",
            help="""
            Disables the static parser.
            """,
        )

        p.add_argument(
            "--profiles-dir",
            default=None,
            dest="profiles_dir",
            type=str,
            help="""
            Which directory to look in for the profiles.yml file. If not set, dbt will look
            in the current working directory first, then HOME/.dbt/
            """,
        )

        p.add_argument(
            "--no-anonymous-usage-stats",
            action="store_false",
            default=None,
            dest="send_anonymous_usage_stats",
            help="""
            Do not send anonymous usage stat to dbt Labs
            """,
        )

        p.add_argument(
            "-x",
            "--fail-fast",
            dest="fail_fast",
            action="store_true",
            default=None,
            help="""
            Stop execution upon a first failure.
            """,
        )

        p.add_argument(
            "-q",
            "--quiet",
            action="store_true",
            default=None,
            help="""
            Suppress all non-error logging to stdout. Does not affect
            {{ print() }} macro calls.
            """,
        )

        p.add_argument(
            "--no-print",
            action="store_true",
            default=None,
            help="""
            Suppress all {{ print() }} macro calls.
            """,
        )

        schema_cache_flag = p.add_mutually_exclusive_group()
        schema_cache_flag.add_argument(
            "--cache-selected-only",
            action="store_const",
            const=True,
            default=None,
            dest="cache_selected_only",
            help="""
            Pre cache database objects relevant to selected resource only.
            """,
        )
        schema_cache_flag.add_argument(
            "--no-cache-selected-only",
            action="store_const",
            const=False,
            dest="cache_selected_only",
            help="""
            Pre cache all database objects related to the project.
            """,
        )

        subs = p.add_subparsers(title="Available sub-commands")

        base_subparser = _build_base_subparser()

        # make the subcommands that have their own subcommands
        docs_sub = _build_docs_subparser(subs, base_subparser)
        docs_subs = docs_sub.add_subparsers(title="Available sub-commands")
        source_sub = _build_source_subparser(subs, base_subparser)
        source_subs = source_sub.add_subparsers(title="Available sub-commands")

        _build_init_subparser(subs, base_subparser)
        _build_clean_subparser(subs, base_subparser)
        _build_debug_subparser(subs, base_subparser)
        _build_deps_subparser(subs, base_subparser)
        _build_list_subparser(subs, base_subparser)

        build_sub = _build_build_subparser(subs, base_subparser)
        snapshot_sub = _build_snapshot_subparser(subs, base_subparser)
        run_sub = _build_run_subparser(subs, base_subparser)
        compile_sub = _build_compile_subparser(subs, base_subparser)
        parse_sub = _build_parse_subparser(subs, base_subparser)
        generate_sub = _build_docs_generate_subparser(docs_subs, base_subparser)
        test_sub = _build_test_subparser(subs, base_subparser)
        show_sub = self.__build_show_subparser(subs, base_subparser)
        seed_sub = _build_seed_subparser(subs, base_subparser)
        # --threads, --no-version-check
        _add_common_arguments(
            run_sub, compile_sub, generate_sub, test_sub, show_sub, seed_sub, parse_sub, build_sub
        )
        # --select, --exclude
        # list_sub sets up its own arguments.
        _add_selection_arguments(
            run_sub, compile_sub, generate_sub, test_sub, snapshot_sub, show_sub, seed_sub
        )
        # --defer
        _add_defer_arguments(run_sub, test_sub, build_sub, snapshot_sub, show_sub, compile_sub)
        # --full-refresh
        _add_table_mutability_arguments(run_sub, compile_sub, build_sub, show_sub)

        _build_docs_serve_subparser(docs_subs, base_subparser)
        _build_source_freshness_subparser(source_subs, base_subparser)
        _build_run_operation_subparser(subs, base_subparser)

        if len(args) == 0:
            p.print_help()
            sys.exit(1)

        parsed = p.parse_args(args)

        # profiles_dir is set before subcommands and after, so normalize
        if hasattr(parsed, "sub_profiles_dir"):
            if parsed.sub_profiles_dir is not None:
                parsed.profiles_dir = parsed.sub_profiles_dir
            delattr(parsed, "sub_profiles_dir")
        if hasattr(parsed, "profiles_dir"):
            if parsed.profiles_dir is None:
                parsed.profiles_dir = flags.PROFILES_DIR
            else:
                parsed.profiles_dir = os.path.abspath(parsed.profiles_dir)
                # needs to be set before the other flags, because it's needed to
                # read the profile that contains them
                flags.PROFILES_DIR = parsed.profiles_dir

        # version_check is set before subcommands and after, so normalize
        if hasattr(parsed, "sub_version_check"):
            if parsed.sub_version_check is False:
                parsed.version_check = False
            delattr(parsed, "sub_version_check")

        # fail_fast is set before subcommands and after, so normalize
        if hasattr(parsed, "sub_fail_fast"):
            if parsed.sub_fail_fast is True:
                parsed.fail_fast = True
            delattr(parsed, "sub_fail_fast")

        if getattr(parsed, "project_dir", None) is not None:
            expanded_user = os.path.expanduser(parsed.project_dir)
            parsed.project_dir = os.path.abspath(expanded_user)

        if not hasattr(parsed, "which"):
            # the user did not provide a valid subcommand. trigger the help message
            # and exit with a error
            p.print_help()
            p.exit(1)

        self.__parsed_args = parsed


class ShowRunner(CompileRunner):
    """
    Backport of dbt-core==1.5.6 dbt.taks.show.ShowRunner with small changes
    """
    def __init__(self, config, adapter, node, node_index, num_nodes):
        super().__init__(config, adapter, node, node_index, num_nodes)
        self.run_ephemeral_models = True

    def execute(self, compiled_node, manifest):
        start_time = time.time()

        if "sql_header" in compiled_node.unrendered_config:
            compiled_node.compiled_code = (
                compiled_node.unrendered_config["sql_header"] +
                compiled_node.compiled_code
            )

        # really ugly workaround for backporting fetchmany by supplying LIMIT instead
        if (
            self.config.args.limit >= 0
            and type(self.adapter).__name__ not in SKIP_LIMIT_ADAPTER_NAMES
        ):
            compiled_node.compiled_code = (
                compiled_node.compiled_code +
                '\nLIMIT ' + str(self.config.args.limit)
            )

        adapter_response, execute_result = self.adapter.execute(
            compiled_node.compiled_code, fetch=True
        )
        end_time = time.time()

        return RunResult(
            node=compiled_node,
            status=RunStatus.Success,
            timing=[],
            thread_id=threading.current_thread().name,
            execution_time=end_time - start_time,
            message=None,
            adapter_response=(
                adapter_response.to_dict() if isinstance(adapter_response, dict) else {}
            ),
            agate_table=execute_result,
            failures=None,
        )


class ShowTask(CompileTask):
    """
    Backport of dbt-core==1.5.6 dbt.taks.show.ShowTask with small changes
    """
    def _runtime_initialize(self):
        if not (self.args.select or getattr(self.args, "inline", None)):
            raise DbtRuntimeError("Either --select or --inline must be passed to show")
        super()._runtime_initialize()

    def get_runner_type(self, node):
        if isinstance(node, SeedNode):
            return SeedRunner
        else:
            return ShowRunner

    def task_end_messages(self, results):
        is_inline = bool(getattr(self.args, "inline", None))

        if is_inline:
            matched_results = [result for result in results if result.node.name == "inline_query"]
        else:
            matched_results = []
            for result in results:
                if result.node.name in self.selection_arg[0]:
                    matched_results.append(result)

        for result in matched_results:
            node_name = result.node.name

            if hasattr(result.node, "version") and result.node.version:
                node_name += f".v{result.node.version}"

    def _handle_result(self, result):
        super()._handle_result(result)

        if (
            result.node.is_ephemeral_model
            and type(self) is ShowTask
            and (self.args.select or getattr(self.args, "inline", None))
        ):
            self.node_results.append(result)

    def get_node_selector(self) -> ResourceTypeSelector:
        if self.manifest is None or self.graph is None:
            raise DbtInternalError("manifest and graph must be set to get perform node selection")
        return ResourceTypeSelector(
            graph=self.graph,
            manifest=self.manifest,
            previous_state=self.previous_state,
            resource_types=[NodeType.Model, NodeType.Analysis],
        )
