from mage_ai.settings.backends import (
    AWSSecretsManagerBackend,
    BackendType,
    SettingsBackend,
)
from mage_ai.settings.server import *  # noqa: F401, F403


class Settings():
    def __init__(self):
        self.settings_backend = SettingsBackend()

    def set_settings_backend(self, backend_type: str = None, **kwargs):
        """
        Factory function to create a settings backend of the specified type.

        Args:
            type (str): Type of the settings backend to create
            kwargs (Dict): Additional keyword arguments to pass to the settings backend constructor

        Returns:
            SettingsBackend: A settings backend instance of the specified type
        """
        if backend_type == BackendType.AWS_SECRETS_MANAGER:
            self.settings_backend = AWSSecretsManagerBackend(**kwargs)
        else:
            self.settings_backend = SettingsBackend(**kwargs)

    def get_value(self, key: str, default: str = None) -> str:
        """
        Get the value of an environment variable. Add Mage specific logic to handle fetching
        environment variables from other sources.

        Args:
            key (str): The name of the environment variable.
            default (str, optional): The default value to return if the environment variable is
                not set. Defaults to None.

        Returns:
            str: The value of the environment variable.
        """
        return self.settings_backend.get(key, default=default)


settings = Settings()


def get_settings_value(key: str, default: str = None) -> str:
    return settings.get_value(key, default=default)
