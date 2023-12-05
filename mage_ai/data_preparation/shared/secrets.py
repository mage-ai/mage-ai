import os
import shutil
import uuid
from typing import List, Optional, Tuple

from cryptography.fernet import Fernet, InvalidToken

from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import safe_db_query
from mage_ai.settings.repo import get_data_dir, get_repo_path

DEFAULT_MAGE_SECRETS_DIR = 'secrets'


def get_secrets_dir(
    entity: Entity,
    project_uuid: str = None,
    pipeline_uuid: str = None,
) -> str:
    """
    Returns the path of the directory to store the secret encryption key and key uuid based
    on the entity type.

    Args:
        entity (Entity): Entity for the secret (global, project, pipeline)
        project_uuid (str): Project uuid, required if entity is project or pipeline
        pipeline_uuid (str): Pipeline uuid, required if entity is pipeline

    Returns:
        str: /path/to/secrets/directory
    """
    secrets_dir = os.path.join(get_data_dir(), DEFAULT_MAGE_SECRETS_DIR)
    # Use expanduser path if the secrets dir hasn't been created yet
    if not os.path.exists(secrets_dir):
        secrets_dir = os.path.expanduser(secrets_dir)

    secrets_dir = os.path.abspath(secrets_dir)

    if entity == Entity.GLOBAL:
        return secrets_dir
    elif entity == Entity.PROJECT:
        return os.path.join(secrets_dir, 'projects', project_uuid)
    elif entity == Entity.PIPELINE:
        return os.path.join(
            secrets_dir,
            'projects',
            project_uuid,
            'pipelines',
            pipeline_uuid,
        )

    return secrets_dir


def rename_pipeline_secrets_dir(
    project_uuid: str,
    old_pipeline_uuid: str,
    new_pipeline_uuid: str,
):
    secrets_dir = get_secrets_dir(
        Entity.PIPELINE,
        project_uuid,
        old_pipeline_uuid,
    )
    if os.path.exists(secrets_dir):
        shutil.move(
            secrets_dir,
            get_secrets_dir(
                Entity.PIPELINE,
                project_uuid,
                new_pipeline_uuid,
            )
        )


def delete_secrets_dir(
    entity: Entity,
    project_uuid: str = None,
    pipeline_uuid: str = None,
):
    secrets_dir = get_secrets_dir(entity, project_uuid, pipeline_uuid)
    if os.path.exists(secrets_dir):
        shutil.rmtree(secrets_dir)


@safe_db_query
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
        'value': encrypted_value,
        'key_uuid': key_uuid,
        'repo_name': get_repo_path(),
    }

    secret = Secret(**kwargs)
    secret.save()
    return secret


def get_valid_secrets_for_repo() -> List:
    """
    This method still only returns secrets for the current repo. This will need to be
    updated in the future to return secrets based on the parameters passed in.
    """
    from mage_ai.orchestration.db.models.secrets import Secret
    key, _ = _get_encryption_key(entity=Entity.GLOBAL)
    if not key:
        return []

    fernet = Fernet(key)

    secrets = Secret.query.filter(Secret.repo_name == get_repo_path())
    valid_secrets = []
    if secrets.count() > 0:
        for secret in secrets:
            try:
                if secret:
                    fernet.decrypt(secret.value.encode('utf-8')).decode('utf-8')
                    valid_secrets.append(secret)
            except InvalidToken:
                pass

    return valid_secrets


@safe_db_query
def get_secret_value(
    name: str,
    entity: Entity = Entity.GLOBAL,
    pipeline_uuid: str = None,
    project_uuid: str = None,
    repo_name: str = None,
    **kwargs,
) -> Optional[str]:
    from mage_ai.orchestration.db.models.secrets import Secret
    key, key_uuid = _get_encryption_key(
        entity,
        project_uuid=project_uuid,
        pipeline_uuid=pipeline_uuid,
    )
    secret = None
    if key:
        fernet = Fernet(key)
        if key_uuid:
            secret = Secret.get_secret(name, key_uuid)

        if secret:
            try:
                return fernet.decrypt(secret.value.encode('utf-8')).decode('utf-8')
            except InvalidToken:
                pass

        # For backwards compatibility, check if there is a secret with the name and no uuid
        if entity == Entity.GLOBAL:
            if repo_name is None:
                repo_name = get_repo_path()
            secret_legacy = Secret.query.filter(
                Secret.name == name,
                Secret.repo_name == repo_name,
                Secret.key_uuid.is_(None),
            ).one_or_none()

            if secret_legacy:
                try:
                    return fernet.decrypt(secret_legacy.value.encode('utf-8')).decode('utf-8')
                except InvalidToken:
                    pass
    if not kwargs.get('suppress_warning', False):
        print(f'WARNING: Could not find secret value for secret {name}.')


def get_secret_value_db_safe(name: str, **kwargs) -> Optional[str]:
    """
    Calls get_secret_value only if the db has already been initialized.
    """
    from mage_ai.orchestration.db import db_connection
    if db_connection.session and db_connection.session.is_active:
        return get_secret_value(name, **kwargs)
    else:
        return None


@safe_db_query
def delete_secret(
    name: str,
    entity: Entity = Entity.GLOBAL,
    pipeline_uuid: str = None,
    project_uuid: str = None,
    **kwargs,
) -> None:
    from mage_ai.orchestration.db.models.secrets import Secret
    secret = None
    _, key_uuid = _get_encryption_key(
        entity,
        project_uuid=project_uuid,
        pipeline_uuid=pipeline_uuid,
    )
    if key_uuid:
        secret = Secret.get_secret(name, key_uuid)

    if entity == Entity.GLOBAL and not secret:
        secret = Secret.query.filter(
            Secret.name == name,
            Secret.repo_name == get_repo_path(),
            Secret.key_uuid.is_(None),
        ).one_or_none()

    if secret:
        secret.delete()
    elif not kwargs.get('suppress_warning', False):
        print(f'WARNING: Could not find secret {name}')


def _create_key_files(secrets_dir: str) -> Tuple[str, str]:
    """
    Creates key files in the secrets_dir directory if they do not exist. Returns the key
    and key_uuid values.

    Args:
        secrets_dir: The directory to create the key files in.

    Returns:
        Tuple[str, str]: A tuple with the key and key_uuid values.
    """
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

    if key is not None:
        key = key.strip()

    return key, key_uuid
