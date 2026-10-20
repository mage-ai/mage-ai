from unittest.mock import patch

from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.custom_templates.utils import (
    group_and_hydrate_files,
)
from mage_ai.shared.array import find
from mage_ai.tests.base_test import DBTestCase


class CustomTemplatesUtilsTest(DBTestCase):
    def test_group_and_hydrate_files(self):
        file_dicts = [
            None,
            dict(parent_names=None),
            dict(parent_names=[]),
            dict(parent_names=[None]),
            dict(parent_names=['mage']),
            dict(parent_names=['mage', 'fire']),
        ]

        def load(repo_path: str, template_uuid: str):
            return CustomBlockTemplate(repo_path=repo_path, template_uuid=template_uuid)

        with patch.object(
            CustomBlockTemplate,
            'load',
            load,
        ):
            arr = group_and_hydrate_files(file_dicts, CustomBlockTemplate)

            self.assertTrue(find(lambda x: x.template_uuid == '', arr))
            self.assertTrue(find(lambda x: x.template_uuid == 'None', arr))
            self.assertTrue(find(lambda x: x.template_uuid == 'mage', arr))
            self.assertTrue(find(lambda x: x.template_uuid == 'mage/fire', arr))
