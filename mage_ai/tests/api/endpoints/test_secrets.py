from mage_ai.data_preparation.shared.secrets import (
    create_secret,
    delete_secrets_dir,
    get_valid_secrets_for_repo,
)
from mage_ai.orchestration.constants import Entity
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_list_endpoint_tests,
)


class SecretAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.secret = create_secret(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
            value=self.faker.unique.name(),
        )
        self.secret2 = create_secret(
            name=self.faker.unique.name(),
            value=self.faker.unique.name(),
        )

    def tearDown(self):
        super().tearDown()
        delete_secrets_dir(entity=Entity.GLOBAL)


build_list_endpoint_tests(
    SecretAPIEndpointTest,
    list_count=2,
    resource='secret',
    result_keys_to_compare=[
        'id',
        'name',
    ],
)


build_create_endpoint_tests(
    SecretAPIEndpointTest,
    resource='secret',
    build_payload=lambda self: dict(
        name=self.faker.unique.name(),
        value=self.faker.unique.name(),
    ),
    assert_before_create_count=lambda _self: len(get_valid_secrets_for_repo()) == 2,
    assert_after_create_count=lambda _self: len(get_valid_secrets_for_repo()) == 3,
)


build_delete_endpoint_tests(
    SecretAPIEndpointTest,
    resource='secret',
    get_resource_id=lambda self: self.secret.name,
    assert_before_delete_count=lambda _self: len(get_valid_secrets_for_repo()) == 2,
    assert_after_delete_count=lambda _self: len(get_valid_secrets_for_repo()) == 1,
)
