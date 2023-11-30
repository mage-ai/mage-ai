import inspect
import os
from dataclasses import dataclass
from enum import Enum

from mage_ai.shared.config import BaseConfig

GIT_ACCESS_TOKEN_SECRET_NAME = 'mage_git_access_token'
GIT_SSH_PRIVATE_KEY_SECRET_NAME = 'mage_git_ssh_private_key_b64'
GIT_SSH_PUBLIC_KEY_SECRET_NAME = 'mage_git_ssh_public_key_b64'


class AuthType(str, Enum):
    SSH = 'ssh'
    HTTPS = 'https'
    OAUTH = 'oauth'


@dataclass
class GitConfig(BaseConfig):
    remote_repo_link: str = None
    repo_path: str = os.getcwd()
    branch: str = 'main'
    sync_on_pipeline_run: bool = False
    sync_on_start: bool = False
    sync_on_executor_start: bool = False
    sync_submodules: bool = False
    auth_type: AuthType = None
    # User settings moved to UserGitConfig, these will be used for Git syncs
    username: str = ''
    email: str = ''
    ssh_private_key_secret_name: str = GIT_SSH_PRIVATE_KEY_SECRET_NAME
    ssh_public_key_secret_name: str = GIT_SSH_PUBLIC_KEY_SECRET_NAME
    access_token_secret_name: str = GIT_ACCESS_TOKEN_SECRET_NAME
    # Force Mage to show git integration panel in the UI
    enable_git_integration: bool = False
    # This is not necessary anymore, but leaving it for backwards compatibility
    type: str = 'git'


@dataclass
class UserGitConfig(BaseConfig):
    username: str = ''
    email: str = ''
    ssh_private_key_secret_name: str = GIT_SSH_PRIVATE_KEY_SECRET_NAME
    ssh_public_key_secret_name: str = GIT_SSH_PUBLIC_KEY_SECRET_NAME
    access_token_secret_name: str = GIT_ACCESS_TOKEN_SECRET_NAME

    @classmethod
    def from_dict(cls, config):
        return cls(**{
            k: v for k, v in config.items()
            if k in inspect.signature(cls).parameters
        })
