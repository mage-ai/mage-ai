from mage_ai.api.errors import ApiError
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.data_preparation.shared.secrets import (
    create_secret,
    get_valid_secrets_for_repo,
)
from mage_ai.data_preparation.sync import (
    GIT_ACCESS_TOKEN_SECRET_NAME,
    GIT_SSH_PRIVATE_KEY_SECRET_NAME,
    GIT_SSH_PUBLIC_KEY_SECRET_NAME,
    GitConfig,
)
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.secrets import Secret
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import extract

ALLOWED_PAYLOAD_KEYS = [
    'name',
    'value',
    'entity',
    'pipeline_uuid',
]


class SecretResource(DatabaseResource):
    model_class = Secret

    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        entity = query.get('entity', [Entity.GLOBAL])
        if entity:
            entity = entity[0]

        pipeline_uuid = query.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        secrets = get_valid_secrets_for_repo()
        return list(filter(
            lambda s: self._filter_secrets(s, user),
            secrets
        ))

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        return self(create_secret(
            **extract(payload, ALLOWED_PAYLOAD_KEYS),
            project_uuid=get_project_uuid(),
        ), user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        repo_path = get_repo_path()
        model = Secret.query.filter(Secret.repo_name == repo_path, Secret.name == pk).first()

        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(model, user, **kwargs)

    @classmethod
    def _filter_secrets(self, secret: Secret, user) -> bool:
        # Only include git secrets that were created by the current user.
        preferences = GitConfig(get_preferences(user=user).sync_config)
        whitelist_secrets = [
            preferences.ssh_private_key_secret_name,
            preferences.ssh_public_key_secret_name,
            preferences.access_token_secret_name,
        ]
        return not secret.name.startswith(GIT_SSH_PRIVATE_KEY_SECRET_NAME) \
            and not secret.name.startswith(GIT_SSH_PUBLIC_KEY_SECRET_NAME) \
            and not secret.name.startswith(GIT_ACCESS_TOKEN_SECRET_NAME) \
            or secret.name in whitelist_secrets
