from cryptography.fernet import Fernet
from mage_ai.data_preparation.repo_manager import (
    get_data_dir,
    get_repo_path
)
from typing import Dict
import os

DEFAULT_MAGE_SECRETS_DIR = 'secrets'


def create_secret(name: str, value: str):
    from mage_ai.orchestration.db.models import Secret
    secrets_dir = os.path.join(
        get_data_dir(), DEFAULT_MAGE_SECRETS_DIR)
    key_file = os.path.join(secrets_dir, 'key')

    if os.path.exists(key_file):
        with open(key_file, 'r') as f:
            key = f.read()
    else:
        key = Fernet.generate_key().decode('utf-8')
        if not os.path.exists(secrets_dir):
            os.makedirs(secrets_dir)
        with open(key_file, 'w') as f:
            f.write(key)

    fernet = Fernet(key)
    encrypted_value = fernet.encrypt(value.encode('utf-8'))
    kwargs = {
        'name': name,
        'value': encrypted_value.decode('utf-8'),
        'repo_name': get_repo_path(),
    }

    secret = Secret(**kwargs)
    secret.save()
    return secret


def get_encryption_key() -> str:
    secrets_dir = os.path.join(
        get_data_dir(), DEFAULT_MAGE_SECRETS_DIR)
    key_file = os.path.join(secrets_dir, 'key')
    with open(key_file, 'r') as f:
        key = f.read()

    return key


def get_secrets() -> Dict[str, str]:
    from mage_ai.orchestration.db.models import Secret
    fernet = Fernet(get_encryption_key())

    secrets = Secret.query.filter(Secret.repo_name == get_repo_path())
    secret_obj = {}
    if secrets.count() > 0:
        for secret in secrets:
            secret_obj[secret.name] = \
                fernet.decrypt(secret.value.encode('utf-8')).decode('utf-8')

    return secret_obj


def get_secret_value(name: str) -> str:
    from mage_ai.orchestration.db.models import Secret
    fernet = Fernet(get_encryption_key())

    secret = Secret.query.filter(Secret.name == name).one_or_none()
    if secret:
        return fernet.decrypt(secret.value.encode('utf-8')).decode('utf-8')
