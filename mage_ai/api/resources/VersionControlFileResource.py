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


async def get_content(model: File) -> File:
    await model.read_content_async()
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
            models1 = await asyncio.gather(*[get_content(model) for model in models])
            models2 = await asyncio.gather(*[get_detail(model) for model in models])
            mapping = File(project=project).diff_stats(include_all=True)

            models = []
            for model1, model2 in zip(models1, models2):
                model1.diff = model2.diff

                if mapping.get(model1.name):
                    stats = mapping.get(model1.name)
                    model1.additions = stats.get('additions')
                    model1.deletions = stats.get('deletions')

                models.append(model1)

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

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    async def update(self, payload: Dict, **kwargs):
        await self.model.update_async(**payload)
        self.validate_output()

    async def delete(self, **kwargs):
        self.model.delete()
        self.validate_output()
