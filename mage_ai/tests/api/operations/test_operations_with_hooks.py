# import os
# import uuid

# from mage_ai.authentication.permissions.constants import EntityName
# from mage_ai.data_preparation.models.constants import BlockType, PipelineType
# from mage_ai.data_preparation.models.global_hooks.constants import (
#     HookOutputKey,
#     PredicateAndOrOperator,
#     PredicateObjectType,
#     PredicateOperator,
#     PredicateValueDataType,
# )
# from mage_ai.data_preparation.models.global_hooks.models import (
#     GlobalHooks,
#     HookCondition,
#     HookOperation,
#     HookOutputBlock,
#     HookOutputSettings,
#     HookStage,
# )
# from mage_ai.data_preparation.models.global_hooks.predicates import (
#     HookPredicate,
#     PredicateValueType,
# )
# from mage_ai.data_preparation.models.pipeline import Pipeline
# from mage_ai.data_preparation.models.project.constants import FeatureUUID
# from mage_ai.data_preparation.repo_manager import get_repo_config
# from mage_ai.shared.array import find
# from mage_ai.tests.factory import build_pipeline_with_blocks_and_content
# from mage_ai.tests.shared.mixins import GlobalHooksMixin, build_content


# class BaseOperationWithHooksTest(GlobalHooksMixin):
#     model_class = Pipeline

#     @classmethod
#     def setUpClass(self):
#         super().setUpClass()

#         repo_config = get_repo_config()
#         repo_config.save(features={
#             FeatureUUID.GLOBAL_HOOKS.value: True,
#         })

#     def tearDown(self):
#         file_path = GlobalHooks.file_path()
#         if os.path.exists(file_path):
#             os.remove(file_path)

#         if self.pipelines_created_for_testing:
#             for pipeline in self.pipelines_created_for_testing:
#                 try:
#                     pipeline.delete()
#                 except FileNotFoundError as err:
#                     print(err)

#     def build_predicates(self,
#         before_values,
#         after_values,
#         and_or_operator: PredicateAndOrOperator = None,
#     ):
#         predicate_match_before = HookPredicate.load(
#             and_or_operator=and_or_operator or PredicateAndOrOperator.AND,
#             predicates=[HookPredicate.load(
#                 left_object_keys=left_object_keys,
#                 left_object_type=left_object_type,
#                 left_value_type=PredicateValueType.load(
#                     value_data_type=PredicateValueDataType.STRING,
#                 ),
#                 operator=PredicateOperator.EQUALS,
#                 right_value=value,
#                 right_value_type=PredicateValueType.load(
#                     value_data_type=PredicateValueDataType.STRING,
#                 ),
#             ) for left_object_keys, left_object_type, value in before_values],
#         )

#         predicate_match_after = HookPredicate.load(
#             and_or_operator=and_or_operator or PredicateAndOrOperator.AND,
#             predicates=[HookPredicate.load(
#                 left_object_keys=left_object_keys,
#                 left_object_type=left_object_type,
#                 left_value_type=PredicateValueType.load(
#                     value_data_type=PredicateValueDataType.STRING,
#                 ),
#                 operator=PredicateOperator.EQUALS,
#                 right_value=value,
#                 right_value_type=PredicateValueType.load(
#                     value_data_type=PredicateValueDataType.STRING,
#                 ),
#             ) for left_object_keys, left_object_type, value in after_values],
#         )

#         predicate_miss = HookPredicate.load(
#             and_or_operator=and_or_operator or PredicateAndOrOperator.AND,
#             predicates=[
#                 HookPredicate.load(
#                     left_value=uuid.uuid4().hex,
#                     left_value_type=PredicateValueType.load(
#                         value_data_type=PredicateValueDataType.STRING,
#                     ),
#                     operator=PredicateOperator.EQUALS,
#                     right_value=uuid.uuid4().hex,
#                     right_value_type=PredicateValueType.load(
#                         value_data_type=PredicateValueDataType.STRING,
#                     ),
#                 ),
#             ],
#         )

#         return predicate_match_before, predicate_match_after, predicate_miss

#     async def test_list(self):
#         await self.setUpAsync(
#             block_settings={
#                 0: dict(content=build_content({
#                     'type[]': [PipelineType.PYTHON],
#                 })),
#             },
#             operation_type=HookOperation.LIST,
#             pipeline_type=PipelineType.PYTHON,
#             predicate_match=None,
#             predicate_miss=None,
#         )

