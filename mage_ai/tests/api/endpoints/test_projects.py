import shutil
from functools import reduce

from mage_ai.api.resources.ProjectResource import build_project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.settings.repo import set_repo_path
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


class ProjectAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        set_repo_path(self.repo_path)

    def tearDown(self):
        super().tearDown()
        shutil.rmtree(self.repo_path)


# No parent
build_list_endpoint_tests(
    ProjectAPIEndpointTest,
    list_count=1,
    resource='project',
    result_keys_to_compare=[
        'features',
        'help_improve_mage',
        'latest_version',
        'name',
        'openai_api_key',
        'pipelines',
        'project_uuid',
        'version',
    ],
)


async def _get_model_before_update(_self):
    return await build_project()


async def _assert_after_update(self, result, model_before_update):
    model_after_update = await _get_model_before_update(self)

    before_update = all([
        not all([v for v in model_before_update['features'].values()]),
        not model_before_update['help_improve_mage'],
        not model_before_update['openai_api_key'],
    ])
    after_update = all([
        all([v for v in model_after_update['features'].values()]),
        model_after_update['help_improve_mage'] == result['help_improve_mage'],
        model_after_update['openai_api_key'] == result['openai_api_key'],
    ])

    return before_update and after_update


build_update_endpoint_tests(
    ProjectAPIEndpointTest,
    resource='project',
    get_resource_id=lambda self: self.faker.unique.name(),
    build_payload=lambda self: dict(
        help_improve_mage=True,
        features=reduce(lambda obj, key: merge_dict(obj, {
            key.value: True,
        }), [f for f in FeatureUUID], {}),
        openai_api_key=self.faker.unique.name(),
    ),
    get_model_before_update=_get_model_before_update,
    assert_after_update=_assert_after_update,
)
