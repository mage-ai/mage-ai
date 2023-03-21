from mage_ai.api.errors import ApiError
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.shared.secrets import (
    create_secret,
    get_valid_secrets,
)
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.secrets import Secret
from mage_ai.shared.hash import extract

ALLOWED_PAYLOAD_KEYS = [
    'name',
    'value',
]


class SecretResource(DatabaseResource):
    model_class = Secret

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        return get_valid_secrets()

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        return self(create_secret(**extract(payload, ALLOWED_PAYLOAD_KEYS)), user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        repo_path = get_repo_path()
        model = Secret.query.filter(Secret.repo_name == repo_path, Secret.name == pk).first()

        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(model, user, **kwargs)