#         pipeline3, _blocks = await build_pipeline_with_blocks_and_content(
#             self,
#             pipeline_type=PipelineType.INTEGRATION,
#         )

#         await build_pipeline_with_blocks_and_content(
#             self,
#             pipeline_type=PipelineType.STREAMING,
#         )

#         response = await self.build_list_operation().execute()

#         pipelines = response['pipelines']

#         self.assertEqual(len(pipelines), 3)

#         for pipeline in [self.pipeline1, self.pipeline2, pipeline3]:
#             self.assertIsNotNone(find(
#                 lambda x, pipeline=pipeline: x['uuid'] == pipeline.uuid,
#                 pipelines,
#             ))

#         self.assertEqual(
#             response['metadata'],
#             dict(
#                 powers=dict(fire=1),
#                 water=dict(level=2),
#             ),
#         )

#     async def test_list_without_hook_snapshot(self):
#         await self.setUpAsync(
#             block_settings={
#                 0: dict(content=build_content({
#                     'type[]': [PipelineType.PYTHON],
#                 })),
#             },
#             operation_type=HookOperation.LIST,
#             pipeline_type=PipelineType.PYTHON,
#             predicate_match=None,
#             predicate_miss=None,
#             snapshot=False,
#         )

#         pipeline3, _blocks = await build_pipeline_with_blocks_and_content(
#             self,
#             pipeline_type=PipelineType.INTEGRATION,
#         )

#         await build_pipeline_with_blocks_and_content(
#             self,
#             pipeline_type=PipelineType.STREAMING,
#         )

#         response = await self.build_list_operation().execute()

#         pipelines = response['pipelines']

#         self.assertEqual(len(pipelines), 4)

#         for pipeline in [self.pipeline1, self.pipeline2, pipeline3]:
#             self.assertIsNotNone(find(
#                 lambda x, pipeline=pipeline: x['uuid'] == pipeline.uuid,
#                 pipelines,
#             ))

#         self.assertNotEqual(
#             response['metadata'],
#             dict(
#                 powers=dict(fire=1),
#                 water=dict(level=2),
#             ),
#         )

#     async def test_create(self):
#         payload = dict(name=self.faker.unique.name(), type=PipelineType.STREAMING)
#         name_final = self.faker.unique.name()

#         predicate_match_before, predicate_match_after, predicate_miss = self.build_predicates(
#             before_values=[
#                 (['type'], PredicateObjectType.PAYLOAD, payload['type'].value),
#                 (['name'], PredicateObjectType.PAYLOAD, payload['name']),
#             ],
#             after_values=[
#                 (['type'], PredicateObjectType.RESOURCE, PipelineType.INTEGRATION.value),
#                 (['name'], PredicateObjectType.RESOURCE, name_final),
#             ],
#         )

#         await self.setUpAsync(
#             block_settings={
#                 0: dict(content=build_content(dict(type=PipelineType.INTEGRATION))),
#                 1: dict(content=build_content(dict(name=name_final))),
#             },
#             hook_settings=lambda data: {
#                 0: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][0].uuid),
#                             key=HookOutputKey.PAYLOAD,
#                         ),
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][1].uuid),
#                             key=HookOutputKey.PAYLOAD,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#             },
#             operation_type=HookOperation.CREATE,
#             predicate_match_before=predicate_match_before,
#             predicate_match_after=predicate_match_after,
#             predicate_miss=predicate_miss,
#         )

#         response = await self.build_create_operation(payload=payload).execute()
#         pipeline = response['pipeline']
#         self.assertEqual(pipeline['name'], name_final)
#         self.assertEqual(pipeline['type'], PipelineType.INTEGRATION.value)

#         self.assertEqual(
#             response['metadata'],
#             dict(
#                 powers=dict(fire=1),
#                 water=dict(level=2),
#             ),
#         )

#         Pipeline.get(pipeline['uuid']).delete()

#     async def test_detail(self):
#         name_final = self.faker.unique.name()

#         predicate_match_before, predicate_match_after, predicate_miss = self.build_predicates(
#             before_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, PipelineType.PYTHON.value),
#             ],
#             after_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, PipelineType.PYTHON.value),
#             ],
#         )

