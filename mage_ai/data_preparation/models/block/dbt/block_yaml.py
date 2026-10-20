import os
import shlex
from logging import Logger
from typing import Any, Dict, Optional, Union

import simplejson
from jinja2 import Template

from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.dbt.dbt_cli import DBTCli
from mage_ai.data_preparation.models.block.dbt.profiles import Profiles
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.utils import get_variable_for_template
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.custom_logger import DX_PRINTER
from mage_ai.shared.files import (
    find_file_from_another_file_path,
    get_full_file_paths_containing_item,
)
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.path_fixer import add_absolute_path


class DBTBlockYAML(DBTBlock):
    @property
    def project_path(self) -> Union[str, os.PathLike]:
        """
        Gets the path of the dbt project in use.

        Returns:
            Union[str, os.PathLike]: Path of the dbt project, being used
        """
        # Example:
        # demo
        # default_repo/dbt/demo

        # if self.configuration.get(''dbt_project_path''):
        #     return add_absolute_path(self.configuration.get(''dbt_project_path''))

        file_path = None
        for key in [
            'dbt_profiles_file_path',
            'dbt_project_name',
        ]:
            if not file_path and self.configuration.get(key):
                path = add_absolute_path(self.configuration.get(key))
                file_path = find_file_from_another_file_path(
                    path,
                    lambda x: os.path.basename(x) in [
                        'dbt_project.yml',
                        'dbt_project.yaml',
                    ],
                )
                if file_path:
                    return os.path.dirname(file_path)

        if file_path is None and self.configuration and self.configuration.get('dbt_project_name'):
            file_paths = get_full_file_paths_containing_item(
                os.path.join(
                    get_repo_path(root_project=False),
                    'dbt',
                    self.configuration.get('dbt_project_name'),
                ),
                lambda x: x and (
                    str(x).endswith('dbt_project.yml') or
                    str(x).endswith('dbt_project.yaml'),
                ),
            )
            if file_paths:
                file_path = file_paths[0]
                return os.path.dirname(file_path)

    def set_default_configurations(self):
        self.configuration = self.configuration or {}
        if not self.configuration.get('file_source'):
            self.configuration['file_source'] = {}

        pp = self.project_path
        if pp:
            self.configuration['file_source']['project_path'] = add_absolute_path(
                pp,
                add_base_repo_path=False,
            )

        if not self.configuration['file_source'].get('path'):
            self.configuration['file_source']['path'] = add_absolute_path(
                self.file_path,
                add_base_repo_path=False,
            )

    def _execute_block(
        self,
        outputs_from_input_vars,
        global_vars: Optional[Dict[str, Any]] = None,
        logger: Logger = None,
        runtime_arguments: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> None:
        """
        Execute the DBT block.

        Args:
            outputs_from_input_vars:
            global_vars (Optional[Dict[str, Any]], optional): The global variables.
            runtime_arguments (Optional[Dict[str, Any]], optional): The runtime arguments.
        """
        # Which dbt task should be executed
        DX_PRINTER.label = 'DBTYamlBlock'

        task = self._dbt_configuration.get('command', 'run')

        # Get variables
        variables = merge_dict(global_vars, runtime_arguments or {})

        content = self.content or ''
        content = self.interpolate_content(
            content,
            outputs_from_input_vars=outputs_from_input_vars,
            variables=variables,
            **kwargs,
        )

        # Get args from block content and split them by word, just like a shell does
        # This handles quoting correctly, e.g. when supplying a json string
        args = shlex.split(content)

        # Set project-dir argument for invoking dbt
        args += ["--project-dir", self.project_path]

        # Set flags and prefix/suffix from runtime_configuration
        # e.g. setting --full-refresh
        runtime_configuration = variables.get(
            PIPELINE_RUN_MAGE_VARIABLES_KEY,
            {},
        ).get('blocks', {}).get(self.uuid, {}).get('configuration', {})
        if runtime_configuration.get('flags'):
            flags = runtime_configuration['flags']
            args += flags if isinstance(flags, list) else [flags]

        # Create --vars
        # Check whether vars already supplied, if yes, then merge with variables
        vars_index = None
        try:
            vars_index = args.index('--vars') + 1
        except Exception:
            pass

        DX_PRINTER.debug(
            f'execute block content: {content}',
            block=self,
            args=args,
            file_path=self.file_path,
            project_path=self.project_path,
        )

        if vars_index:
            variables2 = Template(args[vars_index]).render(
                variables=lambda x, p=None, v=variables: get_variable_for_template(
                    x,
                    parse=p,
                    variables=v,
                ),
                **get_template_vars(),
            )
            args[vars_index] = self._variables_json(merge_dict(
                variables,
                # manual vars second, as these update the automatically interpolated vars
                simplejson.loads(variables2),
            ))
        else:
            args += ['--vars', self._variables_json(variables)]

        # Set target argument for invoking dbt
        target = self.configuration.get('dbt_profile_target')
        if target:
            target = Template(target).render(
                variables=lambda x: variables.get(x) if variables else None,
                **get_template_vars(),
            )
            args += ['--target', target]

        # Interpoalte profiles.yml and invoke dbt
        with Profiles(self.project_path, variables) as profiles:
            args += ([
                "--profiles-dir", str(profiles.profiles_dir)
            ])

            cli = DBTCli(logger=logger)

            cli.invoke(['deps'] + args)

            res = cli.invoke([task] + args)
            if not res.success:
                raise Exception(str(res.exception))
