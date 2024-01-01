import urllib.parse
from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.version_control.models import Branch, Remote


class VersionControlBranchResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        project = kwargs.get('parent_model')

        remote = query.get('remote', [None])
        if remote:
            remote = remote[0]

        if remote:
            remote = Remote.load(name=remote)
            remote.project = project
            remote.hydrate()

        model = Branch()
        model.project = project
        model.remote = remote

        models = []
        for m in [Branch.load(
            name=line.strip(),
        ) for line in model.list(include_all=True) if len(line) >= 1]:
            m.project = project
            m.remote = remote
            models.append(m)

        return self.build_result_set(
            models,
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs):
        model = self.hydrate_models(**kwargs)
        model.name = payload.get('name')
        model.create()

        return self(model, user, **kwargs)

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        model = self.hydrate_models(**kwargs)
        model.name = urllib.parse.unquote(pk)
        return self(model, user, **kwargs)

    async def update(self, payload: Dict, **kwargs):
        self.model.update(**payload)

    async def delete(self, **kwargs):
        query = kwargs.get('query') or {}
        force = query.get('force', [None])
        if force:
            force = force[0]

        self.model.delete(force=force)

    @classmethod
    def hydrate_models(self, **kwargs):
        project = kwargs.get('parent_model')

        query = kwargs.get('query') or {}

        remote = query.get('remote', [None])
        if remote:
            remote = remote[0]

        if remote:
            remote = Remote.load(name=remote)
            remote.project = project
            remote.hydrate()

        model = Branch()
        model.project = project
        model.remote = remote

        return model
