import os
from unittest.mock import patch

from mage_ai.settings.platform.utils import (
    get_pipeline_config_path,
    get_pipeline_from_platform,
    get_pipeline_from_platform_async,
)
from mage_ai.settings.utils import base_repo_path
from mage_ai.tests.base_test import AsyncDBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks
from mage_ai.tests.settings.test_platform import SETTINGS
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class PlatformUtilsTests(ProjectPlatformMixin, AsyncDBTestCase):
    def test_get_pipeline_config_path(self):
        for settings in self.repo_paths.values():
            pipeline = create_pipeline_with_blocks(
                self.faker.unique.name(),
                settings['full_path'],
            )
            pipeline.save()

            config_path, repo_path = get_pipeline_config_path(pipeline.uuid)
            self.assertEqual(config_path, os.path.join(
                settings['full_path'],
                f'pipelines/{pipeline.uuid}/metadata.yaml',
            ))
            self.assertEqual(repo_path, settings['full_path'])

    def test_get_pipeline_from_platform(self):
        arr = []
        for settings in self.repo_paths.values():
            pipeline = create_pipeline_with_blocks(
                self.faker.unique.name(),
                settings['full_path'],
            )
            pipeline.save()

        for pipeline in arr:
            self.assertIsNone(get_pipeline_from_platform(pipeline.uuid))

        with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
            for pipeline in arr:
                self.assertEqual(pipeline.uuid, get_pipeline_from_platform(pipeline.uuid).uuid)

    def test_get_pipeline_from_platform_with_repo_path(self):
        full_path = os.path.join(base_repo_path(), 'not_registered_project')
        pipeline = create_pipeline_with_blocks(
            self.faker.unique.name(),
            full_path,
        )
        pipeline.save()

        error = False
        try:
            get_pipeline_from_platform(pipeline.uuid)
        except Exception:
            error = True
        self.assertTrue(error)

        with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
            self.assertEqual(pipeline.uuid, get_pipeline_from_platform(
                pipeline.uuid,
                repo_path=full_path,
                use_repo_path=True,
            ).uuid)

    def test_get_pipeline_from_platform_with_repo_path_and_default_mapping(self):
        self.initialize_settings(SETTINGS)

        full_path = os.path.join(
            os.path.dirname(base_repo_path()),
            'default_repo',
        )

        with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
            with patch('mage_ai.data_preparation.models.pipeline.Pipeline.get') as mock:
                get_pipeline_from_platform(
                    'mage',
                    repo_path=full_path,
                )
                mock.assert_called_once_with(
                    'mage',
                    repo_path=os.path.join(base_repo_path(), 'mage_platform'),
                    all_projects=False,
                    use_repo_path=False,
                )

    async def test_get_pipeline_from_platform_async(self):
        arr = []
        for settings in self.repo_paths.values():
            pipeline = create_pipeline_with_blocks(
                self.faker.unique.name(),
                settings['full_path'],
            )
            pipeline.save()

        for pipeline in arr:
            self.assertIsNone(await get_pipeline_from_platform_async(pipeline.uuid))

        with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
            for pipeline in arr:
                self.assertEqual(
                    pipeline.uuid,
                    (await get_pipeline_from_platform_async(pipeline.uuid)).uuid,
                )

    async def test_get_pipeline_from_platform_async_with_repo_path(self):
        full_path = os.path.join(base_repo_path(), 'not_registered_project')
        pipeline = create_pipeline_with_blocks(
            self.faker.unique.name(),
            full_path,
        )
        pipeline.save()

        error = False
        try:
            await get_pipeline_from_platform_async(pipeline.uuid)
        except Exception:
            error = True
        self.assertTrue(error)

        with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
            self.assertEqual(
                pipeline.uuid,
                (await get_pipeline_from_platform_async(
                    pipeline.uuid,
                    repo_path=full_path,
                    use_repo_path=True,
                )).uuid)

    async def test_get_pipeline_from_platform_async_with_repo_path_and_default_mapping(self):
        self.initialize_settings(SETTINGS)

        full_path = os.path.join(
            os.path.dirname(base_repo_path()),
            'default_repo/default_repo',
        )

        with patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True):
            with patch('mage_ai.data_preparation.models.pipeline.Pipeline.get_async') as mock:
                await get_pipeline_from_platform_async(
                    'mage',
                    repo_path=full_path,
                )
                mock.assert_called_once_with(
                    'mage',
                    repo_path=os.path.join(base_repo_path(), 'mage_platform'),
                    all_projects=False,
                    use_repo_path=False,
                )
