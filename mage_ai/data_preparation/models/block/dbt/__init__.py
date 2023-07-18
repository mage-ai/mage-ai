import json
import os
import shutil
import subprocess
from typing import Any, Dict, List

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.utils import (
    build_command_line_arguments,
    compiled_query_string,
    create_temporary_profile,
    create_upstream_tables,
    fetch_model_data,
    get_dbt_project_name_from_settings,
    load_profiles_async,
    parse_attributes,
    query_from_compiled_sql,
    run_dbt_tests,
    update_model_settings,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict


class DBTBlock(Block):
    @property
    def file_path(self) -> str:
        """
        Return the file path for the DBT block.

        Returns:
            str: The file path of the DBT block.

        """
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
        """
        Retrieve metadata asynchronously.

        Returns:
            Dict: The metadata of the DBT block.

        """
        project = None
        projects = {}
        block_metadata = {}

        if self.configuration.get('file_path'):
            attributes_dict = parse_attributes(self)
            profiles_full_path = attributes_dict['profiles_full_path']
            project_name = attributes_dict['project_name']
            profile_name = attributes_dict['profile_name']
            project = project_name

            targets = []
            profiles = await load_profiles_async(profile_name, profiles_full_path)
            outputs = profiles.get('outputs')
            if outputs:
                targets += sorted(list(outputs.keys()))

            projects[project_name] = dict(
                target=profiles.get('target'),
                targets=targets,
            )

            block_metadata['snapshot'] = attributes_dict['snapshot']
        else:
            dbt_dir = os.path.join(get_repo_path(), 'dbt')
            project_names = [
                name for name in os.listdir(dbt_dir) if os.path.isdir(os.path.join(dbt_dir, name))
            ]
            for project_name_init in project_names:
                profiles_full_path = os.path.join(dbt_dir, project_name_init, 'profiles.yml')

                info = get_dbt_project_name_from_settings(project_name_init)
                project_name = info.get('project_name', project_name_init)

                targets = []
                profiles = await load_profiles_async(project_name, profiles_full_path)
                outputs = profiles.get('outputs')
                if outputs:
                    targets += sorted(list(outputs.keys()))

                projects[project_name_init] = dict(
                    project_name=project_name,
                    target=profiles.get('target'),
                    targets=targets,
                )

        return dict(dbt=dict(
            block=block_metadata,
            project=project,
            projects=projects,
        ))

    def run_tests(
        self,
        build_block_output_stdout=None,
        global_vars=None,
        **kwargs,
    ):
        """
        Run tests for the DBT block.

        Args:
            build_block_output_stdout: The build block output stdout.
            global_vars: The global variables.
            **kwargs: Additional keyword arguments.

        """
        if self.configuration.get('file_path') is not None:
            attributes_dict = parse_attributes(self)
            snapshot = attributes_dict['snapshot']
            if snapshot:
                return

        run_dbt_tests(
            block=self,
            build_block_output_stdout=build_block_output_stdout,
            global_vars=global_vars,
        )

    def tags(self) -> List[str]:
        """
        Get the tags associated with the DBT block.

        Returns:
            List[str]: The list of tags.

        """
        arr = super().tags()

        if self.configuration.get('file_path') is not None:
            attributes_dict = parse_attributes(self)
            if attributes_dict['snapshot']:
                from mage_ai.data_preparation.models.block.constants import (
                    TAG_DBT_SNAPSHOT,
                )
                arr.append(TAG_DBT_SNAPSHOT)

        if BlockLanguage.YAML == self.language:
            settings = self.configuration.get('dbt', None)
            if settings:
                command = settings.get('command', 'run')
                if command:
                    arr.append(command)

        return arr

    def update_upstream_blocks(self, upstream_blocks: List[Any]) -> None:
        """
        Update the upstream blocks of the DBT block.

        Args:
            upstream_blocks (List[Any]): The list of upstream blocks.

        """
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
        """
        Execute the DBT block.

        Args:
            outputs_from_input_vars:
            execution_partition (str, optional): The execution partition.
            global_vars (Dict, optional): The global variables.
            test_execution (bool, optional): Whether it is a test execution.
            runtime_arguments (Dict, optional): The runtime arguments.
            run_settings (Dict, optional): The run settings.
            **kwargs: Additional keyword arguments.

        Returns:
            List: The list of outputs.

        """
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

        try:
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

            snapshot = dbt_command == 'snapshot'

            if is_sql and test_execution:
                subprocess.run(
                    cmds,
                    preexec_fn=os.setsid,  # os.setsid doesn't work on Windows
                    stdout=stdout,
                )

                if not snapshot:
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
                    encoding='utf-8',
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
                target_path = None
                if self.configuration.get('file_path') is not None:
                    attributes_dict = parse_attributes(self)
                    target_path = attributes_dict['target_path']

                if snapshot and BlockLanguage.SQL == self.language:
                    query_string = compiled_query_string(self)
                    if query_string:

                        print('Compiled snapshot query string:')
                        for line in query_string.split('\n'):
                            print(f'|    {line.strip()}')
                elif target_path is not None:
                    run_results_file_path = os.path.join(
                        project_full_path,
                        target_path,
                        'run_results.json',
                    )
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
                            not all([BlockType.DBT == block.type
                                     for block in self.downstream_blocks]):
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
        finally:
            # Always delete the temporary profiles dir
            try:
                shutil.rmtree(profiles_dir)
            except Exception as err:
                print(f'Error removing temporary profile at {temp_profile_full_path}: {err}')

        return outputs
