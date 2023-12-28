import os

from mage_ai.settings import ENABLE_PROJECT_PLATFORM
from mage_ai.settings.utils import base_repo_path

PLATFORM_SETTINGS_FILENAME = 'settings.yaml'
LOCAL_PLATFORM_SETTINGS_FILENAME = f'.{PLATFORM_SETTINGS_FILENAME}'


def project_platform_activated() -> bool:
    return ENABLE_PROJECT_PLATFORM and os.path.exists(__platform_settings_full_path())


def __platform_settings_full_path() -> str:
    return os.path.join(base_repo_path(), PLATFORM_SETTINGS_FILENAME)
