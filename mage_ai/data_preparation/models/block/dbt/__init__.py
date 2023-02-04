from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.utils import (
    build_command_line_arguments,
    create_upstream_tables,
    query_from_compiled_sql,
    run_dbt_tests,
    update_model_settings,
)
from mage_ai.data_preparation.models.constants import BlockLanguage
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.hash import merge_dict
from typing import Any, Dict, List

import json
import os
import subprocess


class DBTBlock(Block):
    @property
    def file_path(self) -> str:
        if BlockLanguage.SQL == self.language:
            repo_path = self.pipeline.repo_path if self.pipeline is not None else get_repo_path()
            file_path = self.configuration.get('file_path')

            return os.path.join(
                repo_path or os.getcwd(),
                'dbt',
                file_path,
            )

        return super().file_path

    def run_tests(
        self,
        build_block_output_stdout=None,
        global_vars=None,
        **kwargs,
    ):
        run_dbt_tests(
            block=self,
            build_block_output_stdout=build_block_output_stdout,
            global_vars=global_vars,
        )

    def update_upstream_blocks(self, upstream_blocks: List[Any]) -> None:
        upstream_blocks_previous = self.upstream_blocks
        super().update_upstream_blocks(upstream_blocks)
        if BlockLanguage.SQL == self.language:
            update_model_settings(self, upstream_blocks, upstream_blocks_previous)

    def _execute_block(
        self,
        outputs_from_input_vars,
        execution_partition: str = None,
        global_vars: Dict = None,
        test_execution: bool = False,
        runtime_arguments: Dict = None,
        **kwargs,
    ) -> List:
        variables = merge_dict(global_vars, runtime_arguments or {})

        dbt_command, args, command_line_dict = build_command_line_arguments(
            self,
            variables,
            test_execution=test_execution,
        )
        project_full_path = command_line_dict['project_full_path']
        dbt_profile_target = command_line_dict['profile_target']

        is_sql = BlockLanguage.SQL == self.language
        if is_sql:
            create_upstream_tables(
                self,
                execution_partition=execution_partition,
                profile_target=dbt_profile_target,
                cache_upstream_dbt_models=test_execution,
            )

        stdout = None if test_execution else subprocess.PIPE

        cmds = [
            'dbt',
            dbt_command,
        ] + args

        outputs = []
        if is_sql and test_execution:
            print(f'Running DBT command {dbt_command} with arguments {args}.')
            subprocess.run(
                cmds,
                preexec_fn=os.setsid,
                stdout=stdout,
            )
            df = query_from_compiled_sql(
                self,
                dbt_profile_target,
            )
            self.store_variables(
                dict(df=df),
                execution_partition=execution_partition,
                override_outputs=True,
            )
            outputs = [df]
        elif not test_execution:
            proc = subprocess.Popen(
                cmds,
                bufsize=1,
                preexec_fn=os.setsid,
                stdout=stdout,
                universal_newlines=True,
            )
            for line in proc.stdout:
                print(line, end='')
            proc.communicate()
            if proc.returncode != 0 and proc.returncode is not None:
                raise subprocess.CalledProcessError(proc.returncode, proc.args)

        if not test_execution:
            with open(f'{project_full_path}/target/run_results.json', 'r') as f:
                run_results = json.load(f)

                print('DBT run results:')
                print(json.dumps(run_results))

                for result in run_results['results']:
                    if 'error' == result['status']:
                        raise Exception(result['message'])

        return outputs
