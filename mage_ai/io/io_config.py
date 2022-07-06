from typing import Any, Mapping
import pathlib
import os
import yaml


class IOConfig:
    """
    Wrapper around IO configuration file.
    """

    def __init__(self, filepath: os.PathLike) -> None:
        """
        Initializes IO Configuration loader

        Args:
            filepath (os.PathLike): Path to IO configuration file.
        """
        self.filepath = pathlib.Path(filepath)

    def use(self, profile: str = 'default') -> Mapping[str, Any]:
        """
        Specifies the profile to use. Profiles are sets of configuration settings.

        Args:
            profile (str, optional): Name of the profile to use. Defaults to 'default'.

        Returns:
            Mapping[str, Any]: Configuration settings for this profile
        """
        with self.filepath.open('r') as fin:
            config = yaml.full_load(fin)
        profile_settings = config.get(profile)
        if profile_settings is None:
            raise ValueError(f'Invalid config profile specified: \'{profile}\'')
        return profile_settings
