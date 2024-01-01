import urllib.parse
from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.array import unique_by
from mage_ai.version_control.models import Remote


class VersionControlRemoteResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        project = kwargs.get('parent_model')
        model = Remote()
        model.project = project
        lines = model.list()

        models = []
        for remote in unique_by(
            [Remote.load_from_text(line) for line in lines if len(line) >= 1],
            lambda x: f'{x.name}:{x.url}',
        ):
            remote.project = project
            models.append(remote)

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
        return self(model, user, **kwargs)

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

        return self(model, user, **kwargs)

    async def update(self, payload: Dict, **kwargs):
        if payload.get('fetch'):
            self.model.update(fetch=True)
        if payload.get('set_url'):
            self.model.update(set_url=True)

    async def delete(self, **kwargs):
        self.model.delete()
