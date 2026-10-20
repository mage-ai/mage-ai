from mage_ai.api.constants import AttributeOperationType
from mage_ai.api.policies.OauthPolicy import OauthPolicy
from mage_ai.api.presenters.OauthPresenter import OauthPresenter
from mage_ai.tests.base_test import AsyncDBTestCase


class OauthPolicyTestCase(AsyncDBTestCase):
    def test_attribute_rule_with_permissions(self):
        error = False

        try:
            write_attributes = [
                'action_type',
                'provider',
                'token',
            ]
            for key in write_attributes:
                OauthPolicy.attribute_rule_with_permissions(
                    AttributeOperationType.WRITE,
                    key,
                )

            read_attributes = OauthPresenter.default_attributes
            for key in read_attributes:
                OauthPolicy.attribute_rule_with_permissions(
                    AttributeOperationType.READ,
                    key,
                )

            for key in ['doesn’t exist', 'mage']:
                OauthPolicy.attribute_rule_with_permissions(
                    AttributeOperationType.QUERY,
                    key,
                )
        except Exception:
            error = True

        self.assertFalse(error)
