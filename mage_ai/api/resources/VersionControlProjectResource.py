import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.hash import ignore_keys
from mage_ai.version_control.models import Project


class VersionControlProjectResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        return self.build_result_set(
            Project.load_all(),
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs):
        project = Project.create(payload['uuid'])
        return self(project, user, **kwargs)

    @classmethod
    def get_model(self, pk, **kwargs):
        model = Project.load(uuid=urllib.parse.unquote(pk))
        if not model.exists():
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return model

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        return self(self.get_model(pk), user, **kwargs)

    async def update(self, payload: Dict, **kwargs):
        if 'email' in payload:
            self.model.configure(email=payload.get('email'))
        if 'name' in payload:
            self.model.configure(name=payload.get('name'))

        self.model.update(ignore_keys(payload, ['email', 'name']))

    async def delete(self, **kwargs):
        self.model.delete()
