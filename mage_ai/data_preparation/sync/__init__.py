from dataclasses import dataclass
from enum import Enum
from mage_ai.shared.config import BaseConfig
import os

GIT_ACCESS_TOKEN_SECRET_NAME = 'mage_git_access_token'
GIT_SSH_PRIVATE_KEY_SECRET_NAME = 'mage_git_ssh_private_key_b64'
GIT_SSH_PUBLIC_KEY_SECRET_NAME = 'mage_git_ssh_public_key_b64'


class AuthType(str, Enum):
    SSH = 'ssh'
    HTTPS = 'https'


@dataclass
class GitConfig(BaseConfig):
    remote_repo_link: str
    repo_path: str = os.getcwd()
    username: str = ''
    email: str = ''
    branch: str = 'main'
    sync_on_pipeline_run: bool = False
    ssh_private_key_secret_name: str = GIT_SSH_PRIVATE_KEY_SECRET_NAME
    ssh_public_key_secret_name: str = GIT_SSH_PUBLIC_KEY_SECRET_NAME
    auth_type: AuthType = AuthType.SSH
    access_token_secret_name: str = GIT_ACCESS_TOKEN_SECRET_NAME
    # This is not necessary anymore, but leaving it for backwards compatibility
    type: str = 'git'
