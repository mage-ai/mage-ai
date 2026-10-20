import os
from unittest.mock import call, patch
from uuid import uuid4

from faker import Faker

from mage_ai.api.operations.constants import (
    META_KEY_LIMIT,
    META_KEY_OFFSET,
    META_KEY_ORDER_BY,
)
from mage_ai.api.resources.PipelineResource import PipelineResource
from mage_ai.cache.pipeline import PipelineCache
from mage_ai.data_preparation.models.constants import PipelineStatus, PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class PipelineResourceTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()

        self.faker = Faker()
        self.uuid_hash = uuid4().hex

        self.pipeline1 = create_pipeline_with_blocks(
            f'a-{self.faker.unique.name()}-{self.uuid_hash}',
            self.repo_path,
            PipelineType.INTEGRATION,
        )
        self.pipeline2 = create_pipeline_with_blocks(
            f'b-{self.faker.unique.name()}',
            self.repo_path,
            PipelineType.STREAMING,
        )
        self.pipeline3 = create_pipeline_with_blocks(
            f'c-{self.faker.unique.name()}',
            self.repo_path,
            PipelineType.DATABRICKS,
        )

        for pipeline_uuid, status in [
            (self.pipeline1.uuid, PipelineStatus.ACTIVE),
            (self.pipeline2.uuid, PipelineStatus.INACTIVE),
        ]:
            PipelineSchedule.create(
                name=self.faker.unique.name(),
                pipeline_uuid=pipeline_uuid,
                status=status,
            )

        self.cache = PipelineCache(repo_path=self.repo_path)

    def tearDown(self):
        file_path = self.cache.build_path(self.cache.cache_key)
        if os.path.exists(file_path):
            os.remove(file_path)

        self.pipeline1.delete()
        self.pipeline2.delete()
        self.pipeline3.delete()

        PipelineSchedule.query.delete()

        super().tearDown()

    def __prepare_cache(self, number_of_pipelines_to_caches: int = 2, use_get_models: bool = False):
        pipelines = [self.pipeline1, self.pipeline2, self.pipeline3]

        for pipeline in pipelines[:number_of_pipelines_to_caches]:
            self.cache.add_model(pipeline)

        def __get_model(
            model,
            number_of_pipelines_to_caches=number_of_pipelines_to_caches,
            pipelines=pipelines,
            **kwargs,
        ):
            mapping = {}

            for idx, pipeline in enumerate(pipelines):
                value = None
                if idx < number_of_pipelines_to_caches:
                    value = dict(pipeline=dict(
                        type=pipeline.type,
                        uuid=pipeline.uuid,
                    ))

                mapping[pipeline.uuid] = value

            return mapping[model['uuid']]

        def __get_models(
            types,
            pipelines=pipelines,
        ):
            arr = []

            for pipeline in pipelines[:number_of_pipelines_to_caches]:
                if pipeline.type in types:
                    arr.append(dict(pipeline=dict(
                        type=pipeline.type,
                        uuid=pipeline.uuid,
                    )))

            return arr

        async def __initialize_cache():
            return self.cache

        return __get_models if use_get_models else __get_model, __initialize_cache

    async def test_collection_without_cache(self):
        async def __initialize_cache():
            return self.cache

        with patch.object(self.cache, 'get_model', lambda _x, repo_path=None: None):
            with patch.object(Pipeline, 'get_async', wraps=Pipeline.get_async) as mock_get_async:
                with patch(
                    'mage_ai.cache.pipeline.PipelineCache.initialize_cache',
                    __initialize_cache,
                ):
                    results = await PipelineResource.collection({}, {}, None)

                    self.assertEqual(
                        sorted([resource.uuid for resource in results]),
                        sorted([self.pipeline1.uuid, self.pipeline2.uuid, self.pipeline3.uuid]),
                    )

                    mock_get_async.assert_has_calls(
                        [call.get_async(uuid, repo_path=self.repo_path) for uuid in [
                            self.pipeline1.uuid,
                            self.pipeline2.uuid,
                            self.pipeline3.uuid,
                        ]],
                        any_order=True,
                    )

    async def test_collection_with_cache(self):
        __get_model, __initialize_cache = self.__prepare_cache(3)

        with patch.object(self.cache, 'get_model', __get_model):
            with patch.object(Pipeline, 'get_async', wraps=Pipeline.get_async) as mock_get_async:
                with patch(
                    'mage_ai.cache.pipeline.PipelineCache.initialize_cache',
                    __initialize_cache,
                ):
                    results = await PipelineResource.collection({}, {}, None)

                    self.assertEqual(
                        sorted([resource.uuid for resource in results]),
                        sorted([self.pipeline1.uuid, self.pipeline2.uuid, self.pipeline3.uuid]),
                    )

                    mock_get_async.assert_not_called()

    async def test_collection_with_some_cache(self):
        __get_model, __initialize_cache = self.__prepare_cache()

        with patch.object(self.cache, 'get_model', __get_model):
            with patch.object(Pipeline, 'get_async', wraps=Pipeline.get_async) as mock_get_async:
                with patch(
                    'mage_ai.cache.pipeline.PipelineCache.initialize_cache',
                    __initialize_cache,
                ):
                    results = await PipelineResource.collection({}, {}, None)

                    self.assertEqual(
                        sorted([resource.uuid for resource in results]),
                        sorted([self.pipeline1.uuid, self.pipeline2.uuid, self.pipeline3.uuid]),
                    )

                    mock_get_async.assert_has_calls(
                        [call.get_async(uuid, repo_path=self.repo_path) for uuid in [
                            self.pipeline3.uuid,
                        ]],
                        any_order=True,
                    )

    async def test_collection_with_order_by(self):
        __get_model, __initialize_cache = self.__prepare_cache()

        results = []
        with patch.object(self.cache, 'get_model', __get_model):
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                results = await PipelineResource.collection({}, {}, None)
                self.assertEqual(len(results), 3)

                arr = [
                    self.pipeline1,
                    self.pipeline2,
                    self.pipeline3,
                ]
                order_by = 'name'
                if [r.uuid for r in results] == [r.uuid for r in arr]:
                    order_by = 'type'

                arr = sorted(arr, key=lambda x: getattr(x, order_by))

                results2 = await PipelineResource.collection({}, {
                    META_KEY_ORDER_BY: order_by,
                }, None)

                self.assertEqual([r.uuid for r in arr], [r.uuid for r in results2])
                self.assertNotEqual([r.uuid for r in results], [r.uuid for r in results2])

                arr = sorted(arr, key=lambda x: getattr(x, order_by), reverse=True)

                results3 = await PipelineResource.collection({}, {
                    META_KEY_ORDER_BY: f'-{order_by}',
                }, None)

                self.assertEqual([r.uuid for r in arr], [r.uuid for r in results3])
                self.assertNotEqual([r.uuid for r in results3], [r.uuid for r in results])
                self.assertNotEqual([r.uuid for r in results3], [r.uuid for r in results2])

    async def test_collection_with_limit(self):
        __get_model, __initialize_cache = self.__prepare_cache()

        with patch.object(self.cache, 'get_model', __get_model):
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                results = await PipelineResource.collection({}, {
                    META_KEY_LIMIT: 2,
                }, None)
                self.assertEqual(len(results), 2)

    async def test_collection_with_offset(self):
        __get_model, __initialize_cache = self.__prepare_cache()

        with patch.object(self.cache, 'get_model', __get_model):
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                results = await PipelineResource.collection({}, {}, None)
                results2 = await PipelineResource.collection({}, {
                    META_KEY_OFFSET: 2,
                }, None)

                self.assertEqual(len(results2), 1)
                self.assertEqual(results2[0].uuid, results[-1].uuid)

    async def test_collection_with_filter_type(self):
        __get_models, __initialize_cache = self.__prepare_cache(3, use_get_models=True)

        with patch.object(self.cache, 'get_models', __get_models):
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                results = await PipelineResource.collection({
                    'type[]': [
                        self.pipeline2.type,
                        self.pipeline3.type,
                    ],
                }, {}, None)
                self.assertEqual(
                    sorted([self.pipeline2.uuid, self.pipeline3.uuid]),
                    sorted([r.uuid for r in results]),
                )

    async def test_collection_with_filter_status(self):
        __get_model, __initialize_cache = self.__prepare_cache()

        with patch.object(self.cache, 'get_model', __get_model):
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                results = await PipelineResource.collection({
                    'include_schedules': [True],
                    'status[]': [
                        PipelineStatus.ACTIVE,
                        PipelineStatus.INACTIVE,
                    ],
                }, {}, None)
                self.assertEqual(
                    sorted([self.pipeline1.uuid, self.pipeline2.uuid]),
                    sorted([r.uuid for r in results]),
                )

    async def test_collection_with_filter_search(self):
        __get_model, __initialize_cache = self.__prepare_cache()

        with patch.object(self.cache, 'get_model', __get_model):
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                results = await PipelineResource.collection({
                    'search': [self.uuid_hash],
                }, {}, None)
                self.assertEqual(
                    sorted([self.pipeline1.uuid]),
                    sorted([r.uuid for r in results]),
                )

    async def test_create(self):
        __initialize_cache = self.__prepare_cache()[1]

        with patch.object(self.cache, 'add_model') as mock_add_model:
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                resource = await PipelineResource.process_create(dict(
                    name=self.faker.unique.name(),
                    type=PipelineType.STREAMING,
                ), None)

                mock_add_model.assert_called_once_with(resource.model)

    async def test_update(self):
        __initialize_cache = self.__prepare_cache()[1]

        with patch.object(self.cache, 'update_model') as mock_update_model:
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                resource = await PipelineResource(self.pipeline1, None, None).process_update(dict(
                    type=PipelineType.STREAMING,
                ))

                mock_update_model.assert_called_once_with(resource.model)

    async def test_delete(self):
        __initialize_cache = self.__prepare_cache()[1]

        with patch.object(self.cache, 'remove_model') as mock_remove_model:
            with patch('mage_ai.cache.pipeline.PipelineCache.initialize_cache', __initialize_cache):
                await PipelineResource(self.pipeline1, None, None).process_delete()

                mock_remove_model.assert_called_once()

    async def test_get_model(self):
        model = await PipelineResource.get_model(self.pipeline1.uuid)
        self.assertEqual(model.uuid, self.pipeline1.uuid)

    async def test_get_model_all_projects(self):
        with patch(
            'mage_ai.api.resources.PipelineResource.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.api.resources.PipelineResource.get_pipeline_from_platform_async',
            ) as mock:
                await PipelineResource.get_model(self.pipeline1.uuid)
                mock.assert_called_once_with(
                    self.pipeline1.uuid,
                    repo_path=self.repo_path,
                    context_data=None,
                )

    async def test_member(self):
        with patch(
            'mage_ai.api.resources.PipelineResource.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.api.resources.PipelineResource.get_pipeline_from_platform_async',
                wraps=Pipeline.get_async,
            ) as mock:
                await PipelineResource.member(self.pipeline1.uuid, None)
                mock.assert_called_once_with(
                    self.pipeline1.uuid,
                    repo_path=self.repo_path,
                    context_data=None,
                )
