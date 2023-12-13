import os
from typing import Dict, List

from mage_ai.data_preparation.models.block.platform.utils import (
    from_another_project,
    get_selected_directory_from_file_path,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.settings.platform import (
    project_platform_activated as project_platform_activated_func,
)
from mage_ai.shared.path_fixer import (
    get_path_parts,
    remove_base_repo_directory_name,
    remove_repo_names,
)
from mage_ai.shared.strings import remove_extension_from_filename
from mage_ai.shared.utils import clean_name


class ProjectPlatformAccessible:
    @property
    def project_platform_activated(self):
        if self._project_platform_activated is not None:
            return self._project_platform_activated

        self._project_platform_activated = project_platform_activated_func()

        return self._project_platform_activated

    def is_from_another_project(self) -> bool:
        return self.project_platform_activated and from_another_project(self.__file_source_path())

    def get_file_path_from_source(self) -> str:
        if not self.is_from_another_project():
            return

        return self.__file_source_path()

    def get_project_path_from_source(self) -> str:
        if not self.is_from_another_project():
            return

        return get_selected_directory_from_file_path(
            file_path=self.get_file_path_from_source(),
            selector=lambda fn: (
                str(fn).endswith(os.path.join(os.sep, 'dbt_project.yml')) or
                str(fn).endswith(os.path.join(os.sep, 'dbt_project.yaml'))
            ),
        )

    def build_file(self) -> File:
        if not self.is_from_another_project():
            return

        root_project_path, path, file_path_base = get_path_parts(self.get_file_path_from_source())

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
        if not self.is_from_another_project():
            return nodes_default

        # self.project_path
        #   /home/src/default_platform/default_repo/dbt/demo
        # node['original_file_path']
        #   models/example/model.sql
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
        if not self.is_from_another_project():
            return uuids_default

        return {
            unique_id: clean_name(
                remove_extension_from_filename(
                    remove_repo_names(node['file_path']),
                ),
                allow_characters=[os.sep],
            )
            for unique_id, node in nodes.items()
        }

    def build_dbt_block(
        self,
        block_class,
        block_dict,
        node: Dict,
    ):
        block_type = block_dict['block_type']
        configuration = block_dict['configuration'] or {}
        language = block_dict['language']
        name = block_dict['name']
        pipeline = block_dict['pipeline']
        uuid = block_dict['uuid']

        if self.is_from_another_project():
            # self.project_path
            #   /home/src/default_platform/default_repo/dbt/demo
            # node['original_file_path']
            #   models/example/model.sql
            configuration['file_source'] = dict(
                path=remove_base_repo_directory_name(
                    os.path.join(
                        self.project_path,
                        node['original_file_path'],
                    ),
                ),
            )

        return block_class(
            name,
            uuid,
            block_type,
            configuration=configuration,
            language=language,
            pipeline=pipeline,
        )

    def __file_source(self) -> str:
        return self.configuration.get('file_source') if self.configuration else None

    def __file_source_path(self) -> str:
        file_source = self.__file_source()
        return file_source.get('path') if file_source else None