#         await self.setUpAsync(
#             block_settings={
#                 0: dict(content=build_content(dict())),
#                 1: dict(content=build_content(dict())),
#                 2: dict(content=build_content(dict(
#                     name=name_final,
#                     type=PipelineType.INTEGRATION,
#                 ))),
#             },
#             hook_settings=lambda data: {
#                 2: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][2].uuid),
#                             key=HookOutputKey.RESOURCE,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#                 3: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks2'][3].uuid),
#                             key=HookOutputKey.METADATA,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline2'].uuid,
#                     ),
#                 ),
#             },
#             operation_type=HookOperation.DETAIL,
#             pipeline_type=PipelineType.PYTHON.value,
#             predicate_match_before=predicate_match_before,
#             predicate_match_after=predicate_match_after,
#             predicate_miss=predicate_miss,
#         )

#         response = await self.build_detail_operation(self.pipeline2.uuid).execute()
#         pipeline = response['pipeline']
#         self.assertEqual(pipeline['name'], name_final)
#         self.assertEqual(pipeline['type'], PipelineType.INTEGRATION.value)

#         self.assertEqual(
#             response['metadata'],
#             dict(level=2),
#         )

#     async def test_update(self):
#         description_init = self.faker.unique.name()
#         description_final = self.faker.unique.name()
#         tags_init = ['fire']
#         tags_final = ['water']
#         uuid_final = self.faker.unique.name()

#         payload = dict(description=description_init, tags=tags_init)

#         predicate_match_before, predicate_match_after, predicate_miss = self.build_predicates(
#             before_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, PipelineType.PYTHON.value),
#             ],
#             after_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, PipelineType.PYTHON.value),
#             ],
#         )

#         await self.setUpAsync(
#             block_settings={
#                 0: dict(content=build_content(dict(
#                     description=description_final,
#                 ))),
#                 1: dict(content=build_content(dict(
#                     tags=tags_final,
#                 ))),
#                 2: dict(content=build_content(dict(
#                     uuid=uuid_final,
#                 ))),
#             },
#             hook_settings=lambda data: {
#                 0: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][0].uuid),
#                             key=HookOutputKey.PAYLOAD,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#                 1: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][1].uuid),
#                             key=HookOutputKey.PAYLOAD,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#                 2: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][2].uuid),
#                             key=HookOutputKey.RESOURCE,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#                 3: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks2'][3].uuid),
#                             key=HookOutputKey.METADATA,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline2'].uuid,
#                     ),
#                 ),
#             },
#             operation_type=HookOperation.UPDATE,
#             pipeline_type=PipelineType.PYTHON.value,
#             predicate_match_before=predicate_match_before,
#             predicate_match_after=predicate_match_after,
#             predicate_miss=predicate_miss,
#         )

#         response = await self.build_update_operation(
#             self.pipeline2.uuid,
#             payload=dict(pipeline=payload),
#         ).execute()
#         pipeline = response['pipeline']
#         self.assertEqual(pipeline['description'], description_final)
#         self.assertEqual(pipeline['tags'], ['water'])
#         self.assertEqual(pipeline['uuid'], uuid_final)

#         self.assertEqual(
#             response['metadata'],
#             dict(level=2),
#         )

#     async def test_delete(self):
#         name_final = uuid.uuid4().hex
#         uuid_final = uuid.uuid4().hex

#         predicate_match_before, predicate_match_after, predicate_miss = self.build_predicates(
#             before_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, PipelineType.PYTHON.value),
#             ],
#             after_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, PipelineType.PYTHON.value),
#             ],
#         )

#         await self.setUpAsync(
#             block_settings={
#                 0: dict(content=build_content(dict(
#                     name=name_final,
#                 ))),
#                 1: dict(content=build_content(dict(
#                     name='should not be this value because hook1 only runs on failure condition',
#                 ))),
#                 2: dict(content=build_content(dict(
#                     uuid=uuid_final,
#                 ))),
#             },
#             hook_settings=lambda data: {
#                 0: dict(
#                     conditions=[HookCondition.SUCCESS, HookCondition.FAILURE],
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][0].uuid),
#                             key=HookOutputKey.RESOURCE,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                     stages=[HookStage.BEFORE, HookStage.AFTER],
#                 ),
#                 1: dict(
#                     conditions=[HookCondition.FAILURE],
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][1].uuid),
#                             key=HookOutputKey.RESOURCE,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                     stages=[HookStage.BEFORE, HookStage.AFTER],
#                 ),
#                 2: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][2].uuid),
#                             key=HookOutputKey.RESOURCE,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#                 3: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][3].uuid),
#                             key=HookOutputKey.METADATA,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#             },
#             operation_type=HookOperation.DELETE,
#             pipeline_type=PipelineType.PYTHON.value,
#             predicate_match_before=predicate_match_before,
#             predicate_match_after=predicate_match_after,
#             predicate_miss=predicate_miss,
#         )

