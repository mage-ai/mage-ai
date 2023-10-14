from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


class PipelineAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    PipelineAPIEndpointTest,
    resource='pipelines',
    list_count=1,
)


build_create_endpoint_tests(
    PipelineAPIEndpointTest,
    resource='pipelines',
    assert_after_create_count=lambda self: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 2,
    assert_before_create_count=lambda self: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 1,
    build_payload=lambda self: dict(
        name=self.faker.unique.name(),
    ),
)


build_detail_endpoint_tests(
    PipelineAPIEndpointTest,
    resource='pipelines',
    get_resource_id=lambda self: self.pipeline.uuid,
)


build_update_endpoint_tests(
    PipelineAPIEndpointTest,
    resource='pipelines',
    get_resource_id=lambda self: self.pipeline.uuid,
    build_payload=lambda self: dict(name=self.faker.unique.name()),
    get_model_before_update=lambda self: self.pipeline,
    assert_after_update=lambda self, payload, model: model.name != payload['name'],
)


build_delete_endpoint_tests(
    PipelineAPIEndpointTest,
    resource='pipelines',
    get_resource_id=lambda self: self.pipeline.uuid,
    assert_after_delete_count=lambda self: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 0,
    assert_before_delete_count=lambda self: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 1,
)
