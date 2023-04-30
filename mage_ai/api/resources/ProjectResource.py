from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.constants import VERSION
from mage_ai.shared.hash import merge_dict
import aiohttp
import uuid


async def build_project(repo_config = None, **kwargs):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://pypi.org/pypi/mage-ai/json',
                timeout=3,
            ) as response:
                response_json = await response.json()
                latest_version = response_json.get('info', {}).get('version', None)
    except Exception:
        latest_version = VERSION

    parts = get_repo_path().split('/')
    if not repo_config:
        repo_config = get_repo_config()

    model = merge_dict(repo_config.to_dict(), dict(
        latest_version=latest_version,
        name=parts[-1],
        project_uuid=repo_config.project_uuid,
        version=VERSION,
    ))

    if kwargs:
        model.update(kwargs)

    return model


class ProjectResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        project = await self.member(None, user, **kwargs)
        collection = [project.model]

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    async def member(self, _, user, **kwargs):
        model = await build_project()
        return self(model, user, **kwargs)

    @safe_db_query
    async def update(self, payload, **kwargs):
        repo_config = get_repo_config()

        data = {}

        if 'help_improve_mage' in payload:
            if payload['help_improve_mage'] and not repo_config.project_uuid:
                data['project_uuid'] = uuid.uuid4().hex
            data['help_improve_mage'] = payload['help_improve_mage']

        if len(data.keys()) >= 1:
            repo_config.save(**data)

        self.model = await build_project(repo_config)

        return self
