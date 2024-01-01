import urllib.parse
from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.version_control.models import File


class VersionControlFileResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        project = kwargs.get('parent_model')

        staged = query.get('staged', [None])
        if staged:
            staged = staged[0]

        unstaged = query.get('unstaged', [None])
        if unstaged:
            unstaged = unstaged[0]

        untracked = query.get('untracked', [None])
        if untracked:
            untracked = untracked[0]

        model = File()
        model.project = project

        models = []
        for m in [File.load(name=line) for line in model.list(
            staged=staged,
            unstaged=unstaged,
            untracked=untracked,
        ) if len(line) >= 1]:
            m.project = project
            models.append(m)

        return self.build_result_set(
            models,
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs):
        project = kwargs.get('parent_model')
        model = File()
        model.project = project
        model.name = payload.get('name')
        model.create()
        return self(model, user, **kwargs)

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        project = kwargs.get('parent_model')
        model = File.load(name=urllib.parse.unquote(pk))
        model.project = project
        model.diff = model.detail()
        return self(model, user, **kwargs)

    async def update(self, payload: Dict, **kwargs):
        self.model.update(**payload)

    async def delete(self, **kwargs):
        self.model.delete()
