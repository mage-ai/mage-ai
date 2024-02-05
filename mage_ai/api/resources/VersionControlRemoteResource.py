import urllib.parse
from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.api.resources.mixins.version_control_errors import VersionControlErrors
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.version_control.models import Remote


class VersionControlRemoteResource(VersionControlErrors, AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        project = kwargs.get('parent_model')

        models = Remote.load_all(project=project)
        return self.build_result_set(
            models,
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs):
        project = kwargs.get('parent_model')
        model = Remote.load(**payload)
        model.project = project
        model.create()

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        project = kwargs.get('parent_model')

        query = kwargs.get('query') or {}
        url = query.get('url', [None])
        if url:
            url = url[0]

        model = Remote.load(
            name=urllib.parse.unquote(pk),
            url=url,
        )
        model.project = project

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    async def update(self, payload: Dict, **kwargs):
        if payload.get('fetch'):
            self.model.update(fetch=True)
        if payload.get('name') or payload.get('url'):
            self.model.name = payload.get('name') or self.model.name
            self.model.url = payload.get('url') or self.model.url
            self.model.update(set_url=True)
        self.validate_output()

    async def delete(self, **kwargs):
        self.model.delete()
        self.validate_output()
