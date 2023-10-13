# from unittest.mock import patch

from mage_ai.api.operations.base import BaseOperation

# from mage_ai.api.policies.BasePolicy import BasePolicy
# from mage_ai.api.presenters.BasePresenter import BasePresenter
# from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class BaseOperationsTest(BaseApiTestCase):
    def setUp(self):
        self.query = dict(
            name=self.faker.unique.name(),
            power=self.faker.unique.random_int(),
            spells=[
                self.faker.unique.name(),
                self.faker.unique.random_int(),
            ],
        )

    def tearDown(self):
        pass

    def test_query_getter(self):
        operation = BaseOperation(query=merge_dict(self.query, dict(
            shields=[
                'false',
                False,
            ],
            spear='false',
            sword='true',
            weapons=[
                'true',
                True,
            ],
        )))
        self.assertEqual(operation.query, merge_dict(self.query, dict(
            shields=[
                False,
                False,
            ],
            spear='false',
            sword='true',
            weapons=[
                True,
                True,
            ],
        )))

    def test_query_setter(self):
        operation = BaseOperation(query=self.query)
        self.assertEqual(operation.query, self.query)

        query = dict(name=self.faker.unique.name())
        operation.query = query
        self.assertEqual(operation.query, query)
