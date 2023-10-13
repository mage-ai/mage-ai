from unittest.mock import patch

from mage_ai.tests.api.operations.base.mixins import Base


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 0)
@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0)
class BaseOperationsTest(Base):
    def setUp(self):
        self.set_up()

    def tearDown(self):
        self.tear_down()

    def test_query_getter(self):
        self.run_test_query_getter()

    def test_query_setter(self):
        self.run_test_query_setter()

    async def test_execute_list(self):
        await self.run_test_execute_list()

    async def test_execute_list_with_query(self):
        await self.run_test_execute_list_with_query()
