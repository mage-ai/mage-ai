from unittest.mock import patch

from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class PipelineAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    PipelineAPIEndpointTest,
    resource='pipelines',
    list_count=1,
    result_keys_to_compare=[
        'blocks',
        'callbacks',
        'concurrency_config',
        'conditionals',
        'created_at',
        'data_integration',
        'description',
        'executor_config',
        'executor_count',
        'executor_type',
        'name',
        'notification_config',
        'retry_config',
        'run_pipeline_in_one_process',
        'spark_config',
        'tags',
        'type',
        'updated_at',
        'uuid',
        'widgets',
    ],
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
    result_keys_to_compare=[
        'blocks',
        'callbacks',
        'concurrency_config',
        'conditionals',
        'created_at',
        'data_integration',
        'description',
        'executor_config',
        'executor_count',
        'executor_type',
        'extensions',
        'name',
        'notification_config',
        'retry_config',
        'run_pipeline_in_one_process',
        'spark_config',
        'tags',
        'type',
        'updated_at',
        'uuid',
        'widgets',
    ],
)


build_update_endpoint_tests(
    PipelineAPIEndpointTest,
    resource='pipelines',
    get_resource_id=lambda self: self.pipeline.uuid,
    build_payload=lambda self: dict(name=self.faker.unique.name()),
    get_model_before_update=lambda self: self.pipeline,
    assert_after_update=lambda self, result, model: model.name != result['name'],
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


class PipelineWithProjectPlatformAPIEndpointTest(BaseAPIEndpointTest, ProjectPlatformMixin):
    def setUp(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                super().setUp()
                self.setup_final()

    def tearDown(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                self.teardown_final()
                super().tearDown()


build_list_endpoint_tests(
    PipelineWithProjectPlatformAPIEndpointTest,
    resource='pipelines',
    list_count=3,
    result_keys_to_compare=[
        'blocks',
        'callbacks',
        'concurrency_config',
        'conditionals',
        'created_at',
        'data_integration',
        'description',
        'executor_config',
        'executor_count',
        'executor_type',
        'name',
        'notification_config',
        'retry_config',
        'run_pipeline_in_one_process',
        'spark_config',
        'tags',
        'type',
        'updated_at',
        'uuid',
        'widgets',
    ],
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
    ],
)


build_create_endpoint_tests(
    PipelineWithProjectPlatformAPIEndpointTest,
    resource='pipelines',
    assert_after_create_count=lambda self, mocks: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 4,
    assert_before_create_count=lambda self, mocks: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 3,
    build_payload=lambda self: dict(
        name=self.faker.unique.name(),
    ),
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
    ],
)


build_detail_endpoint_tests(
    PipelineWithProjectPlatformAPIEndpointTest,
    resource='pipelines',
    get_resource_id=lambda self: self.pipeline.uuid,
    result_keys_to_compare=[
        'blocks',
        'callbacks',
        'concurrency_config',
        'conditionals',
        'created_at',
        'data_integration',
        'description',
        'executor_config',
        'executor_count',
        'executor_type',
        'extensions',
        'name',
        'notification_config',
        'retry_config',
        'run_pipeline_in_one_process',
        'spark_config',
        'tags',
        'type',
        'updated_at',
        'uuid',
        'widgets',
    ],
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
    ],
)


build_update_endpoint_tests(
    PipelineWithProjectPlatformAPIEndpointTest,
    resource='pipelines',
    get_resource_id=lambda self: self.pipeline.uuid,
    build_payload=lambda self: dict(name=self.faker.unique.name()),
    get_model_before_update=lambda self: self.pipeline,
    assert_after_update=lambda self, result, model, mocks: model.name != result['name'],
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
    ],
)


build_delete_endpoint_tests(
    PipelineWithProjectPlatformAPIEndpointTest,
    resource='pipelines',
    get_resource_id=lambda self: self.pipeline.uuid,
    assert_after_delete_count=lambda self, mocks: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 2,
    assert_before_delete_count=lambda self, mocks: len(
        Pipeline.get_all_pipelines(self.repo_path),
    ) == 3,
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
    ],
)
