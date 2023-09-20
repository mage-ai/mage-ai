import os
import shlex
from logging import Logger
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import simplejson
from jinja2 import Template

from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.dbt.dbt_cli import DBTCli
from mage_ai.data_preparation.models.block.dbt.profiles import Profiles
from mage_ai.data_preparation.models.block.dbt.project import Project
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.shared.hash import merge_dict


class DBTBlockYAML(DBTBlock):

    @property
    def project_path(self) -> Union[str, os.PathLike]:
        """
        Gets the path of the dbt project in use.

        Returns:
            Union[str, os.PathLike]: Path of the dbt project, being used
        """
        project_name = self.configuration.get('dbt_project_name')
        if project_name:
            return str(Path(self.base_project_path) / project_name)

    def tags(self) -> List[str]:
        """
        Get the tags associated with the DBT block.

        Returns:
            List[str]: The list of tags.
        """
        arr = super().tags()
        command = self._dbt_configuration.get('command', 'run')
        if command:
            arr.append(command)
        return arr

    async def metadata_async(self) -> Dict[str, Any]:
        """
        Retrieves metadata needed to configure the block.
        - available local dbt projects
        - target to use and other target of the local dbt projects

        Returns:
            Dict: The metadata of the DBT block.
        """
        projects = {}

        project_dirs = Project(self.base_project_path).local_packages
        for project_dir in project_dirs:
            project_full_path = str(Path(self.base_project_path) / project_dir)

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
            targets = sorted(list(profile.get('outputs').keys())) if profile else None

            projects[project_dir] = {
                'project_name': project_name,
                'target': target,
                'targets': targets,
            }

        return {
            'dbt': {
                'block': {},
                'project': None,
                'projects': projects
            }
        }

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
        task = self._dbt_configuration.get('command', 'run')

        # Get args from block content and split them by word, just like a shell does
        # This handles quoting correctly, e.g. when supplying a json string
        args = shlex.split(self.content)

        # Set project-dir argument for invoking dbt
        args += ["--project-dir", self.project_path]

        # Get varaibles
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

        # Create --vars
        # Check whether vars already supplied, if yes, then merge with variables
        vars_index = None
        try:
            vars_index = args.index('--vars') + 1
        except Exception:
            pass
        if vars_index:
            vars = Template(args[vars_index]).render(
                variables=lambda x: variables.get(x) if variables else None,
                **get_template_vars(),
            )
            args[vars_index] = self._variables_json(merge_dict(
                variables,
                # manual vars second, as these update the automatically interpolated vars
                simplejson.loads(vars),
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
            _res, success = DBTCli([task] + args, logger).invoke()
            if not success:
                raise Exception('DBT exited with a non 0 exit status.')
