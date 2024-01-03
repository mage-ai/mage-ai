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
        model = self.hydrate_models(**kwargs)
        model.name = payload.get('name')
        model.create()

        if payload.get('clone'):
            model.update(clone=True)

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        model = self.hydrate_models(name=urllib.parse.unquote(pk), **kwargs)

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    async def update(self, payload: Dict, **kwargs):
        self.model.update(**payload)
        self.validate_output()

    async def delete(self, **kwargs):
        query = kwargs.get('query') or {}
        force = query.get('force', [None])
        if force:
            force = force[0]

        self.model.delete(force=force)

        self.validate_output()

    @classmethod
    def hydrate_models(self, name: str = None, **kwargs):
        project = kwargs.get('parent_model')

        query = kwargs.get('query') or {}

        remote = query.get('remote', [None])
        if remote:
            remote = remote[0]

        if remote:
            remote = Remote.load(name=remote)
            remote.project = project
            remote.hydrate()

        model = Branch.load(name=name)
        model.project = project
        model.remote = remote
        model.update_attributes()

        return model
