from mage_ai.data_preparation.shared.secrets import (
    create_secret,
    get_repo_path,
)
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import Secret
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.hash import extract

ALLOWED_PAYLOAD_KEYS = [
    'name',
    'value',
]


class ApiSecretsListHandler(BaseHandler):
    model_class = Secret

    @safe_db_query
    def get(self):
        repo_path = get_repo_path()
        secrets = (
            Secret.query.filter(Secret.repo_name == repo_path)
        )

        results = self.limit(secrets)
        collection = [s.to_dict() for s in results]

        self.write(dict(secrets=collection))

    @safe_db_query
    def post(self):
        payload = self.get_payload()

        model = create_secret(
            **extract(payload, ALLOWED_PAYLOAD_KEYS),
        )
        self.write(dict(backfill=model.to_dict()))


class ApiSecretsDetailHandler(BaseHandler):
    model_class = Secret

    @safe_db_query
    def delete(self, name):
        repo_path = get_repo_path()
        secrets = Secret.query.filter(
            Secret.repo_name == repo_path, Secret.name == name)

        if secrets.count() > 0:
            secret = secrets[0]
            secret.delete()

            self.write_model(secret)
        else:
            self.write(dict(secret={}))
