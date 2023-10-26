from unittest.mock import patch

from mage_ai.tests.api.operations.base.mixins import Base


class BaseOperationsTest(Base):
    def setUp(self):
        self.set_up()

    def tearDown(self):
        self.tear_down()


for method_name in dir(Base):
    if not method_name.startswith('run_mixin_'):
        continue

    async def _test(self, method=method_name):
        with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 0):
            with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0):
                await getattr(self, method)()

    setattr(
        BaseOperationsTest,
        method_name.replace('run_mixin_', ''),
        _test,
    )

    if method_name.startswith('run_mixin_test_execute_'):
        async def _test_with_parent(self, method=method_name):
            with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 0):
                with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0):
                    await getattr(self, method)(**self.parent_resource_options())

        setattr(
            BaseOperationsTest,
            method_name.replace('run_mixin_', '') + '_with_parent',
            _test_with_parent,
        )
