import os
from typing import Dict, List

from mage_ai.cache.dbt.utils import get_project_path_from_file_path
from mage_ai.data_preparation.models.block.platform.utils import (
    from_another_project,
    get_selected_directory_from_file_path,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.file import File
from mage_ai.settings.platform import (
    get_repo_paths_for_file_path,
    project_platform_activated,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.path_fixer import (
    add_absolute_path,
    add_root_repo_path_to_relative_path,
    get_path_parts,
    remove_base_repo_directory_name,
    remove_base_repo_name,
)
from mage_ai.shared.strings import remove_extension_from_filename
from mage_ai.shared.utils import clean_name


class ProjectPlatformAccessible:
    @property
    def project_platform_activated(self):
        if self._project_platform_activated is not None:
            return self._project_platform_activated

        self._project_platform_activated = project_platform_activated()

        return self._project_platform_activated

    def clean_file_paths(self, configuration: Dict) -> Dict:
        config = (configuration or {}).copy()

        if not config:
            return config

        if config.get('file_source'):
            file_source = config.get('file_source') or {}
            if file_source:
                if file_source.get('path'):
                    # default_platform/tons_of_dbt_projects/diff_name/models/example/
                    # my_first_dbt_model.sql
                    path = file_source.get('path')
                    path = add_absolute_path(path, add_base_repo_path=False)
                    file_source['path'] = path
                    config['file_source'] = file_source

                    if path and \
                            BlockType.DBT == self.type and \
                            BlockLanguage.YAML != self.language:

                        # /home/src/default_repo/default_platform/
                        # tons_of_dbt_projects/diff_name
                        project_path = get_selected_directory_from_file_path(
                            file_path=path,
                            selector=lambda fn: (
                                str(fn).endswith('dbt_project.yml') or
                                str(fn).endswith('dbt_project.yaml')
                            ),
                        )
                        # tons_of_dbt_projects/diff_name
                        if project_path:
                            file_source['project_path'] = add_absolute_path(
                                project_path,
                                add_base_repo_path=False
                            )
        elif config.get('file_path'):
            file_path = config.get('file_path')
            config['file_path'] = str(add_absolute_path(
                file_path,
                add_base_repo_path=False
            )) if file_path else file_path

        return config

    def is_from_another_project(self) -> bool:
        return self.project_platform_activated and from_another_project(
            self.file_source_path(),
            other_file_path=self.pipeline.dir_path if self.pipeline else None,
        )

    def get_file_path_from_source(self) -> str:
        if not self.project_platform_activated:
            return

        return self.file_source_path()

    def get_project_path_from_source(self) -> str:
        if not self.project_platform_activated:
            return

        # tons_of_dbt_projects/diff_name
        project_path_relative = self.__file_source_project()
        if project_path_relative:
            return os.path.join(base_repo_path(), project_path_relative)
        else:
            file_path = self.file_source_path() or self.configuration.get('file_path')
            if file_path:
                return get_project_path_from_file_path(file_path, walk_up_parents=True)

    def get_project_path_from_project_name(self, project_name: str) -> str:
        if not self.project_platform_activated or not project_name:
            return

        # The block YAML file can be from a different project than the profile

        # project_name: default_repo/dbt/demo

        # return value:
        # /home/src/default_repo/dbt/demo
        # /home/src/default_platform/default_repo/dbt/demo
        if not project_name:
            from mage_ai.data_preparation.models.block.dbt.constants import (
                DBT_DIRECTORY_NAME,
            )

            # A project profile hasn’t been selected yet for this block (it’s done through the UI).
            root_project_path, path, file_path_base = get_path_parts(self.file_source_path())
            project_name = os.path.join(path, DBT_DIRECTORY_NAME)

        return add_root_repo_path_to_relative_path(project_name)

    def get_base_project_from_source(self) -> str:
        if not self.project_platform_activated:
            # /home/src/default_repo/dbt
            return self.base_project_path

        val = self.get_project_path_from_project_name(self.configuration.get('dbt_project_name'))

        if val:
            return os.path.dirname(val)

    def build_file(self) -> File:
        if not self.project_platform_activated:
            return

        parts = get_path_parts(self.get_file_path_from_source())
        if not parts:
            return

        root_project_path, path, file_path_base = parts

        return File(
            filename=file_path_base,
            dir_path=path,
            repo_path=root_project_path,
        )

    def hydrate_dbt_nodes(self, nodes_default: Dict, nodes_init: List[Dict]) -> Dict:
        """
        Sample node:
        {
          "path": "example/my_first_dbt_model.sql",
          "original_file_path": "models/example/my_first_dbt_model.sql",
          "unique_id": "model.demo.my_first_dbt_model",
          "depends_on": {
            "macros": [],
            "nodes": []
          }
        }
        """
        if not self.project_platform_activated:
            return nodes_default

        # self.project_path
        #   /home/src/default_platform/default_repo/dbt/demo
        # node['original_file_path']
        #   models/example/model.sql
        print('self.project_path', self.project_path)
        return {
            node['unique_id']: {
                # file_path needs to be:
                # default_repo/dbt/demo/models/example/model.sql
                # default_platform/default_repo/dbt/demo/models/example/model.sql
                'file_path': remove_base_repo_directory_name(
                    os.path.join(
                        self.project_path,
                        node['original_file_path'],
                    ),
                ),
                'original_file_path': node['original_file_path'],
                'upstream_nodes': set(node['depends_on']['nodes'])
            }
            for node in nodes_init
        }

    def node_uuids_mapping(self, uuids_default: Dict, nodes: Dict) -> Dict:
        if not self.project_platform_activated:
            return uuids_default

        return {
            unique_id: clean_name(
                remove_extension_from_filename(
                    remove_base_repo_name(node['file_path']),
                ),
                allow_characters=[os.sep],
            )
            for unique_id, node in nodes.items()
        }

    def build_dbt_block(
        self,
        block_class,
        block_dict,
        node: Dict = None,
        hydrate_configuration: bool = True,
    ):
        block_type = block_dict['block_type']
        configuration = block_dict['configuration'] or {}
        language = block_dict['language']
        name = block_dict['name']
        pipeline = block_dict['pipeline']
        uuid = block_dict['uuid']

        if hydrate_configuration and self.project_platform_activated:
            # self.project_path
            #   /home/src/default_platform/default_repo/dbt/demo
            # node['original_file_path']
            #   models/example/model.sql
            configuration['file_source'] = dict(
                path=remove_base_repo_directory_name(
                    os.path.join(
                        self.project_path,
                        (node.get('original_file_path') or '') if node else '',
                    ),
                ),
            )

        return block_class.create(
            name,
            uuid,
            block_type,
            configuration=configuration,
            language=language,
            pipeline=pipeline,
        )

    def get_repo_path_from_configuration(self) -> str:
        # Example:
        # default_repo/dbt/demo/models/example/model.sql
        # main_app/platform/dbt/demo/models/model.sql

        file_path = self.get_file_path_from_source()
        if file_path:
            file_path = add_root_repo_path_to_relative_path(file_path)
        elif self.configuration.get('file_path'):
            file_path = self.configuration.get('file_path')

        if file_path:
            paths = get_repo_paths_for_file_path(file_path)
            if paths:
                return paths.get('full_path')

        return get_repo_path(root_project=False)

    def __file_source(self) -> str:
        return self.configuration.get('file_source') if self.configuration else None

    def file_source_path(self) -> str:
        file_source = self.__file_source()
        return file_source.get('path') if file_source else None

    def __file_source_project(self) -> str:
        file_source = self.__file_source()
        return file_source.get('project_path') if file_source else None
