import os

from mage_ai.settings import REQUIRE_USER_AUTHENTICATION
from mage_ai.settings.utils import base_repo_path

PLATFORM_SETTINGS_FILENAME = 'settings.yaml'
LOCAL_PLATFORM_SETTINGS_FILENAME = f'.{PLATFORM_SETTINGS_FILENAME}'


def platform_settings_full_path() -> str:
    return os.path.join(base_repo_path(), PLATFORM_SETTINGS_FILENAME)


def set_project_platform_activated_flag():
    global project_platform_activated_flag
    project_platform_activated_flag = os.path.exists(platform_settings_full_path())


# Set the activated flag upon server starts instead of repeatedly checking the os path
project_platform_activated_flag = False
set_project_platform_activated_flag()


def project_platform_activated() -> bool:
    return project_platform_activated_flag


def user_project_platform_activated() -> bool:
    return project_platform_activated_flag and REQUIRE_USER_AUTHENTICATION
