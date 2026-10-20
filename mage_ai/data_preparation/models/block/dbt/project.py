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

    @property
    def local_packages(
        self
    ) -> List[str]:
        """
        Returns the local packages inside the project_dir

        Args:
            project_dir (Union[str, os.PathLike]): dbt project which has local packages inside

        Returns:
            List[str]: dir names of local packages
        """
        if self.__project_dir:
            return [file.parent.stem for file in Path(self.__project_dir).glob('*/dbt_project.yml')]

    @property
    def project(self) -> Dict[str, Any]:
        """
        Gets the dbt_project.yml as dictionary.
        The dictionary uses this schema:
        https://github.com/dbt-labs/dbt-jsonschema/blob/main/schemas/dbt_project.json

        This is a wrapper for the __project_async function.
        This is needed, as sometimes Project is initiated in an event loop and the io operation
        should be called async. If its not caleld inside an event loop, then it just wraps the
        methods inside async.run

        Returns:
            Dict: the project as dictionary
        """
        if not self.__project:
            try:
                asyncio.get_running_loop()
                with ThreadPoolExecutor(1) as pool:
                    self.__project = pool.submit(lambda: asyncio.run(
                        self.__project_async()
                    )).result()
            except Exception:
                self.__project = asyncio.run(self.__project_async())
        return self.__project

    async def __project_async(
        self,
    ) -> Dict[str, Any]:
        """
        Gets the dbt_project.yml as dictionary.

        Raises:
            ProjectError: Error while handling dbt_project.yml

        Returns:
            Dict: the project as dictionary
        """
        if not self.__project_dir:
            return

        project_full_path = Path(self.__project_dir) / PROJECT_FILE_NAME
        if not project_full_path.exists():
            raise FileNotFoundError(
                f'`{PROJECT_FILE_NAME}` in `{self.__project_dir}` does not exist.'
            )
        try:
            async with aiofiles.open(project_full_path, mode='r') as f:
                content = await f.read()
                project = yaml.safe_load(content)
        except Exception as e:
            raise ProjectError(
                f'Failed to read `{PROJECT_FILE_NAME}` in `{self.__project_dir}`: {e}'
            )
        return project
