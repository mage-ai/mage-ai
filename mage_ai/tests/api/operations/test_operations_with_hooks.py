import os
import uuid

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    HookOperation,
    HookOutputBlock,
    HookOutputKey,
    HookOutputSettings,
    HookPredicate,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.tests.factory import build_pipeline_with_blocks_and_content
from mage_ai.tests.shared.mixins import GlobalHooksMixin, build_content


class BaseOperationWithHooksTest(GlobalHooksMixin):
    model_class = Pipeline

    @classmethod
    def setUpClass(self):
        super().setUpClass()

        repo_config = get_repo_config()
        repo_config.save(features={
            FeatureUUID.GLOBAL_HOOKS.value: True,
        })

    def tearDown(self):
        file_path = GlobalHooks.file_path()
        if os.path.exists(file_path):
            os.remove(file_path)

        pipeline_uuids = Pipeline.get_all_pipelines(get_repo_path())
        for pipeline_uuid in pipeline_uuids:
            Pipeline.get(pipeline_uuid).delete()

    async def test_list(self):
        await self.setUpAsync(
            operation_type=HookOperation.LIST,
            pipeline_type=PipelineType.PYSPARK,
            predicates_match=[],
            predicates_miss=[],
        )

        pipeline3, _blocks = await build_pipeline_with_blocks_and_content(
            self,
            pipeline_type=PipelineType.STREAMING,
        )

        await build_pipeline_with_blocks_and_content(
            self,
            pipeline_type=PipelineType.PYTHON,
        )

        response = await self.build_list_operation().execute()

        pipelines = response['pipelines']

        self.assertEqual(len(pipelines), 3)

        for pipeline in [self.pipeline1, self.pipeline2, pipeline3]:
            self.assertIsNotNone(find(
                lambda x, pipeline=pipeline: x['uuid'] == pipeline.uuid,
                pipelines,
            ))

        self.assertEqual(
            response['metadata'],
            dict(
                powers=dict(fire=1),
                water=dict(level=2),
            ),
        )

    async def test_create(self):
        payload = dict(name=self.faker.unique.name(), type=PipelineType.STREAMING)
        name_final = self.faker.unique.name()

        await self.setUpAsync(
            block_settings={
                0: dict(content=build_content(dict(type=PipelineType.PYSPARK))),
                1: dict(content=build_content(dict(name=name_final))),
            },
            hook_settings=lambda data: {
                0: dict(
                    outputs=[
                        HookOutputSettings.load(
                            block=HookOutputBlock.load(uuid=data['blocks1'][0].uuid),
                            key=HookOutputKey.PAYLOAD,
                        ),
                        HookOutputSettings.load(
                            block=HookOutputBlock.load(uuid=data['blocks1'][1].uuid),
                            key=HookOutputKey.PAYLOAD,
                        ),
                    ],
                    pipeline=dict(
                        uuid=data['pipeline1'].uuid,
                    ),
                ),
            },
            operation_type=HookOperation.CREATE,
            predicates_match=[
                [
                    HookPredicate.load(resource=dict(
                        type=PipelineType.STREAMING.value,
                    )),
                ],
                [
                    HookPredicate.load(resource=dict(
                        name=name_final,
                    )),
                ],
            ],
            predicates_miss=[
                [
                    HookPredicate.load(resource=dict(
                        name=uuid.uuid4().hex,
                    )),
                ],
            ],
        )

        response = await self.build_create_operation(payload=payload).execute()
        pipeline = response['pipeline']
        self.assertEqual(pipeline['name'], name_final)
        self.assertEqual(pipeline['type'], PipelineType.PYSPARK.value)

        self.assertEqual(
            response['metadata'],
            dict(
                powers=dict(fire=1),
                water=dict(level=2),
            ),
        )

    # async def test_create_with_predicates(self):
    #     payload = dict(
    #         name=self.faker.unique.name(),
    #         type=self.pipeline.type,
    #     )

    #     await run_test_for_operation(
    #         self,
    #         HookOperation.CREATE,
    #         lambda: self.build_create_operation(payload),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #         matching_predicate_resource=payload,
    #     )

    # async def test_detail(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DETAIL,
    #         lambda: self.build_detail_operation(self.pipeline.uuid),
    #     )

    # async def test_detail_with_predicates(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DETAIL,
    #         lambda: self.build_detail_operation(self.pipeline.uuid),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #     )

    # async def test_update(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #     )

    # async def test_update_with_predicates(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #     )

    # async def test_update_anywhere(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE_ANYWHERE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #     )

    # async def test_update_anywhere_with_predicates(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE_ANYWHERE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #     )

    # async def test_delete(self):
    #     pipeline = create_pipeline_with_blocks(
    #         self.faker.unique.name(),
    #         self.repo_path,
    #     )

    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DELETE,
    #         lambda: self.build_delete_operation(pipeline.uuid),
    #     )

    # async def test_delete_with_predicates(self):
    #     pipeline = create_pipeline_with_blocks(
    #         self.faker.unique.name(),
    #         self.repo_path,
    #         pipeline_type=self.pipeline.type,
    #     )

    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DELETE,
    #         lambda: self.build_delete_operation(pipeline.uuid),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #         matching_predicate_resource=dict(
    #             name=pipeline.name,
    #         ),
    #     )
