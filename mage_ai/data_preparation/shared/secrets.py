import os
import uuid
from typing import List, Tuple, Union

from cryptography.fernet import Fernet, InvalidToken

from mage_ai.orchestration.constants import Entity
from mage_ai.settings.repo import get_data_dir, get_repo_path

DEFAULT_MAGE_SECRETS_DIR = 'secrets'


def get_secrets_dir(
    entity: Entity,
    project_uuid: str = None,
    pipeline_uuid: str = None,
) -> str:
    secrets_dir = os.path.abspath(os.path.join(get_data_dir(), DEFAULT_MAGE_SECRETS_DIR))

    if entity == Entity.GLOBAL:
        return secrets_dir
    elif entity == Entity.PROJECT:
        return os.path.join(secrets_dir, project_uuid)
    elif entity == Entity.PIPELINE:
        return os.path.join(secrets_dir, project_uuid, pipeline_uuid)

    return secrets_dir


def get_secret_path(
    entity: Entity,
    project_uuid: str = None,
    pipeline_uuid: str = None,
) -> Union[None, str]:
    if entity == Entity.GLOBAL:
        return None
    elif entity == Entity.PROJECT:
        return project_uuid
    elif entity == Entity.PIPELINE:
        return os.path.join(project_uuid, pipeline_uuid)


def create_secret(
    name: str,
    value: str,
    entity: Entity = Entity.GLOBAL,
    project_uuid: str = None,
    pipeline_uuid: str = None,
):
    from mage_ai.orchestration.db.models.secrets import Secret
    missing_values = []
    if entity in [Entity.PROJECT, Entity.PIPELINE] and not project_uuid:
        missing_values.append('project_uuid')

    if entity == Entity.PIPELINE and not pipeline_uuid:
        missing_values.append('pipeline_uuid')

    if missing_values:
        raise Exception(
            'Missing values for creating secret: {}.'.format(', '.join(missing_values)))

    secrets_dir = get_secrets_dir(
        entity,
        project_uuid=project_uuid,
        pipeline_uuid=pipeline_uuid,
    )
    key, key_uuid = _create_key_files(secrets_dir)

    fernet = Fernet(key)
    encrypted_value = fernet.encrypt(value.encode('utf-8')).decode('utf-8')
    kwargs = {
        'name': name,
        'uuid': key_uuid,
        'value': encrypted_value,
        'repo_name': get_repo_path(),
    }

    secret = Secret(**kwargs)
    secret.save()
    return secret


def get_valid_secrets(
    entity: Entity = Entity.GLOBAL,
    pipeline_uuid: str = None,
    project_uuid: str = None,
) -> List:
    from mage_ai.orchestration.db.models.secrets import Secret
    key, _ = _get_encryption_key(
        entity,
        project_uuid=project_uuid,
        pipeline_uuid=pipeline_uuid,
    )
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


def get_secret_value(
    name: str,
    entity: Entity = Entity.GLOBAL,
    pipeline_uuid: str = None,
    project_uuid: str = None,
    repo_name: str = None,
) -> str:
    from mage_ai.orchestration.db.models.secrets import Secret
    key, key_uuid = _get_encryption_key(
        entity,
        project_uuid=project_uuid,
        pipeline_uuid=pipeline_uuid,
    )
    secret = None
    if key:
        # For backwards compatibility, check if there is a secret with the name and no uuid
        if entity == Entity.GLOBAL:
            if repo_name is None:
                repo_name = get_repo_path()
            secret = Secret.query.filter(
                Secret.name == name,
                Secret.repo_name == repo_name,
                Secret.uuid.is_(None),
            ).one_or_none()

        if key_uuid and not secret:
            secret = Secret.query.filter(
                Secret.name == name,
                Secret.uuid == key_uuid,
            ).one_or_none()

        if secret:
            try:
                fernet = Fernet(key)
                return fernet.decrypt(secret.value.encode('utf-8')).decode('utf-8')
            except InvalidToken:
                print(f'WARNING: Could not find secret value for secret {name}.')
        else:
            print(f'WARNING: Could not find secret value for secret {name}.')


def delete_secret(
    name: str,
    entity: Entity = Entity.GLOBAL,
    pipeline_uuid: str = None,
    project_uuid: str = None,
) -> None:
    from mage_ai.orchestration.db.models.secrets import Secret

    secret = Secret.query.filter(
        Secret.name == name,
        Secret.repo_name == get_repo_path(),
        Secret.uuid.is_(None),
    ).one_or_none()

    if not secret:
        _, key_uuid = _get_encryption_key(
            entity,
            project_uuid=project_uuid,
            pipeline_uuid=pipeline_uuid,
        )
        if key_uuid:
            secret = Secret.query.filter(
                Secret.name == name,
                Secret.uuid == key_uuid,
            ).one_or_none()

    if secret:
        secret.delete()
    else:
        print(f'WARNING: Could not find secret {name}')


def _create_key_files(secrets_dir: str) -> Tuple[str, str]:
    key_file = os.path.join(secrets_dir, 'key')
    uuid_file = os.path.join(secrets_dir, 'uuid')

    if not os.path.exists(secrets_dir):
        os.makedirs(secrets_dir)

    if os.path.exists(key_file):
        with open(key_file, 'r', encoding='utf-8') as f:
            key = f.read()
    else:
        key = Fernet.generate_key().decode('utf-8')
        with open(key_file, 'w', encoding='utf-8') as f:
            f.write(key)

    if os.path.exists(uuid_file):
        with open(uuid_file, 'r', encoding='utf-8') as f:
            key_uuid = f.read()
    else:
        key_uuid = uuid.uuid4().hex
        with open(uuid_file, 'w', encoding='utf-8') as f:
            f.write(key_uuid)

    return key, key_uuid


def _get_encryption_key(
    entity: Entity,
    project_uuid: str = None,
    pipeline_uuid: str = None,
) -> Tuple[str, str]:
    secrets_dir = get_secrets_dir(
        entity,
        pipeline_uuid=pipeline_uuid,
        project_uuid=project_uuid,
    )
    key_file = os.path.join(secrets_dir, 'key')
    uuid_file = os.path.join(secrets_dir, 'uuid')

    try:
        with open(key_file, 'r', encoding='utf-8') as f:
            key = f.read()
    except Exception:
        key = None

    try:
        with open(uuid_file, 'r', encoding='utf-8') as f:
            key_uuid = f.read()
    except Exception:
        key_uuid = None

    return key, key_uuid
