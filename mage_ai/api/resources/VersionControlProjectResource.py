import inspect
import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.api.resources.mixins.version_control_errors import VersionControlErrors
from mage_ai.api.resources.SyncResource import SyncResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.version_control.models import Project


class VersionControlProjectResource(VersionControlErrors, AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user: User, **kwargs):
        return self.build_result_set(
            Project.load_all(),
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload: Dict, user: User, **kwargs):
        model = Project.create(payload['uuid'])

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    @classmethod
    def get_model(self, pk, **kwargs):
        model = Project.load(uuid=urllib.parse.unquote(pk))

        if not model.exists():
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return model

    @classmethod
    async def member(self, pk: str, user: User, **kwargs):
        model = self.get_model(pk)

        sync_resource = SyncResource.member(None, user, repo_path=model.repo_path)
        result = SyncResource.presenter_class()(
            sync_resource,
            user,
            **kwargs,
        ).present()
        if result and inspect.isawaitable(result):
            result = await result
        model.sync_config = result

        res = self(model, user, **kwargs)
        res.validate_output()

        return res

    async def update(self, payload: Dict, **kwargs):
        if 'email' in payload:
            self.model.configure(email=payload.get('email'))
        if 'name' in payload:
            self.model.configure(name=payload.get('name'))

        if payload.get('sync_config'):
            SyncResource.create(
                payload.get('sync_config'),
                self.current_user,
                repo_name=self.model.repo_path,
                repo_path=self.model.repo_path,
            )

            sync_resource = SyncResource.member(
                None,
                self.current_user,
                repo_path=self.model.repo_path,
            )
            result = SyncResource.presenter_class()(
                sync_resource,
                self.current_user,
                **kwargs,
            ).present()
            if result and inspect.isawaitable(result):
                result = await result
            self.model.sync_config = result

        self.model.update_attributes()
        self.validate_output()

    async def delete(self, **kwargs):
        self.model.delete()
        self.validate_output()
