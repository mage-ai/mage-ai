import os
from pathlib import Path
from typing import Any, List

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_FILES
from mage_ai.command_center.models import CommandCenterSettings
from mage_ai.settings import MAX_FILE_CACHE_SIZE
from mage_ai.settings.platform import build_repo_path_for_all_projects
from mage_ai.settings.repo import get_repo_path
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.files import get_absolute_paths_from_all_files
from mage_ai.shared.strings import size_of_string

FILENAME_DELIMITER = "\t"


class FileCache(BaseCache):
    cache_key = CACHE_KEY_FILES

    @classmethod
    def initialize_cache(
        self,
        absolute_paths: List[str],
        replace: bool = False,
    ) -> "FileCache":
        repo_path = get_repo_path(root_project=True)
        cache = self(repo_path=repo_path)

        if replace or not cache.exists():
            cache.build_cache(absolute_paths)

        return cache

    @classmethod
    def initialize_cache_with_settings(self, replace: bool = False) -> "FileCache":
        # Include all projects from platform
        # Relative to the base repo path
        base_path = base_repo_path()

        paths = []
        paths_excludes = []
        projects = []
        projects_excludes = []

        # Include directories listed in command center settings and exclude those listed.
        settings = CommandCenterSettings.load_from_file_path()
        if settings and settings.cache and settings.cache.files:
            if settings.cache.files.directories:
                paths.extend(settings.cache.files.directories.includes or [])
                paths_excludes.extend(settings.cache.files.directories.excludes or [])

            if settings.cache.files.projects:
                projects_excludes.extend(settings.cache.files.projects.excludes or [])
                projects.extend(settings.cache.files.projects.includes or [])

        for project_name, path_dict in build_repo_path_for_all_projects(
            mage_projects_only=True,
        ).items():
            path = path_dict.get("path")
            if (
                path
                and project_name not in projects_excludes
                and all([not path.startswith(ex) for ex in paths_excludes])
            ):
                paths.append(path)

        paths = [os.path.join(base_path, path) for path in paths]
        if not paths:
            paths = [base_path]

        return self.initialize_cache(paths, replace=replace)

    def exists(self) -> bool:
        return os.path.exists(self.build_path(self.cache_key))

    async def load(self) -> List[str]:
        content = await self.storage.read_async(self.build_path(self.cache_key))
        if content:
            return content.split(FILENAME_DELIMITER)

    def build_cache(self, absolute_paths: List[str]) -> List[str]:
        base_path = base_repo_path()

        def __parse_values(tup, base_path=base_path):
            file_path, file_size, file_modified_time = tup
            try:
                diff = Path(file_path).relative_to(base_path)
            except Exception as err:
                print(f"[ERROR] FileCache.build_cache: {err}.")
                diff = file_path

            return f"{diff},{file_size},{file_modified_time}"

        arr_init = []
        for absolute_path in absolute_paths:
            arr_init.extend(
                get_absolute_paths_from_all_files(
                    absolute_path,
                    comparator=lambda absolute_path: not absolute_path.endswith(".pyc"),
                    parse_values=__parse_values,
                )
            )

        if arr_init and len(arr_init) >= 1:
            arr_init.sort()

            arr = []
            file_size = 0
            for text in arr_init:
                if file_size >= MAX_FILE_CACHE_SIZE:
                    break

                file_size += size_of_string(text)
                arr.append(text)

            self._temp_data = arr

            self.set(self.cache_key, FILENAME_DELIMITER.join(arr))
        else:
            print(
                "[WARNING] FileCache.build_cache: 0 files cached, this may be a mistake."
            )

        return arr

    def set(self, key: str, value: Any) -> None:
        with self.storage.open_to_write(self.build_path(key)) as f:
            f.write(value)
