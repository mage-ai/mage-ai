import os
import re
from logging import Logger
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import pandas as pd
import simplejson
from jinja2 import Template

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.dbt.constants import LogLevel
from mage_ai.data_preparation.models.block.dbt.dbt_cli import DBTCli
from mage_ai.data_preparation.models.block.dbt.profiles import Profiles
from mage_ai.data_preparation.models.block.dbt.project import Project
from mage_ai.data_preparation.models.block.dbt.utils import (
    get_source_name,
    get_source_table_name_for_block,
)
from mage_ai.data_preparation.models.block.platform.mixins import (
    ProjectPlatformAccessible,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.files import find_file_from_another_file_path
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.path_fixer import add_absolute_path
from mage_ai.shared.strings import remove_extension_from_filename
from mage_ai.shared.utils import clean_name


class DBTBlockSQL(DBTBlock, ProjectPlatformAccessible):
    @property
    def content_compiled(self) -> Optional[str]:
        """
        Gets the compiled sql

        Returns:
            str: compiled sql
        """
        project = Project(self.project_path).project
        target_path = project.get('target-path', 'target')
        file_path = self.file_path
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
        return add_absolute_path(
            self.get_file_path_from_source() or self.configuration.get('file_path'),
        )

    @property
    def project_path(self) -> Union[str, os.PathLike]:
        """
        Gets the path of the dbt project in use.

        Returns:
            Union[str, os.PathLike]: Path of the dbt project, being used
        """
        if not self.file_path:
            return

        project_file_path = find_file_from_another_file_path(
            self.file_path,
            lambda x: os.path.basename(x) in [
                'dbt_project.yml',
                'dbt_project.yaml',
            ],
        )

        if project_file_path:
            return os.path.dirname(project_file_path)

    def set_default_configurations(self):
        self.configuration = self.configuration or {}
        file_path = self.configuration.get('file_path') or \
            (self.configuration.get('file_source') or {}).get('path')

        file_path = add_absolute_path(file_path, add_base_repo_path=False) if file_path else None
        if not file_path:
            return

        self.configuration['file_path'] = file_path
        self.configuration['file_source'] = dict(
            path=file_path,
        )

        try:
            self.uuid = str(Path(self.file_path).relative_to(base_repo_path()).with_suffix(''))
        except ValueError:
            pass

        if self.project_path:
            try:
                pp = str(Path(self.project_path).relative_to(base_repo_path()))
                self.configuration['dbt_project_name'] = pp
                self.configuration['file_source']['project_path'] = pp
            except ValueError:
                pass

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

        node_path = self.file_path
        node_path_parts = node_path.split(os.sep)
        node_path_type_part = node_path_parts[1]

        return search_paths.get(node_path_type_part)

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
        with Profiles(
            self.project_path,
            self.pipeline.variables if self.pipeline else {},
        ) as profiles:
            try:
                args = [
                    'list',
                    # project-dir
                    # /home/src/default_repo/default_platform/default_repo/dbt/demo
                    '--project-dir', self.project_path,
                    '--profiles-dir', str(profiles.profiles_dir),
                    '--select', '+' + Path(self.file_path).stem,
                    '--output', 'json',
                    '--output-keys', 'unique_id original_file_path depends_on',
                    '--resource-type', 'model',
                    '--resource-type', 'snapshot'
                ]
                res = DBTCli().invoke(args)

                if res:
                    nodes_init = [simplejson.loads(node) for node in res.result]
                else:
                    return []
            except Exception as err:
                print(f'[ERROR] DBTBlockSQL.upstream_dbt_blocks: {err}.')
                return [
                    self.build_dbt_block(
                        block_class=DBTBlock,
                        block_dict=dict(
                            block_type=self.type,
                            configuration=self.configuration,
                            language=self.language,
                            name=self.uuid,
                            pipeline=self.pipeline,
                            uuid=self.uuid,
                        ),
                        hydrate_configuration=False,
                    )
                ]

        # transform List into dict and remove unnecessary fields
        file_path = self.file_path
        path_parts = file_path.split(os.sep)
        project_dir = path_parts[0]

        nodes_default = {
            node['unique_id']: {
                # file_path:
                # default_repo/dbt/demo/models/example/model.sql
                # default_platform/default_repo/dbt/demo/models/example/model.sql
                'file_path': os.path.join(project_dir, node['original_file_path']),
                'original_file_path': node['original_file_path'],
                'upstream_nodes': set(node['depends_on']['nodes'])
            }
            for node in nodes_init
        }

        nodes = self.hydrate_dbt_nodes(nodes_default, nodes_init)

        # calculate downstream_nodes
        for unique_id, node in nodes.items():
            for upstream_node in node['upstream_nodes']:
                if nodes.get(upstream_node):
                    downstream_nodes = nodes[upstream_node].get('downstream_nodes', set())
                    downstream_nodes.add(unique_id)
                    nodes[upstream_node]['downstream_nodes'] = downstream_nodes

        # map dbt unique_id to mage uuid
        uuids_default = {
            unique_id: clean_name(
                remove_extension_from_filename(node['file_path']),
                allow_characters=[os.sep]
            )
            for unique_id, node in nodes.items()
        }
        uuids = self.node_uuids_mapping(uuids_default, nodes)

        # replace dbt unique_ids with mage uuids
        nodes = {
            uuids[unique_id]: {
                'file_path': node['file_path'],
                'original_file_path': node['original_file_path'],
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
                elif self.pipeline:
                    block = self.pipeline.get_block(
                        uuid,
                        self.type,
                    )
            # if not found create the block
            block = block or self.build_dbt_block(
                block_class=DBTBlock,
                block_dict=dict(
                    block_type=self.type,
                    configuration=dict(file_path=node['file_path']),
                    language=self.language,
                    name=uuid,
                    pipeline=self.pipeline,
                    uuid=uuid,
                ),
                node=node,
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
        # Create upstream tables
        self.__create_upstream_tables(
            execution_partition=execution_partition,
            global_vars=global_vars,
            logger=logger,
            outputs_from_input_vars=outputs_from_input_vars,
            runtime_arguments=runtime_arguments,
        )

        # Which dbt task should be executed
        task = self.__task(from_notebook, run_settings)

        # Set project-dir argument for invoking dbt
        args = ['--project-dir', self.project_path]

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
        args += ['--select', f"{prefix}{Path(self.file_path).stem}{suffix}"]

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
            cli = DBTCli(logger=logger)
            args += ([
                "--profiles-dir", str(profiles.profiles_dir)
            ])

            cli.invoke(['deps'] + args)

            # run primary task, except for show
            if task != 'show':
                res = cli.invoke([task] + args)
                success = res.success
                if not success:
                    raise Exception(str(res.exception))
            # run show task, to get data for preview or downstream usage
            # test task does not have any data
            #
            df = None
            if needs_downstream_df or needs_preview_df:
                # add limit to show task
                args += (["--limit", str(limit)])
                res = cli.invoke(['show'] + args)
                if res.success:
                    df = cli.to_pandas(res)
                else:
                    raise Exception(str(res.exception))

        # provide df for downstream usage or data preview
        self.store_variables(
            # key differes whether its executed from notebook or execcuted in the background
            {'df' if from_notebook else 'output_0': df},
            execution_partition=execution_partition,
            override_outputs=True,
        )

        return [df]

    def sample_data(self, limit: int = None, log_level: LogLevel = None, logger: Logger = None):
        limit = limit or self.configuration.get('limit', 1000)

        args = [
            'show',
            '--project-dir',
            self.project_path,
            '--select',
            Path(self.file_path).stem,
            '--limit',
            str(limit),
        ]

        target = self.configuration.get('dbt_profile_target')
        if target:
            target = Template(target).render(
                variables=lambda x: '',
                **get_template_vars()
            )
            args += ['--target', target]

        with Profiles(self.project_path, None) as profiles:
            cli = DBTCli(logger=logger)
            args += ([
                '--profiles-dir',
                str(profiles.profiles_dir),
            ])

            res = cli.invoke(args, log_level=log_level)
            if res.success:
                return cli.to_pandas(res)
            else:
                raise Exception(str(res.exception))

    def __create_upstream_tables(
        self,
        execution_partition: Optional[str] = None,
        global_vars: Dict = None,
        logger: Logger = None,
        outputs_from_input_vars: List = None,
        runtime_arguments: Optional[Dict[str, Any]] = None,
    ):
        if outputs_from_input_vars is None:
            outputs_from_input_vars = []

        upstream_blocks = self.__upstream_blocks_from_sources(global_vars=global_vars)

        for ublock in upstream_blocks:

            output = None
            if ublock.uuid in outputs_from_input_vars:
                output = outputs_from_input_vars[ublock.uuid]
            else:
                output = self.pipeline.variable_manager.get_variable(
                    self.pipeline.uuid,
                    ublock.uuid,
                    'output_0',
                    partition=execution_partition,
                )

            # normalize output
            if isinstance(output, pd.DataFrame):
                df = output
            elif isinstance(output, dict):
                df = pd.DataFrame([output])
            elif isinstance(output, list):
                df = pd.DataFrame(output)
            else:
                df = pd.DataFrame()

            if df.empty:
                if logger:
                    logger.info('No data for dbt to materialize.')
            else:
                DBTBlock.materialize_df(
                    df=df,
                    pipeline_uuid=self.pipeline.uuid,
                    block_uuid=ublock.uuid,
                    targets=[(self.project_path, self.target(variables=global_vars))],
                    logger=logger,
                    global_vars=global_vars,
                    runtime_arguments=runtime_arguments,
                )

    def __extract_sources(self) -> List[Tuple[str, str]]:
        return re.findall(
            r"{}[ ]*source\(['\"]+([\w]+)['\"]+[,]+[ ]*['\"]+([\w]+)['\"]+\)[ ]*{}".format(
                r'\{\{',
                r'\}\}',
            ),
            self.content,
        )

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

    def __upstream_blocks_from_sources(self, global_vars: Dict = None) -> List[Block]:
        mapping = {}
        sources = self.__extract_sources()
        for tup in sources:
            source_name, table_name = tup
            if source_name not in mapping:
                mapping[source_name] = {}
            mapping[source_name][table_name] = True

        source_name = get_source_name(Path(self.project_path).stem)

        arr = []
        for b in self.upstream_blocks:
            table_name = get_source_table_name_for_block(b)
            if mapping.get(source_name, {}).get(table_name):
                arr.append(b)

        return arr

    def __get_original_file_path(self):
        if self.project_platform_activated:
            file_path = self.get_file_path_from_source()
            if file_path:
                return file_path

        return self.configuration.get('file_path')
