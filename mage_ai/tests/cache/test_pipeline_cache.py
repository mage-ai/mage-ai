import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

from freezegun import freeze_time

from mage_ai.cache.constants import CACHE_KEY_PIPELINE_DETAILS_MAPPING
from mage_ai.cache.pipeline import PipelineCache
from mage_ai.tests.api.operations.test_base import BaseApiTestCase

CURRENT_FILE_PATH = os.path.dirname(os.path.realpath(__file__))


class CustomPipelineCache(PipelineCache):
    def build_path(self, key: str) -> str:
        return os.path.join(CURRENT_FILE_PATH, key)


class PipelineCacheTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()
        shutil.copyfile(
            os.path.join(
                CURRENT_FILE_PATH,
                f'{CACHE_KEY_PIPELINE_DETAILS_MAPPING}_template',
            ),
            os.path.join(
                CURRENT_FILE_PATH,
                CACHE_KEY_PIPELINE_DETAILS_MAPPING,
            ),
        )

        self.cache = CustomPipelineCache(root_project=False)
        with open(os.path.join(CURRENT_FILE_PATH, 'example_pipeline.json')) as f:
            self.pipeline_json = json.loads(f.read())['pipeline']

        self.uuid = uuid.uuid4().hex

    def tearDown(self):
        os.remove(self.cache.build_path(self.cache.cache_key))
        super().tearDown()

    def __get_cache(self, **kwargs):
        return self.cache.get(self.cache.cache_key, **kwargs)

    def test_get(self):
        self.assertEqual(
            self.pipeline_json,
            self.__get_cache()['example_pipeline']['pipeline'],
        )

        mapping = self.__get_cache(include_all=True)

        for key in ['groups', 'models']:
            self.assertTrue(key in mapping)

    def test_set(self):
        mapping = self.__get_cache()
        self.assertEqual(self.pipeline_json, mapping['example_pipeline']['pipeline'])

        mapping['example_pipeline']['pipeline']['type'] = self.uuid

        self.cache.set(self.cache.cache_key, mapping)

        cache_new = self.__get_cache(refresh=True)
        self.assertEqual(
            cache_new['example_pipeline']['pipeline']['type'],
            self.uuid,
        )
        self.assertTrue(self.pipeline_json['uuid'] in self.__get_cache(
            include_all=True,
            refresh=True,
        )['groups']['type'][self.uuid])

    def test_build_key(self):
        self.assertEqual(self.cache.build_key(self.pipeline_json), self.pipeline_json['uuid'])

    def test_get_model(self):
        self.assertEqual(self.cache.get_model(self.pipeline_json)['pipeline'], self.pipeline_json)

    def test_get_models(self):
        models = self.cache.get_models(types=[self.pipeline_json['type']])
        self.assertEqual(
            [m['pipeline'] for m in models if m['pipeline']['uuid'] == self.pipeline_json['uuid']],
            [self.pipeline_json],
        )

    def test_update_models(self):
        now = datetime(2024, 1, 1)
        model = self.pipeline_json.copy()
        model['name'] = self.uuid

        with freeze_time(now):
            self.cache.update_models([model], added_at=now.timestamp())

        self.assertEqual(
            self.__get_cache(refresh=True)[self.pipeline_json['uuid']]['pipeline'],
            model,
        )
        self.assertEqual(
            self.__get_cache(refresh=True)[self.pipeline_json['uuid']]['added_at'],
            now.timestamp(),
        )

    def test_update_model(self):
        now = datetime(2024, 1, 1)
        model = self.pipeline_json.copy()
        model['name'] = self.uuid

        with freeze_time(now):
            self.cache.update_model(model, added_at=now.timestamp())

        self.assertEqual(
            self.__get_cache(refresh=True)[self.pipeline_json['uuid']]['pipeline'],
            model,
        )
        self.assertEqual(
            self.__get_cache(refresh=True)[self.pipeline_json['uuid']]['added_at'],
            now.timestamp(),
        )

    def test_add_model(self):
        now = datetime(2024, 1, 1, tzinfo=timezone.utc)
        model = self.pipeline_json.copy()
        model['name'] = self.uuid

        with freeze_time(now):
            self.cache.add_model(model)

        self.assertEqual(
            self.__get_cache(refresh=True)[self.pipeline_json['uuid']]['pipeline'],
            model,
        )
        self.assertEqual(
            self.__get_cache(refresh=True)[self.pipeline_json['uuid']]['added_at'],
            now.timestamp(),
        )

    def test_remove_model(self):
        self.cache.remove_model(self.pipeline_json)
        self.assertFalse(
            self.pipeline_json['uuid'] in self.__get_cache(refresh=True),
        )

    async def test_initialize_cache_for_models(self):
        now = datetime(2024, 1, 1, tzinfo=timezone.utc)

        pipeline_dict = dict(
            created_at=None,
            description=uuid.uuid4().hex,
            blocks=[
                dict(
                    downstream_blocks=[
                        uuid.uuid4().hex,
                    ],
                    language=uuid.uuid4().hex,
                    name=uuid.uuid4().hex,
                    type=uuid.uuid4().hex,
                    upstream_blocks=[
                        uuid.uuid4().hex,
                    ],
                    uuid=uuid.uuid4().hex,
                ),
            ],
            name=uuid.uuid4().hex,
            tags=[uuid.uuid4().hex, uuid.uuid4().hex],
            type=uuid.uuid4().hex,
            uuid=uuid.uuid4().hex,
        )

        repo_path = self.repo_path

        class TestCustomPipeline:
            @classmethod
            def get_all_pipelines_all_projects(cls, repo_path=repo_path, *args, **kwargs):
                return [(pipeline_dict['uuid'], repo_path)]

            @classmethod
            async def load_metadata(self, pipeline_uuid, **kwargs):
                if pipeline_uuid == pipeline_dict['uuid']:
                    return pipeline_dict

        with patch('mage_ai.data_preparation.models.pipeline.Pipeline', TestCustomPipeline):
            with freeze_time(now):
                await self.cache.initialize_cache_for_models()

        pipeline_uuid = pipeline_dict['uuid']

        self.assertEqual(
            self.cache.get(self.cache.cache_key, include_all=True, refresh=True),
            dict(
                groups=dict(
                    type={
                        pipeline_dict['type']: [
                            pipeline_uuid,
                        ],
                    },
                ),
                models={
                    pipeline_uuid: dict(
                        added_at=None,
                        pipeline=pipeline_dict,
                        updated_at=now.timestamp(),
                    ),
                },
            ),
        )
