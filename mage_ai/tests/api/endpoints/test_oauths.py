from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)


class OauthAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    OauthAPIEndpointTest,
    resource='oauths',
    list_count=1,
    build_query=lambda self: dict(redirect_uri=['http://localhost:3000/pipelines']),
    result_keys_to_compare=[
        'provider',
        'url',
        'redirect_query_params',
    ],
    patch_function_settings=[
        ('mage_ai.settings.sso.GOOGLE_CLIENT_ID', lambda: 'test'),
        ('mage_ai.settings.sso.GOOGLE_CLIENT_SECRET', lambda: 'test secret'),
    ]
)
