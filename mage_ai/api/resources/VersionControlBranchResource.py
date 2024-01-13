import urllib.parse
from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.api.resources.mixins.version_control_errors import VersionControlErrors
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.version_control.models import Branch, Remote


class VersionControlBranchResource(VersionControlErrors, AsyncBaseResource):
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

        models = Branch.load_all(project=project, remote=remote)
        return self.build_result_set(
            models,
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs):
        model = self.hydrate_models(user, **kwargs)
        model.name = payload.get('name')
        model.create()

        if payload.get('clone'):
            model.update(clone=True)

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        model = self.hydrate_models(user, name=urllib.parse.unquote(pk), **kwargs)

        query = kwargs.get('query') or {}
        log = query.get('log', [None])
        if log:
            log = log[0]
        if log:
            model.detail(log=True)

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    async def update(self, payload: Dict, **kwargs):
        await self.model.update_async(**payload)
        self.validate_output()

    async def delete(self, **kwargs):
        query = kwargs.get('query') or {}
        force = query.get('force', [None])
        if force:
            force = force[0]

        self.model.delete(force=force)

        self.validate_output()

    @classmethod
    def hydrate_models(self, user: User, name: str = None, **kwargs):
        project = kwargs.get('parent_model')

        query = kwargs.get('query') or {}
        remote = query.get('remote', [None])
        if remote:
            remote = remote[0]

        project.branch.hydrate(name=name)
        project.remote.hydrate(name=remote)
        project.hydrate(user=user)

        return project.branch
