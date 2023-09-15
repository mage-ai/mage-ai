import asyncio
import os
import shutil
import uuid
import warnings
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, Optional, Union

import aiofiles
import yaml
from jinja2 import Template

from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.errors.base import MageBaseException

PROFILES_FILE_NAME = 'profiles.yml'


class ProfilesError(MageBaseException):
    """
    Error while handling profiles.yml
    """
    pass


class Profiles(object):
    """
    Interface for dbt profiles.yml
    - Interpolate Mage variables
    - Provide profiles.yml as dictionary
    """

    def __init__(
        self,
        profiles_dir: Union[str, os.PathLike],
        variables: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Interface with a dbt profiles.yml for reading and interpolating it.

        Args:
            profiles_dir (Union[str, os.PathLike]):
                path of the profile dir of the original profiles.yml
            variables (Optional[Dict[str, Any]], optional):
                variables for interpolating the profiles.yml. Defaults to None.
        """
        self.__raw_profiles_dir: Union[str, os.PathLike] = profiles_dir
        self.__interpolated_profiles_dir: Optional[Union[str, os.PathLike]] = None
        self.__variables: Optional[Dict[str, Any]] = variables
        self.__profiles: Optional[Dict[str, Any]] = None
        self.is_interpolated: bool = False

    def clean(self) -> None:
        """
        Cleans up the temporary dir of the interpolated profiles.yml

        Raises:
            ProfilesError: Error while handling profiles.yml
        """
        if self.is_interpolated:
            if not Path(self.__interpolated_profiles_dir).exists():
                warnings.warn(
                    f'Nothing to clean up. Path `{self.__interpolated_profiles_dir}`' +
                    ' does not exist.',
                    stacklevel=2
                )
            else:
                try:
                    shutil.rmtree(self.__interpolated_profiles_dir)
                except Exception as e:
                    raise ProfilesError(
                        f'Failed to remove `{self.__interpolated_profiles_dir}`: {e}'
                    )
            self.__interpolated_profiles_dir = None
            self.is_interpolated = False

    def interpolate(self) -> Union[str, os.PathLike]:
        """
        Generates a interpolated profiles.yml in a temporary directory

        Raises:
            ProfilesError: Error while handling profiles.yml

        Returns:
            Union[str, os.PathLike]: the profiles_dir of the interpolated profiles.yml
        """
        # create dir for temporary interpolated profiles.yml
        interpolated_profiles_dir = (
            Path(self.__raw_profiles_dir) /
            '.mage_temp_profiles' /
            str(uuid.uuid4())
        )
        try:
            interpolated_profiles_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise ProfilesError(
                f'Failed to create temporary dir `{interpolated_profiles_dir}`' +
                f' for interpolated `{PROFILES_FILE_NAME}`: {e}'
            )

        # write interpolated profiles.yml
        interpoalted_profiles_full_path = interpolated_profiles_dir / PROFILES_FILE_NAME
        try:
            with interpoalted_profiles_full_path.open('w') as f:
                yaml.safe_dump(self.profiles, f)
        except Exception as e:
            raise ProfilesError(
                f'Failed to write interpolated `{PROFILES_FILE_NAME}`' +
                f' to `{interpolated_profiles_dir}`: {e}'
            )

        self.__interpolated_profiles_dir = str(interpolated_profiles_dir)
        self.is_interpolated = True
        return self.__interpolated_profiles_dir

    @property
    def profiles_dir(self) -> Union[str, os.PathLike]:
        """
        Returns the path of the profile.
        If not interpolated then raw profile, else interpolated profile

        Returns:
            Path: profiles_dir to be used with dbt
        """
        return self.__interpolated_profiles_dir if self.is_interpolated else self.__raw_profiles_dir

    @property
    def profiles(self) -> Dict[str, Any]:
        """
        Gets the interpolated profiles.yml as dictionary.

        Raises:
            ProfilesError: Error while handling profiles.yml

        Returns:
            Dict: interpolated profiles.yml as dictionary
        """
        if not self.__profiles:
            try:
                asyncio.get_running_loop()
                with ThreadPoolExecutor(1) as pool:
                    self.__profiles = pool.submit(lambda: asyncio.run(
                        Profiles.profiles_async(self.profiles_dir, self.__variables)
                    )).result()
            except Exception:
                self.__profiles = asyncio.run(
                    Profiles.profiles_async(self.profiles_dir, self.__variables)
                )
        return self.__profiles

    def __del__(self) -> None:
        self.clean()

    def __enter__(self) -> 'Profiles':
        self.interpolate()
        return self

    def __exit__(self, *args) -> None:
        self.clean()

    @classmethod
    async def profiles_async(
        cls,
        profiles_dir: Union[str, os.PathLike],
        variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Gets the interpolated profiles.yml as dictionary.

        Raises:
            ProfilesError: Error while handling profiles.yml

        Returns:
            Dict: interpolated profiles.yml as dictionary
        """
        raw_profiles_full_path = Path(profiles_dir) / PROFILES_FILE_NAME
        if not raw_profiles_full_path.exists():
            raise ProfilesError(
                f'`{PROFILES_FILE_NAME}` in `{profiles_dir}` does not exist.'
            )
        try:
            async with aiofiles.open(raw_profiles_full_path, mode='r') as f:
                content = await f.read()
                profiles = Template(content).render(
                    variables=lambda x: variables.get(x) if variables else None,
                    **get_template_vars(),
                )
                interpolated_profiles = yaml.safe_load(profiles)
        except Exception as e:
            raise ProfilesError(
                f'Failed to read `{PROFILES_FILE_NAME}` in `{profiles_dir}`: {e}'
            )
        return interpolated_profiles
