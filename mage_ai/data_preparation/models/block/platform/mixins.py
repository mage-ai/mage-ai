from mage_ai.data_preparation.models.block.platform.utils import from_another_project
from mage_ai.data_preparation.models.file import File
from mage_ai.settings.platform import (
    project_platform_activated as project_platform_activated_func,
)
from mage_ai.shared.path_fixer import get_path_parts


class ProjectPlatformAccessible:
    @property
    def project_platform_activated(self):
        if self._project_platform_activated is not None:
            return self._project_platform_activated

        self._project_platform_activated = project_platform_activated_func()

        return self._project_platform_activated

    def get_file_path_from_source(self) -> str:
        file_source = self.__file_source()
        return file_source.get('path') if file_source else None

    def build_file(self) -> File:
        if not from_another_project(self.file_path):
            return

        file_path = self.get_file_path_from_source()
        root_project_path, path, file_path_base = get_path_parts(file_path)

        return File(
            filename=file_path_base,
            dir_path=path,
            repo_path=root_project_path,
        )

    def __file_source(self) -> str:
        return self.configuration.get('file_source') if self.configuration else None
