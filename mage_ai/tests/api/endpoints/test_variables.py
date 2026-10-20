from mage_ai.data_preparation.variable_manager import (
    delete_global_variable,
    get_global_variable,
    get_global_variables,
    set_global_variable,
)
from mage_ai.shared.utils import clean_name
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


class VariableAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.variable_uuid = clean_name(self.faker.unique.name())
        self.variable_value = clean_name(self.faker.unique.name())
        set_global_variable(
            self.pipeline.uuid,
            self.variable_uuid,
            self.variable_value,
        )

    def tearDown(self):
        for key in get_global_variables(self.pipeline.uuid).keys():
            delete_global_variable(self.pipeline.uuid, key)
        super().tearDown()


build_list_endpoint_tests(
    VariableAPIEndpointTest,
    resource='variable',
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    list_count=1,
    result_keys_to_compare=[
        'block',
        'name',
        'pipeline',
        'value',
        'variables',
    ],
)


build_list_endpoint_tests(
    VariableAPIEndpointTest,
    test_uuid='global_only',
    resource='variable',
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    build_query=lambda _self: dict(global_only=[True]),
    list_count=1,
    result_keys_to_compare=[
        'block',
        'name',
        'pipeline',
        'value',
        'variables',
    ],
)


build_create_endpoint_tests(
    VariableAPIEndpointTest,
    resource='variable',
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    build_payload=lambda self: dict(
        name=clean_name(self.faker.unique.name()),
        value=clean_name(self.faker.unique.name()),
    ),
    assert_before_create_count=lambda self: len(
        get_global_variables(self.pipeline.uuid).values(),
    ) == 1,
    assert_after_create_count=lambda self: len(
        get_global_variables(self.pipeline.uuid).values(),
    ) == 2,
)


build_update_endpoint_tests(
    VariableAPIEndpointTest,
    resource='variable',
    get_resource_id=lambda self: self.variable_uuid,
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    build_payload=lambda self: dict(
        name=self.variable_uuid,
        value=clean_name(self.faker.unique.name()),
    ),
    get_model_before_update=lambda self: get_global_variable(
        self.pipeline.uuid,
        self.variable_uuid,
    ),
    assert_after_update=lambda
    self,
    _result,
    model: get_global_variable(
        self.pipeline.uuid,
        self.variable_uuid,
    ) != model,
)


build_delete_endpoint_tests(
    VariableAPIEndpointTest,
    resource='variable',
    get_resource_id=lambda self: self.variable_uuid,
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    assert_before_delete_count=lambda self: len(
        get_global_variables(self.pipeline.uuid).values(),
    ) == 1,
    assert_after_delete_count=lambda self: len(
        get_global_variables(self.pipeline.uuid).values(),
    ) == 0,
)
