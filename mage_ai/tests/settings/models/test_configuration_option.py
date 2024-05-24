import json
import os
import shutil
from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.block.dbt.block import DBTBlock
from mage_ai.settings.models.configuration_option import (
    ConfigurationOption,
    ConfigurationType,
    OptionType,
)
from mage_ai.shared.array import find
from mage_ai.tests.base_test import AsyncDBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks

CURRENT_FILE_PATH = os.path.dirname(os.path.realpath(__file__))


class ConfigurationOptionTest(AsyncDBTestCase):
    def setUp(self):
        super().setUp()
        self.directory = os.path.join(self.repo_path, 'mage_platform')

        os.makedirs(os.path.join(self.directory, 'dir1'), exist_ok=True)
        os.makedirs(os.path.join(self.directory, 'dir2', 'dir3'), exist_ok=True)
        os.makedirs(os.path.join(self.directory, 'dbt', 'dir2'), exist_ok=True)

        with open(os.path.join(self.directory, 'dir1', 'profiles.yml'), 'w') as f:
            with open(os.path.join(CURRENT_FILE_PATH, 'test_profiles1.yml')) as f2:
                f.write(f2.read())
        with open(os.path.join(self.directory, 'dir1', 'dbt_project.yml'), 'w') as f:
            with open(os.path.join(CURRENT_FILE_PATH, 'test_dbt_project1.yml')) as f2:
                f.write(f2.read())

        with open(os.path.join(self.directory, 'dir2', 'dir3', 'profiles.yml'), 'w') as f:
            with open(os.path.join(CURRENT_FILE_PATH, 'test_profiles2.yml')) as f2:
                f.write(f2.read())
        with open(os.path.join(self.directory, 'dir2', 'dbt_project.yml'), 'w') as f:
            with open(os.path.join(CURRENT_FILE_PATH, 'test_dbt_project2.yml')) as f2:
                f.write(f2.read())

        with open(os.path.join(self.directory, 'dbt', 'dir2', 'profiles.yml'), 'w') as f:
            with open(os.path.join(CURRENT_FILE_PATH, 'test_profiles2.yml')) as f2:
                f.write(f2.read())
        with open(os.path.join(self.directory, 'dbt', 'dir2', 'dbt_project.yml'), 'w') as f:
            with open(os.path.join(CURRENT_FILE_PATH, 'test_dbt_project2.yml')) as f2:
                f.write(f2.read())

    def tearDown(self):
        try:
            shutil.rmtree(self.directory)
        except Exception as err:
            print(f'[ERROR] ConfigurationOptionTest.tearDown: {err}.')
        super().tearDown()

    async def test_fetch(self):
        options = await ConfigurationOption.fetch(
            configuration_type=ConfigurationType.DBT,
            option_type=OptionType.PROJECTS,
            resource_type=EntityName.Block,
        )
        with open(os.path.join(CURRENT_FILE_PATH, 'example_options.json')) as f:
            results = [o.to_dict() for o in options]
            arr = json.loads(f.read())

            for item in arr:
                self.assertEqual(
                    item,
                    find(lambda x, item=item: x['uuid'] == item['uuid'], results),
                )

    async def test_fetch_project_platform_activated(self):
        with patch(
            'mage_ai.settings.models.configuration_option.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
                with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                    options = await ConfigurationOption.fetch(
                        configuration_type=ConfigurationType.DBT,
                        option_type=OptionType.PROJECTS,
                        resource_type=EntityName.Block,
                    )
                    with open(os.path.join(
                        CURRENT_FILE_PATH,
                        'example_options_project_platform.json',
                    )) as f:
                        results = [o.to_dict() for o in options]
                        arr = json.loads(f.read())

                        for item in arr:
                            self.assertEqual(
                                item,
                                find(lambda x, item=item: x['uuid'] == item['uuid'], results),
                            )

    async def test_fetch_with_resource_uuid(self):
        pipeline = create_pipeline_with_blocks(
            self.faker.unique.name(),
            os.path.join(self.repo_path, 'mage_platform'),
        )
        block = DBTBlock.create(
            block_type='dbt',
            configuration=dict(file_path='dir2/mage.sql'),
            language='sql',
            name=self.faker.unique.name(),
            pipeline=pipeline,
            uuid=self.faker.unique.name(),
        )
        pipeline.add_block(block)

        options = await ConfigurationOption.fetch(
            configuration_type=ConfigurationType.DBT,
            option_type=OptionType.PROJECTS,
            pipeline=pipeline,
            resource_type=EntityName.Block,
            resource_uuid=block.uuid,
        )

        with open(os.path.join(CURRENT_FILE_PATH, 'example_options_resource_uuid.json')) as f:
            results = [o.to_dict() for o in options]
            arr = json.loads(f.read())

            for item in arr:
                self.assertEqual(
                    item,
                    find(lambda x, item=item: x['uuid'] == item['uuid'], results),
                )

    async def test_fetch_with_resource_uuid_project_platform_activated(self):
        with patch(
            'mage_ai.settings.models.configuration_option.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
                with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                    pipeline = create_pipeline_with_blocks(
                        self.faker.unique.name(),
                        os.path.join(self.repo_path, 'mage_platform'),
                    )
                    block = DBTBlock.create(
                        block_type='dbt',
                        configuration=dict(file_path='dir2/mage.sql'),
                        language='sql',
                        name=self.faker.unique.name(),
                        pipeline=pipeline,
                        uuid=self.faker.unique.name(),
                    )
                    pipeline.add_block(block)

                    options = await ConfigurationOption.fetch(
                        configuration_type=ConfigurationType.DBT,
                        option_type=OptionType.PROJECTS,
                        pipeline=pipeline,
                        resource_type=EntityName.Block,
                        resource_uuid=block.uuid,
                    )

                    with open(os.path.join(
                        CURRENT_FILE_PATH,
                        'example_options_resource_uuid.json',
                    )) as f:
                        results = [o.to_dict() for o in options]
                        arr = json.loads(f.read())

                        for item in arr:
                            self.assertEqual(
                                item,
                                find(lambda x, item=item: x['uuid'] == item['uuid'], results),
                            )
