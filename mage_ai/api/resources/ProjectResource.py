from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.orchestration.db import safe_db_query
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.logger import UsageStatisticLogger
import uuid


async def build_project(repo_config=None, **kwargs):
    project = Project(repo_config=repo_config)

    model = merge_dict(project.repo_config.to_dict(), dict(
        latest_version=await project.latest_version(),
        name=project.name,
        project_uuid=project.project_uuid,
        version=project.version,
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
        should_log_project = False

        if 'help_improve_mage' in payload:
            if payload['help_improve_mage']:
                should_log_project = True

                if not repo_config.project_uuid:
                    data['project_uuid'] = uuid.uuid4().hex

            data['help_improve_mage'] = payload['help_improve_mage']

        if len(data.keys()) >= 1:
            repo_config.save(**data)

        self.model = await build_project(repo_config)

        if should_log_project:
            await UsageStatisticLogger().project_impression()

        return self
