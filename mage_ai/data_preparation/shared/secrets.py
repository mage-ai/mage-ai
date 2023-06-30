import os
from typing import List

from cryptography.fernet import Fernet, InvalidToken

from mage_ai.settings.repo import get_data_dir, get_repo_path

DEFAULT_MAGE_SECRETS_DIR = 'secrets'


def get_secrets_dir():
    return os.path.join(
        get_data_dir(), DEFAULT_MAGE_SECRETS_DIR)


def create_secret(name: str, value: str):
    from mage_ai.orchestration.db.models.secrets import Secret
    secrets_dir = get_secrets_dir()
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
    secrets_dir = get_secrets_dir()
    key_file = os.path.join(secrets_dir, 'key')

    try:
        with open(key_file, 'r') as f:
            key = f.read()
    except Exception:
        key = None

    return key


def get_valid_secrets() -> List:
    from mage_ai.orchestration.db.models.secrets import Secret
    key = get_encryption_key()
    if not key:
        return []

    fernet = Fernet(key)

    secrets = Secret.query.filter(Secret.repo_name == get_repo_path())
    valid_secrets = []
    if secrets.count() > 0:
        for secret in secrets:
            try:
                fernet.decrypt(secret.value.encode('utf-8')).decode('utf-8')
                valid_secrets.append(secret)
            except InvalidToken:
                pass

    return valid_secrets


def get_secret_value(name: str, repo_name: str = None) -> str:
    from mage_ai.orchestration.db.models.secrets import Secret
    if repo_name is None:
        repo_name = get_repo_path()
    key = get_encryption_key()
    if key:
        fernet = Fernet(key)

        secret = None
        try:
            secret = Secret.query.filter(
                Secret.name == name,
                Secret.repo_name == repo_name,
            ).one_or_none()
        except Exception as err:
            print(f'WARNING: Could not find secret value for secret {name} with error: {str(err)}')

        if secret:
            return fernet.decrypt(secret.value.encode('utf-8')).decode('utf-8')


def delete_secret(name: str) -> None:
    from mage_ai.orchestration.db.models.secrets import Secret

    secret = None
    try:
        secret = Secret.query.filter(
            Secret.name == name,
            Secret.repo_name == get_repo_path(),
        ).one_or_none()
    except Exception as err:
        print(f'WARNING: Could not find secret {name} with error: {str(err)}')

    if secret:
        secret.delete()
