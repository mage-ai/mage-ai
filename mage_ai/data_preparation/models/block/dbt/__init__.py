from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.utils import (
    build_command_line_arguments,
    create_upstream_tables,
    create_temporary_profile,
    fetch_model_data,
    load_profiles_async,
    parse_attributes,
    query_from_compiled_sql,
    run_dbt_tests,
    update_model_settings,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.hash import merge_dict
from typing import Any, Dict, List
import json
import os
import shutil
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

    async def metadata_async(self) -> Dict:
        project = None
        projects = {}

        if self.configuration.get('file_path'):
            attributes_dict = parse_attributes(self)
            profiles_full_path = attributes_dict['profiles_full_path']
            project_name = attributes_dict['project_name']
            project = project_name

            targets = []
            profiles = await load_profiles_async(project_name, profiles_full_path)
            outputs = profiles.get('outputs')
            if outputs:
                targets += sorted(list(outputs.keys()))

            projects[project_name] = dict(
                target=profiles.get('target'),
                targets=targets,
            )
        else:
            dbt_dir = os.path.join(get_repo_path(), 'dbt')
            project_names = [
                name for name in os.listdir(dbt_dir) if os.path.isdir(os.path.join(dbt_dir, name))
            ]
            for project_name in project_names:
                profiles_full_path = os.path.join(dbt_dir, project_name, 'profiles.yml')
                targets = []
                profiles = await load_profiles_async(project_name, profiles_full_path)
                outputs = profiles.get('outputs')
                if outputs:
                    targets += sorted(list(outputs.keys()))

                projects[project_name] = dict(
                    target=profiles.get('target'),
                    targets=targets,
                )

        return dict(dbt=dict(
            project=project,
            projects=projects,
        ))

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
        run_settings: Dict = None,
        **kwargs,
    ) -> List:
        variables = merge_dict(global_vars, runtime_arguments or {})

        if run_settings:
            test_execution = not (
                run_settings.get('build_model', False) or
                run_settings.get('run_model', False) or
                run_settings.get('test_model', False)
            )

        dbt_command, args, command_line_dict = build_command_line_arguments(
            self,
            variables,
            run_settings=run_settings,
            test_execution=test_execution,
        )

        project_full_path = command_line_dict['project_full_path']
        profiles_dir = command_line_dict['profiles_dir']
        dbt_profile_target = command_line_dict['profile_target']

        # Create a temporary profiles file with variables and secrets interpolated
        _, temp_profile_full_path = create_temporary_profile(
            project_full_path,
            profiles_dir,
        )

        is_sql = BlockLanguage.SQL == self.language
        if is_sql:
            create_upstream_tables(
                self,
                execution_partition=execution_partition,
                profile_target=dbt_profile_target,
                # TODO (tommy dang): this is creating unnecessary tables in notebook
                # cache_upstream_dbt_models=test_execution,
            )

        stdout = None if test_execution else subprocess.PIPE

        cmds = [
            'dbt',
            dbt_command,
        ] + args

        outputs = []

        args_pairs = []
        args_pair = []
        for a in args:
            args_pair.append(f"'{a}'" if '"' in a else a)
            if len(args_pair) == 2:
                args_pairs.append(args_pair)
                args_pair = []
        if len(args_pair) >= 1:
            args_pairs.append(args_pair)

        args_pairs = [f"  {' '.join(p)}" for p in args_pairs]
        args_string = ' \\\n'.join(args_pairs)

        print(f'dbt {dbt_command} \\\n{args_string}\n')

        if is_sql and test_execution:
            subprocess.run(
                cmds,
                preexec_fn=os.setsid,  # os.setsid doesn't work on Windows
                stdout=stdout,
            )
            df = query_from_compiled_sql(
                self,
                dbt_profile_target,
                limit=self.configuration.get('limit'),
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
                preexec_fn=os.setsid,  # os.setsid doesn't work on Windows
                stdout=stdout,
                universal_newlines=True,
            )
            for line in proc.stdout:
                print(line, end='')
            proc.communicate()
            if proc.returncode != 0 and proc.returncode is not None:
                raise subprocess.CalledProcessError(proc.returncode, proc.args)

        if not test_execution:
            run_results_file_path = os.path.join(project_full_path, 'target', 'run_results.json')
            with open(run_results_file_path, 'r') as f:
                try:
                    run_results = json.load(f)

                    print(f'\n{json.dumps(run_results, indent=2)}\n')

                    for result in run_results['results']:
                        if 'error' == result['status']:
                            raise Exception(result['message'])
                except json.decoder.JSONDecodeError:
                    print(f'WARNING: no run results found at {run_results_file_path}.')

            if is_sql and dbt_command in ['build', 'run']:
                limit = 1000
                if self.downstream_blocks and \
                        len(self.downstream_blocks) >= 1 and \
                        not all([BlockType.DBT == block.type for block in self.downstream_blocks]):
                    limit = None

                try:
                    df = fetch_model_data(
                        self,
                        dbt_profile_target,
                        limit=limit,
                    )

                    self.store_variables(
                        dict(output_0=df),
                        execution_partition=execution_partition,
                        override_outputs=True,
                    )
                    outputs = [df]
                except Exception as err:
                    print(f'Error: {err}')

        try:
            shutil.rmtree(profiles_dir)
        except Exception as err:
            print(f'Error removing temporary profile at {temp_profile_full_path}: {err}')

        return outputs