#         response = await self.build_delete_operation(self.pipeline2.uuid).execute()
#         pipeline = response['pipeline']
#         self.assertEqual(pipeline['name'], name_final)
#         self.assertEqual(pipeline['uuid'], uuid_final)

#         self.assertEqual(
#             response['metadata'],
#             dict(level=2),
#         )

#         error = False
#         try:
#             Pipeline.get(self.pipeline2.uuid)
#         except Exception:
#             error = True
#         self.assertTrue(error)

#     async def test_update_pipeline_blocks(self):
#         color = uuid.uuid4().hex
#         configuration = dict(power=uuid.uuid4().hex)

#         predicate_match_before, predicate_match_after, predicate_miss = self.build_predicates(
#             before_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, BlockType.DATA_LOADER.value),
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, BlockType.TRANSFORMER.value),
#             ],
#             after_values=[
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, BlockType.DATA_LOADER.value),
#                 (['type'], PredicateObjectType.OPERATION_RESOURCE, BlockType.TRANSFORMER.value),
#             ],
#             and_or_operator=PredicateAndOrOperator.OR,
#         )

#         await self.setUpAsync(
#             block_settings={
#                 0: dict(content=build_content(dict(
#                     color=color,
#                 ))),
#                 1: dict(content=build_content(dict(
#                     configuration=configuration,
#                 ))),
#                 2: dict(
#                     content=build_content(dict()),
#                     block_type=BlockType.DATA_EXPORTER.value,
#                 ),
#             },
#             hook_settings=lambda data: {
#                 0: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][0].uuid),
#                             key=HookOutputKey.PAYLOAD,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#                 1: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][1].uuid),
#                             key=HookOutputKey.PAYLOAD,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                 ),
#                 2: dict(
#                     outputs=[
#                         HookOutputSettings.load(
#                             block=HookOutputBlock.load(uuid=data['blocks1'][2].uuid),
#                             key=HookOutputKey.PAYLOAD,
#                         ),
#                     ],
#                     pipeline=dict(
#                         uuid=data['pipeline1'].uuid,
#                     ),
#                     stages=[HookStage.BEFORE],
#                 ),
#             },
#             operation_type=HookOperation.UPDATE_ANYWHERE,
#             pipeline_type=PipelineType.PYTHON.value,
#             predicate_match_before=predicate_match_before,
#             predicate_match_after=predicate_match_after,
#             predicate_miss=predicate_miss,
#             resource_type=EntityName.Block,
#         )

#         blocks = []
#         for block in self.pipeline2.blocks_by_uuid.values():
#             data = block.to_dict()
#             data['color'] = 'should not be this unless data exporter'
#             data['configuration'] = dict(power='should not be this unless data exporter')
#             blocks.append(data)

#         payload = dict(blocks=blocks)

#         response = await self.build_update_operation(
#             self.pipeline2.uuid,
#             payload=dict(pipeline=payload),
#             query=dict(
#                 update_content=[True],
#             ),
#         ).execute()
#         pipeline = response['pipeline']
#         blocks_from_response = pipeline['blocks']

#         block21, block22, block23, block24 = self.blocks2
#         for block in [block21, block22, block24]:
#             block_from_response = find(
#                 lambda x, block=block: x['uuid'] == block.uuid,
#                 blocks_from_response,
#             )
#             self.assertEqual(block_from_response['color'], color)
#             self.assertEqual(block_from_response['configuration'], configuration)

#         block_from_response = find(
#             lambda x: x['uuid'] == block23.uuid,
#             blocks_from_response,
#         )
#         self.assertEqual(block_from_response['color'], blocks[2]['color'])
#         self.assertEqual(block_from_response['configuration'], blocks[2]['configuration'])
