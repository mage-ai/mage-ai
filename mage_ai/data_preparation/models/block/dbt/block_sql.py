import os
from logging import Logger
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import simplejson
from jinja2 import Template

from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.dbt.dbt_cli import DBTCli
from mage_ai.data_preparation.models.block.dbt.profiles import Profiles
from mage_ai.data_preparation.models.block.dbt.project import Project
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.strings import remove_extension_from_filename
from mage_ai.shared.utils import clean_name


class DBTBlockSQL(DBTBlock):

    @property
    def content_compiled(self) -> Optional[str]:
        """
        Gets the compiled sql

        Returns:
            str: compiled sql
        """
        project = Project(self.project_path).project
        target_path = project.get('target-path', 'target')
        file_path = self.configuration.get('file_path')
        compiled_path = Path(self.project_path) / target_path / 'compiled' / file_path

        compiled_sql = None
        if compiled_path.exists():
            with compiled_path.open('r') as f:
                compiled_sql = f.read()

        return compiled_sql

    @property
    def file_path(self) -> Union[str, os.PathLike]:
        """
        Returns the file path for the DBT block.
        This overrides the default implementation for the file path, since the SQL
        files are primarily managed by dbt.

        Returns:
            Union[str, os.PathLike]: The file path of the DBT block.
        """
        file_path = self.configuration.get('file_path')

        return str((Path(self.repo_path)) / 'dbt' / file_path)

    @property
    def project_path(self) -> Union[str, os.PathLike]:
        """
        Gets the path of the dbt project in use.

        Returns:
            Union[str, os.PathLike]: Path of the dbt project, being used
        """
        return str(
            Path(self.base_project_path) /
            self.configuration.get('file_path', '').split(os.sep)[0]
        )

    @property
    def __node_type(self) -> str:
        """
        Based on the path of the dbt node, this gets the type of the node.

        Returns:
            str: dbt node type
        """
        project = Project(self.project_path).project
        search_paths = {
            'model': project.get('model-paths', ['models']),
            'snapshot': project.get('snapshot-paths', ['snapshots']),
            'seed': project.get('seed-paths', ['seeds']),
            'analysis': project.get('analysis-paths', ['analyses'])
        }
        search_paths = {_path: k for k, v in search_paths.items() for _path in v}

        node_path = self.configuration.get('file_path')
        node_path_parts = node_path.split(os.sep)
        node_path_type_part = node_path_parts[1]

        return search_paths.get(node_path_type_part)

    async def metadata_async(self) -> Dict[str, Any]:
        """
        Retrieves metadata needed to configure the block.
        - dbt project to use
        - dbt target to use and other dbt targets for the project

        Returns:
            Dict: The metadata of the DBT block.
        """
        project = None
        projects = {}

        project_full_path = self.project_path
        project = Project(project_full_path).project
        project_name = project.get('name')
        project_profile = project.get('profile')

        # ignore exception if no profiles.yml is found.
        # Just means that the targets have no option
        try:
            profiles = Profiles(
                project_full_path,
                self.pipeline.variables if self.pipeline else None
            ).profiles
        except FileNotFoundError:
            profiles = None
        profile = profiles.get(project_profile) if profiles else None
        target = profile.get('target') if profile else None
        targets = sorted(list(profile.get('outputs', {}).keys())) if profile else None

        projects = {
            project_name: {
                'target': target,
                'targets': targets
            }
        }

        node_type = self.__node_type

        return {
            'dbt': {
                'block': {
                    'snapshot': node_type == 'snapshot'
                },
                'project': project_name,
                'projects': projects
            }
        }

    def tags(self) -> List[str]:
        """
        Get the tags associated with the DBT block.

        Returns:
            List[str]: The list of tags.
        """
        arr = super().tags()
        node_type = self.__node_type
        if node_type == 'snapshot':
            arr.append(self.__node_type)
        return arr

    def upstream_dbt_blocks(self, read_only=False) -> List['DBTBlockSQL']:
        """
        Get an up to date list, which represents the upstream dbt graph.
        It is using `dbt list` to generate the list.

        Args:
            read_only (bool):
                If True it does not read the Blocks from the model. Defaults to False

        Returns:
            List[DBTBlockSQL]: THe upstream dbt graph as DBTBlocksSQL objects
        """
        # Get upstream nodes via dbt list
        with Profiles(self.project_path, self.pipeline.variables) as profiles:
            args = [
                'list',
                '--project-dir', self.project_path,
                '--profiles-dir', str(profiles.profiles_dir),
                '--select', '+' + Path(self.configuration.get('file_path')).stem,
                '--output', 'json',
                '--output-keys', 'unique_id original_file_path depends_on',
                '--resource-type', 'model',
                '--resource-type', 'snapshot'
            ]
            res, _success = DBTCli(args).invoke()
        if res:
            nodes = [simplejson.loads(node) for node in res]
        else:
            return []

        # transform List into dict and remove unnecessary fields
        file_path = self.configuration.get('file_path')
        path_parts = file_path.split(os.sep)
        project_dir = path_parts[0]
        nodes = {
            node['unique_id']: {
                'file_path': os.path.join(project_dir, node['original_file_path']),
                'upstream_nodes': set(node['depends_on']['nodes'])
            }
            for node in nodes
        }

        # calculate downstream_nodes
        for unique_id, node in nodes.items():
            for upstream_node in node['upstream_nodes']:
                if nodes.get(upstream_node):
                    downstream_nodes = nodes[upstream_node].get('downstream_nodes', set())
                    downstream_nodes.add(unique_id)
                    nodes[upstream_node]['downstream_nodes'] = downstream_nodes

        # map dbt unique_id to mage uuid
        uuids = {
            unique_id: clean_name(
                remove_extension_from_filename(node['file_path']),
                allow_characters=[os.sep]
            )
            for unique_id, node in nodes.items()
        }

        # replace dbt unique_ids with mage uuids
        nodes = {
            uuids[unique_id]: {
                'file_path': node['file_path'],
                'upstream_nodes': {
                    uuids[upstream_node]
                    for upstream_node in node.get('upstream_nodes', set())
                    if uuids.get(upstream_node)
                },
                'downstream_nodes': {
                    uuids[downstream_node]
                    for downstream_node in node.get('downstream_nodes', set())
                    if uuids.get(downstream_node)
                }
            }
            for unique_id, node in nodes.items()
        }

        # create dict of blocks
        blocks = {}
        for uuid, node in nodes.items():
            block = None
            if not read_only:
                if uuid == self.uuid:
                    block = self
                else:
                    block = self.pipeline.get_block(
                        uuid,
                        self.type,
                    )
            # if not found create the block
            block = block or DBTBlock(
                name=uuid,
                uuid=uuid,
                block_type=self.type,
                language=self.language,
                pipeline=self.pipeline,
                configuration=dict(file_path=node['file_path'])
            )
            # reset upstream dbt blocks
            block.upstream_blocks = [
                block
                for block in block.upstream_blocks
                # there must not be any other upstream dbt blocks that are not part of
                # the upstream nodes, therefore delete all upstream dbt blocks
                if not isinstance(block, DBTBlockSQL)
            ]
            # reset downstream dbt blocks
            block.downstream_blocks = [
                block
                for block in block.downstream_blocks
                # remove all downstream dbt block, which are part of the upstream nodes,
                # in order to fix errors
                if block.uuid not in nodes.keys()
            ]
            blocks[uuid] = block

        # Update upstream and downstream dbt blocks
        for uuid, node in nodes.items():
            for upstream_node in node.get('upstream_nodes', set()):
                blocks[uuid].upstream_blocks.append(blocks[upstream_node])
            for downstream_node in node.get('downstream_nodes', set()):
                blocks[uuid].downstream_blocks.append(blocks[downstream_node])

        # transform into list
        blocks = [block for _, block in blocks.items()]
        return blocks

    def _execute_block(
        self,
        outputs_from_input_vars,
        execution_partition: Optional[str] = None,
        from_notebook: bool = False,
        global_vars: Optional[Dict[str, Any]] = None,
        logger: Logger = None,
        runtime_arguments: Optional[Dict[str, Any]] = None,
        run_settings: Optional[Dict[str, bool]] = None,
        **kwargs,
    ) -> List:
        """
        Execute the DBT block.

        Args:
            outputs_from_input_vars:
            execution_partition (Optional[str], optional): The execution partition.
            from_notebook (bool, optional): Whether it is an execution from the notebook.
            global_vars (Optional[Dict[str, Any]], optional): The global variables.
            runtime_arguments (Optional[Dict[str, Any]], optional): The runtime arguments.
            run_settings (Optional[Dict[str, bool]], optional): The run settings.
            **kwargs: Additional keyword arguments.

        Returns:
            List: The list of outputs.
        """
        # Which dbt task should be executed
        task = self.__task(from_notebook, run_settings)

        # Set project-dir argument for invoking dbt
        args = ["--project-dir", self.project_path]

        # Get variables
        variables = merge_dict(global_vars, runtime_arguments or {})

        # Set flags and prefix/suffix from runtime_configuration
        # e.g. setting --full-refresh

        runtime_configuration = variables.get(
            PIPELINE_RUN_MAGE_VARIABLES_KEY,
            {},
        ).get('blocks', {}).get(self.uuid, {}).get('configuration', {})
        if runtime_configuration.get('flags'):
            flags = runtime_configuration['flags']
            args += flags if isinstance(flags, list) else [flags]

        # Select the node
        prefix = ''
        if runtime_configuration.get('prefix'):
            prefix = runtime_configuration['prefix']
        suffix = ''
        if runtime_configuration.get('suffix'):
            suffix = runtime_configuration['suffix']
        args += ['--select', f'{prefix}{Path(self.configuration.get("file_path")).stem}{suffix}']

        # Create --vars
        args += ['--vars', self._variables_json(variables)]

        # Set target argument for invoking dbt
        target = self.configuration.get('dbt_profile_target')
        if target:
            target = Template(target).render(
                variables=lambda x: variables.get(x) if variables else None,
                **get_template_vars()
            )
            args += ['--target', target]

        # Check whether there is need for a df for preview and set limit
        needs_preview_df = False
        if from_notebook and task != 'test':
            needs_preview_df = True
            limit = self.configuration.get('limit', 1000)

        # Check whether there is need for a downstream df and set no limit (-1)
        needs_downstream_df = False
        if (
            not from_notebook and
            self.downstream_blocks and
            any([
                block.type != BlockType.DBT and
                block.language in [
                    BlockLanguage.PYTHON,
                    BlockLanguage.R,
                    BlockLanguage.SQL]
                for block in self.downstream_blocks
            ])
        ):
            needs_downstream_df = True
            limit = -1

        # Interpolate profiles.yml and invoke dbt
        with Profiles(self.project_path, variables) as profiles:
            args += ([
                "--profiles-dir", str(profiles.profiles_dir)
            ])
            # run primary task, except for show
            if task != 'show':
                _res, success = DBTCli([task] + args, logger).invoke()
                if not success:
                    raise Exception('DBT exited with a non 0 exit status.')
            # run show task, to get data for preview or downstream usage
            # test task does not have any data
            #
            df = None
            if needs_downstream_df or needs_preview_df:
                # add limit to show task
                args += (["--limit", str(limit)])
                df, _res, success = DBTCli(['show'] + args, logger).to_pandas()
                if not success:
                    raise Exception('DBT exited with a non 0 exit status.')

        # provide df for downstream usage or data preview
        self.store_variables(
            # key differes whether its executed from notebook or execcuted in the background
            {'df' if from_notebook else 'output_0': df},
            execution_partition=execution_partition,
            override_outputs=True,
        )

        return [df]

    def __task(
        self,
        from_notebook: bool,
        run_settings: Optional[Dict[str, bool]]
    ) -> str:
        """
        Gets the dbt task, which should be ran, based on the inputs.

        Args:
            from_notebook (bool):
                whether the execution was triggered from notebook(True) or background(False)
            run_settings (Optional[Dict[str, bool]]): additional settings provided from the notebook

        Returns:
            str: dbt task
        """
        # Run:Execute Pipeline will provide run_settings=None, from_notebook=True
        # Compile & Preview will provide run_settings={}, from_notebook=True
        # This is very important:
        # - the first needs to run dbt build/run/snapshot
        # - the second needs to run dbt show

        # | from_notebook | run_settings         | disable_tests | task         |
        # | ------------- | -------------------- | ------------- | ------------ |
        # | True          | {}                   | False/None    | build        |
        # | True          | {}                   | True          | run/snapshot |
        # | True          | {'run_model':True}   | any           | run/snapshot |
        # | True          | {'test_model':True}  | any           | test         |
        # | True          | {'build_model':True} | any           | build        |
        # | True          | {}                   | any           | run/snapshot |
        # | False         | any                  | False/None    | build        |
        # | False         | any                  | True          | run/snapshot |

        if from_notebook:
            if run_settings is not None:
                if run_settings.get('run_model'):
                    if self.__node_type == 'snapshot':
                        return 'snapshot'
                    else:
                        return 'run'
                elif run_settings.get('test_model'):
                    return 'test'
                elif run_settings.get('build_model'):
                    return 'build'
                else:
                    return 'show'
        elif self._dbt_configuration.get('disable_tests'):
            if self.__node_type == 'snapshot':
                return 'snapshot'
            else:
                return 'run'
        return 'build'
