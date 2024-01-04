import asyncio
import urllib.parse
from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.api.resources.mixins.version_control_errors import VersionControlErrors
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.version_control.models import File


async def get_detail(model: File) -> File:
    await model.detail_async()
    return model


class VersionControlFileResource(VersionControlErrors, AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        project = kwargs.get('parent_model')

        models = File.load_all(project=project)

        diff = query.get('diff', [None])
        if diff:
            diff = diff[0]

        if diff:
            models = await asyncio.gather(*[get_detail(model) for model in models])

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
        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        project = kwargs.get('parent_model')
        model = File.load(name=urllib.parse.unquote(pk))
        model.project = project
        model.diff = model.detail()

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    async def update(self, payload: Dict, **kwargs):
        self.model.update(**payload)
        self.validate_output()

    async def delete(self, **kwargs):
        self.model.delete()
        self.validate_output()
