from typing import Dict
from mage_ai.data_preparation.models.constants import PREFERENCES_FILE
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db.models.oauth import User
import os
import traceback
import yaml

# Git environment variables
GIT_REPO_LINK_VAR = 'GIT_REPO_LINK'
GIT_REPO_PATH_VAR = 'GIT_REPO_PATH'
GIT_USERNAME_VAR = 'GIT_USERNAME'
GIT_EMAIL_VAR = 'GIT_EMAIL'
GIT_AUTH_TYPE_VAR = 'GIT_AUTH_TYPE'
GIT_BRANCH_VAR = 'GIT_BRANCH'
GIT_SYNC_ON_PIPELINE_RUN_TYPE = 'GIT_SYNC_ON_PIPELINE_RUN'


class Preferences:
    def __init__(
        self,
        repo_path: str = None,
        config_dict: Dict = None,
        user: User = None,
    ):
        self.repo_path = repo_path or get_repo_path()
        self.preferences_file_path = \
            os.path.join(self.repo_path, PREFERENCES_FILE)
        self.user = user
        preferences = dict()
        try:
            if user:
                preferences = user.preferences or {}
            elif config_dict:
                preferences = config_dict
            elif os.path.exists(self.preferences_file_path):
                with open(self.preferences_file_path) as f:
                    preferences = yaml.full_load(f.read()) or {}
        except Exception:
            traceback.print_exc()
            pass

        if os.getenv(GIT_REPO_LINK_VAR):
            self.sync_config = dict(
                remote_repo_link=os.getenv(GIT_REPO_LINK_VAR),
                repo_path=os.getenv(GIT_REPO_PATH_VAR, os.getcwd()),
                auth_type=os.getenv(GIT_AUTH_TYPE_VAR),
                username=os.getenv(GIT_USERNAME_VAR),
                email=os.getenv(GIT_EMAIL_VAR),
                branch=os.getenv(GIT_BRANCH_VAR),
                sync_on_pipeline_run=bool(int(os.getenv(GIT_SYNC_ON_PIPELINE_RUN_TYPE) or 0)),
            )
        else:
            self.sync_config = preferences.get('sync_config', dict())

    def has_valid_git_config(self) -> bool:
        return 'remote_repo_link' in self.sync_config and 'repo_path' in self.sync_config

    def update_preferences(self, updates: Dict):
        preferences = self.to_dict()
        preferences.update(updates)
        if self.user:
            self.user.update(preferences=preferences)
        else:
            with open(self.preferences_file_path, 'w') as f:
                yaml.dump(preferences, f)

    def to_dict(self) -> Dict:
        return dict(
            sync_config=self.sync_config,
        )


def get_preferences(repo_path=None, user: User = None) -> Preferences:
    default_preferences = Preferences(repo_path=repo_path)
    if user:
        if user.preferences is None \
                and os.path.exists(default_preferences.preferences_file_path):
            return default_preferences
        else:
            return Preferences(user=user)
    else:
        return default_preferences
