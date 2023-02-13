from mage_ai.data_preparation.repo_manager import get_repo_config
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
        repo_name = get_repo_config().repo_name
        secrets = (
            Secret.query.filter(Secret.repo_name == repo_name)
        )
        
        results = self.limit(secrets)
        collection = [secrets.to_dict() for s in results]

        self.write(dict(secrets=collection))

    @safe_db_query
    def post(self):
        payload = self.get_payload()

        model = Secret.create(
            **extract(payload, ALLOWED_PAYLOAD_KEYS),
        )
        self.write(dict(backfill=model.to_dict()))
