import os
import traceback
from typing import Dict

import yaml

from mage_ai.data_preparation.models.constants import PREFERENCES_FILE
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.settings import get_bool_value, get_settings_value
from mage_ai.settings.keys import (
    GIT_AUTH_TYPE,
    GIT_BRANCH,
    GIT_EMAIL,
    GIT_ENABLE_GIT_INTEGRATION,
    GIT_OVERWRITE_WITH_PROJECT_SETTINGS,
    GIT_REPO_LINK,
    GIT_REPO_PATH,
    GIT_SYNC_ON_EXECUTOR_START,
    GIT_SYNC_ON_PIPELINE_RUN,
    GIT_SYNC_ON_START,
    GIT_SYNC_SUBMODULES,
    GIT_USERNAME,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict

ENV_VAR_TO_CONFIG_KEY = {
    GIT_REPO_LINK: 'remote_repo_link',
    GIT_REPO_PATH: 'repo_path',
    GIT_USERNAME: 'username',
    GIT_EMAIL: 'email',
    GIT_AUTH_TYPE: 'auth_type',
    GIT_BRANCH: 'branch',
    GIT_SYNC_ON_PIPELINE_RUN: 'sync_on_pipeline_run',
    GIT_SYNC_ON_START: 'sync_on_start',
    GIT_SYNC_ON_EXECUTOR_START: 'sync_on_executor_start',
    GIT_SYNC_SUBMODULES: 'sync_submodules',
}

BOOLEAN_ENV_VARS = set(
    [
        GIT_SYNC_ON_PIPELINE_RUN,
        GIT_SYNC_ON_START,
        GIT_SYNC_ON_EXECUTOR_START,
        GIT_SYNC_SUBMODULES,
        GIT_ENABLE_GIT_INTEGRATION,
    ]
)


def get_value_for_sync_config(env_var, value) -> bool:
    return get_bool_value(value) if env_var in BOOLEAN_ENV_VARS else value


def build_sync_config(project_sync_config: Dict) -> Dict:
    """
    Build the final sync_config from the saved project sync config and the environment variables.
    The git setting values from the environment variables will take precedence unless the
    GIT_OVERWRITE_WITH_PROJECT_SETTINGS environment variable is set to true.
    """

    # Remove null or empty string values from the project_sync_config
    project_sync_config = {
        k: v
        for k, v in project_sync_config.items()
        if v is not None and (not isinstance(v, str) or v)
    }

    # Read settings from settings backend
    config_from_settings = {
        k: get_settings_value(k)
        for k in ENV_VAR_TO_CONFIG_KEY.keys()
    }

    if any([v is not None for v in config_from_settings.values()]):
        # Map sync config keys to settings values
        sync_config = {
            v: get_value_for_sync_config(k, config_from_settings.get(k))
            for k, v in ENV_VAR_TO_CONFIG_KEY.items()
        }

        # If the GIT_OVERWRITE_WITH_PROJECT_SETTINGS environment variable is set to true,
        # overwrite the sync_config with the config from the project preferences file.
        if get_bool_value(get_settings_value(GIT_OVERWRITE_WITH_PROJECT_SETTINGS)):
            sync_config = merge_dict(sync_config, project_sync_config)
    else:
        sync_config = project_sync_config

    # Set the enable_git_integration field from environment variables
    enable_git_integration = get_settings_value(GIT_ENABLE_GIT_INTEGRATION)
    if enable_git_integration is not None:
        sync_config['enable_git_integration'] = get_bool_value(enable_git_integration)

    return sync_config


class Preferences:
    def __init__(
        self,
        repo_path: str = None,
        config_dict: Dict = None,
        user: User = None,
    ):
        self.repo_path = repo_path or get_repo_path()
        self.preferences_file_path = os.path.join(self.repo_path, PREFERENCES_FILE)
        self.user = user
        project_preferences = dict()
        try:
            if user and user.preferences and user.git_settings is None:
                project_preferences = user.preferences
            elif config_dict:
                project_preferences = config_dict
            elif os.path.exists(self.preferences_file_path):
                with open(self.preferences_file_path) as f:
                    project_preferences = yaml.full_load(f.read()) or {}
        except Exception:
            traceback.print_exc()
            pass

        # Git settings
        project_sync_config = project_preferences.get('sync_config', dict())
        if user:
            user_git_settings = user.git_settings or {}
            project_sync_config = merge_dict(project_sync_config, user_git_settings)

        self.sync_config = build_sync_config(project_sync_config)

        if isinstance(self.sync_config.get('auth_type'), str):
            self.sync_config['auth_type'] = self.sync_config['auth_type'].lower()

    def is_git_integration_enabled(self) -> bool:
        return (
            self.sync_config.get('remote_repo_link')
            and self.sync_config.get('repo_path')
            and self.sync_config.get('username')
            and self.sync_config.get('email')
            and self.sync_config.get('branch') is None
            or self.sync_config.get('enable_git_integration')
        )

    def update_preferences(self, updates: Dict):
        preferences = self.to_dict()
        preferences.update(updates)
        with open(self.preferences_file_path, 'w') as f:
            yaml.dump(preferences, f)

    def to_dict(self) -> Dict:
        return dict(
            sync_config=self.sync_config,
        )


def get_preferences(repo_path=None, user: User = None) -> Preferences:
    default_preferences = Preferences(repo_path=repo_path)
    if user:
        if user.preferences is None and os.path.exists(
            default_preferences.preferences_file_path
        ):
            return default_preferences
        else:
            return Preferences(user=user, repo_path=repo_path)
    else:
        return default_preferences
