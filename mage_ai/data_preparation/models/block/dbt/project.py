import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import aiofiles
import yaml

from mage_ai.errors.base import MageBaseException

PROJECT_FILE_NAME = 'dbt_project.yml'
PACKAGE_FILE_NAME = 'packages.yml'


class ProjectError(MageBaseException):
    """
    Error while handling dbt_project.yml and packages.yml
    """
    pass


class Project(object):
    """
    Interface for dbt dbt_project.yml and packages.yml
    - Provide dbt_project.yml as dictionary
    - Provide packages.yml as dictionary
    """

    def __init__(
        self,
        project_dir: Union[str, os.PathLike]
    ) -> None:
        """
        Interface with a dbt_project.yml

        Args:
            project_dir (Union[str, os.PathLike]): path of the dbt project
        """
        self.__project_dir: Union[str, os.PathLike] = project_dir
        self.__project: Optional[Dict[str, Any]] = None
        self.__packages: Optional[Dict[str, Any]] = None

    @property
    def project(self) -> Dict[str, Any]:
        """
        Gets the dbt_project.yml as dictionary.

        Raises:
            ProjectError: Error while handling dbt_project.yml

        Returns:
            Dict: the project as dictionary
        """
        if not self.__project:
            try:
                asyncio.get_running_loop()
                with ThreadPoolExecutor(1) as pool:
                    self.__project = pool.submit(lambda: asyncio.run(
                        Project.project_async(self.__project_dir)
                    )).result()
            except Exception:
                self.__project = asyncio.run(Project.project_async(self.__project_dir))
        return self.__project

    @property
    def packages(self) -> Dict[str, Any]:
        """
        Gets the packages.yml as dictionary.

        Raises:
            PackageError: Error while handling packages.yml

        Returns:
            Dict: the package as dictionary
        """
        if not self.__packages:
            try:
                asyncio.get_running_loop()
                with ThreadPoolExecutor(1) as pool:
                    self.__packages = pool.submit(lambda: asyncio.run(
                        Project.packages_async(self.__project_dir)
                    )).result()
            except Exception:
                self.__packages = asyncio.run(Project.packages_async(self.__project_dir))
        return self.__packages

    @classmethod
    async def project_async(
        cls,
        project_dir: Union[str, os.PathLike]
    ) -> Dict[str, Any]:
        """
        Gets the dbt_project.yml as dictionary.

        Raises:
            ProjectError: Error while handling dbt_project.yml

        Returns:
            Dict: the project as dictionary
        """
        project_full_path = Path(project_dir) / PROJECT_FILE_NAME
        if not project_full_path.exists():
            raise ProjectError(
                f'`{PROJECT_FILE_NAME}` in `{project_dir}` does not exist.'
            )
        try:
            async with aiofiles.open(project_full_path, mode='r') as f:
                content = await f.read()
                project = yaml.safe_load(content)
        except Exception as e:
            raise ProjectError(
                f'Failed to read `{PROJECT_FILE_NAME}` in `{project_dir}`: {e}'
            )
        return project

    @classmethod
    async def packages_async(
        cls,
        project_dir: Union[str, os.PathLike]
    ) -> Dict[str, Any]:
        """
        Gets the packages.yml as dictionary.

        Raises:
            PackageError: Error while handling packages.yml

        Returns:
            Dict: the package as dictionary
        """
        package_full_path = Path(project_dir) / PACKAGE_FILE_NAME
        if not package_full_path.exists():
            raise ProjectError(
                f'`{PACKAGE_FILE_NAME}` in `{project_dir}` does not exist.'
            )

        try:
            async with aiofiles.open(package_full_path, mode='r') as f:
                content = await f.read()
                packages = yaml.safe_load(content)
        except Exception as e:
            raise ProjectError(
                f'Failed to read `{PACKAGE_FILE_NAME}` in `{project_dir}`: {e}'
            )
        if not packages['packages']:
            packages['packages'] = []
        return packages

    @classmethod
    async def local_package_dirs_async(
        cls,
        project_dir: Union[str, os.PathLike]
    ) -> List[str]:
        packages = await cls.packages_async(project_dir)
        return [
            package.get('local')
            for package in packages.get('packages', [])
            if package.get('local')
        ]
