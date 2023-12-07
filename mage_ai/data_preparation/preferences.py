import os
import traceback
from typing import Dict

import yaml

from mage_ai.data_preparation.models.constants import PREFERENCES_FILE
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.settings import get_bool_value
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict

# Git environment variables
GIT_REPO_LINK_VAR = 'GIT_REPO_LINK'
GIT_REPO_PATH_VAR = 'GIT_REPO_PATH'
GIT_USERNAME_VAR = 'GIT_USERNAME'
GIT_EMAIL_VAR = 'GIT_EMAIL'
GIT_AUTH_TYPE_VAR = 'GIT_AUTH_TYPE'
GIT_BRANCH_VAR = 'GIT_BRANCH'
GIT_SYNC_ON_PIPELINE_RUN_VAR = 'GIT_SYNC_ON_PIPELINE_RUN'
GIT_SYNC_ON_START_VAR = 'GIT_SYNC_ON_START'
GIT_SYNC_ON_EXECUTOR_START_VAR = 'GIT_SYNC_ON_EXECUTOR_START'
GIT_SYNC_SUBMODULES = 'GIT_SYNC_SUBMODULES'

GIT_ENABLE_GIT_INTEGRATION_VAR = 'GIT_ENABLE_GIT_INTEGRATION'
GIT_OVERWRITE_WITH_PROJECT_SETTINGS_VAR = 'GIT_OVERWRITE_WITH_PROJECT_SETTINGS'


def get_bool_value_for_sync_config(value) -> bool:
    if value is None:
        return False

    if not isinstance(value, str):
        return bool(value)

    return get_bool_value(value)


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

        # Remove null or empty string values from the project_sync_config
        project_sync_config = {
            k: v
            for k, v in project_sync_config.items()
            if v is not None and (not isinstance(v, str) or v)
        }

        # Use the environment variable value if it exists. Otherwise, use
        # the value specified in the preferences file.
        self.sync_config = dict(
            remote_repo_link=os.getenv(
                GIT_REPO_LINK_VAR, project_sync_config.get('remote_repo_link')
            ),
            repo_path=os.getenv(
                GIT_REPO_PATH_VAR, project_sync_config.get('repo_path')
            ),
            auth_type=os.getenv(
                GIT_AUTH_TYPE_VAR, project_sync_config.get('auth_type')
            ),
            username=os.getenv(GIT_USERNAME_VAR, project_sync_config.get('username')),
            email=os.getenv(GIT_EMAIL_VAR, project_sync_config.get('email')),
            branch=os.getenv(GIT_BRANCH_VAR, project_sync_config.get('branch')),
            sync_on_pipeline_run=get_bool_value_for_sync_config(
                os.getenv(
                    GIT_SYNC_ON_PIPELINE_RUN_VAR,
                    project_sync_config.get('sync_on_pipeline_run'),
                )
            ),
            sync_on_start=get_bool_value_for_sync_config(
                os.getenv(
                    GIT_SYNC_ON_START_VAR, project_sync_config.get('sync_on_start')
                )
            ),
            sync_on_executor_start=get_bool_value_for_sync_config(
                os.getenv(
                    GIT_SYNC_ON_EXECUTOR_START_VAR,
                    project_sync_config.get('sync_on_executor_start'),
                )
            ),
            sync_submodules=get_bool_value_for_sync_config(
                os.getenv(
                    GIT_SYNC_SUBMODULES, project_sync_config.get('sync_submodules')
                )
            ),
            enable_git_integration=get_bool_value_for_sync_config(
                os.getenv(GIT_ENABLE_GIT_INTEGRATION_VAR)
            ),
        )

        if get_bool_value(os.getenv(GIT_OVERWRITE_WITH_PROJECT_SETTINGS_VAR, '0')):
            self.sync_config = merge_dict(self.sync_config, project_sync_config)

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
            return Preferences(user=user)
    else:
        return default_preferences
