import json
import uuid
from typing import Any, Dict, List, Tuple, Union

from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.global_hooks.constants import (
    PredicateObjectType,
    PredicateOperator,
    PredicateValueDataType,
)
from mage_ai.data_preparation.models.global_hooks.predicates import (
    HookPredicate,
    PredicateValueType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.array import find
from mage_ai.shared.hash import dig, ignore_keys, merge_dict, set_value
from mage_ai.tests.base_test import AsyncDBTestCase

first_object_key = 'first_object_key'
model = dict(power=100)
data_type_to_value_mapping = {
    PredicateValueDataType.BOOLEAN: True,
    PredicateValueDataType.DICTIONARY: model,
    PredicateValueDataType.FLOAT: 1.0,
    PredicateValueDataType.INTEGER: 3,
    PredicateValueDataType.LIST: [model],
    PredicateValueDataType.STRING: json.dumps(model),
}


def build_operation_resource_settings(
    left_value: Union[bool, Dict, float, int, List, str],
    first_object_key=first_object_key,
    repo_path: str = None,
) -> Dict:
    settings = {
        BaseResource.__name__: dict(
            left_object_keys=[first_object_key],
            operation_resource=GenericResource({
                first_object_key: left_value,
            }, None),
        ),
        dict.__name__: dict(
            left_object_keys=[first_object_key],
            operation_resource={
                first_object_key: left_value,
            },
        ),
        list.__name__: dict(
            left_object_keys=[0, first_object_key],
            operation_resource=[
                GenericResource({
                    first_object_key: left_value,
                }, None),
            ],
        ),
        Pipeline.__name__: dict(
            left_object_keys=['variables', first_object_key],
            operation_resource=Pipeline(uuid.uuid4().hex, config=dict(variables={
                first_object_key: left_value,
            })),
        ),
    }

    if repo_path:
        settings[Block.__name__] = dict(
            left_object_keys=['configuration', first_object_key],
            operation_resource=Block.create(
                uuid.uuid4().hex,
                BlockType.DATA_LOADER,
                repo_path,
                configuration={
                    first_object_key: left_value,
                },
            ),
        )

    return settings


class PredicatesTest(AsyncDBTestCase):
    def test_valid_predicates(self):
        pass

    def test_validate_operator_includes(self):
        value = uuid.uuid4().hex

        for right_value_data_type, right_value, right_value_not_included in [
            (
                PredicateValueDataType.BOOLEAN,
                True,
                False,
            ),
            (
                PredicateValueDataType.DICTIONARY,
                dict(mage=value),
                dict(mage=value, more=value),
            ),
            (
                PredicateValueDataType.FLOAT,
                1.0,
                3.0,
            ),
            (
                PredicateValueDataType.INTEGER,
                3,
                7,
            ),
            (
                PredicateValueDataType.LIST,
                [value],
                [value, value],
            ),
            (
                PredicateValueDataType.STRING,
                value,
                value + value,
            ),
        ]:
            for right_value_use, assertion_func in [
                (right_value, self.assertTrue),
                (right_value_not_included, self.assertFalse),
            ]:
                predicate = HookPredicate.load(
                    left_value=[right_value],
                    left_value_type=PredicateValueType.load(
                        value_data_type=PredicateValueDataType.LIST,
                        value_type=PredicateValueType.load(
                            value_data_type=right_value_data_type,
                        ),
                    ),
                    operator=PredicateOperator.INCLUDES,
                    right_value=right_value_use,
                    right_value_type=PredicateValueType.load(
                        value_data_type=right_value_data_type,
                    ),
                )

                assertion_func(predicate.validate(None))

    def test_validate_using_object_types(self):
        value = uuid.uuid4().hex

        left_object_keys = ['fire']
        left_value_type = PredicateValueType.load(
            value_data_type=PredicateValueDataType.STRING,
        )
        left_object = set_value({}, left_object_keys, value)

        operator = PredicateOperator.EQUALS
        right_object_keys = ['wind', 'level']
        right_value_type = left_value_type
        right_object = set_value({}, right_object_keys, value)

        object_types = [
            PredicateObjectType.ERROR,
            PredicateObjectType.HOOK,
            PredicateObjectType.META,
            PredicateObjectType.METADATA,
            PredicateObjectType.PAYLOAD,
            PredicateObjectType.QUERY,
            PredicateObjectType.RESOURCE,
            PredicateObjectType.RESOURCE_ID,
            PredicateObjectType.RESOURCE_PARENT_ID,
            PredicateObjectType.USER,
        ]
        for left_object_type in object_types:
            right_object_type = find(
                lambda x, left_object_type=left_object_type: x != left_object_type,
                object_types,
            )

            for right_value_use, assertion_func in [
                (value, self.assertTrue),
                (value + value, self.assertFalse),
            ]:
                right_object_use = set_value(
                    right_object,
                    right_object_keys,
                    right_value_use,
                )

                left_object_keys_use = left_object_keys
                left_object_use = left_object
                right_object_keys_use = right_object_keys
                right_object_use = right_object

                if left_object_type in [
                    PredicateObjectType.RESOURCE_ID,
                    PredicateObjectType.RESOURCE_PARENT_ID,
                ]:
                    left_object_use = dig(left_object_use, left_object_keys)
                    left_object_keys_use = None

                if right_object_type in [
                    PredicateObjectType.RESOURCE_ID,
                    PredicateObjectType.RESOURCE_PARENT_ID,
                ]:
                    right_object_use = dig(right_object_use, right_object_keys)
                    right_object_keys_use = None

                predicate = HookPredicate.load(
                    left_object_keys=left_object_keys_use,
                    left_object_type=left_object_type,
                    left_value_type=left_value_type,
                    operator=operator,
                    right_object_keys=right_object_keys_use,
                    right_object_type=right_object_type,
                    right_value_type=right_value_type,
                )

                settings = {
                    left_object_type.value: left_object_use,
                    right_object_type.value: right_object_use,
                }

                assertion_func(predicate.validate(None, **settings))

    def test_validate_using_operation_resource(self):
        left_value = uuid.uuid4().hex

        for operation_resource_class_name, settings in build_operation_resource_settings(
            left_value,
            repo_path=self.repo_path,
        ).items():
            left_object_keys = settings['left_object_keys']
            operation_resource = settings['operation_resource']

            for right_value_use, assertion_func in [
                (left_value, self.assertTrue),
                (left_value + left_value, self.assertFalse),
            ]:
                left_object_keys_use = left_object_keys
                if list.__name__ == operation_resource_class_name:
                    left_object_keys_use = left_object_keys[1:]

                predicate = HookPredicate.load(
                    left_object_keys=left_object_keys_use,
                    left_object_type=PredicateObjectType.OPERATION_RESOURCE,
                    left_value_type=PredicateValueType.load(
                        value_data_type=PredicateValueDataType.STRING,
                    ),
                    operator=PredicateOperator.EQUALS,
                    right_value=right_value_use,
                    right_value_type=PredicateValueType.load(
                        value_data_type=PredicateValueDataType.STRING,
                    ),
                )

                assertion_func(predicate.validate(operation_resource))

    def test_validate_multiple_operation_resources(self):
        value = uuid.uuid4().hex
        resource = dict(fire=value)

        operation_resources_groups = [
            (
                self.assertTrue,
                [resource, resource],
            ),
            (
                self.assertFalse,
                [resource, dict(fire=value + value)],
            ),
        ]

        for assertion_func, operation_resources in operation_resources_groups:
            predicate = HookPredicate.load(
                left_object_keys=['fire'],
                left_object_type=PredicateObjectType.OPERATION_RESOURCE,
                left_value_type=PredicateValueType.load(
                    value_data_type=PredicateValueDataType.STRING,
                ),
                operator=PredicateOperator.EQUALS,
                right_value=value,
                right_value_type=PredicateValueType.load(
                    value_data_type=PredicateValueDataType.STRING,
                ),
            )

            assertion_func(predicate.validate(operation_resources))


class CustomTestError(Exception):
    pass


def get_left_right_value(
    left_value: Union[bool, Dict, float, int, List, str],
    data_type: PredicateValueDataType,
    object_type: PredicateObjectType,
    operator: PredicateOperator,
) -> Tuple[Union[bool, Dict, float, int, List, str], Union[bool, Dict, float, int, List, str]]:
    if PredicateValueDataType.BOOLEAN == data_type:
        if PredicateOperator.EQUALS == operator:
            return (True, True)
        elif PredicateOperator.GREATER_THAN == operator:
            return (False, True)
        elif PredicateOperator.INCLUDES == operator:
            raise CustomTestError
        elif PredicateOperator.LESS_THAN == operator:
            return (True, False)
        elif PredicateOperator.NOT_EQUALS == operator:
            return (left_value, not left_value)
        elif PredicateOperator.NOT_INCLUDES == operator:
            raise CustomTestError
        elif PredicateOperator.NOT_PRESENT == operator:
            return (left_value, '')

    if PredicateValueDataType.DICTIONARY == data_type:
        if operator in [
            PredicateOperator.INCLUDES,
            PredicateOperator.NOT_INCLUDES,
        ]:
            raise CustomTestError

        if PredicateOperator.NOT_EQUALS == operator:
            return [left_value, merge_dict(left_value, dict(
                random=uuid.uuid4().hex,
            ))]

        if PredicateOperator.GREATER_THAN == operator:
            return (left_value, merge_dict(left_value, dict(
                random=uuid.uuid4().hex,
            )))

        if PredicateOperator.LESS_THAN == operator:
            return (merge_dict(left_value, dict(
                random=uuid.uuid4().hex,
            )), left_value)

        if PredicateOperator.NOT_PRESENT == operator:
            return (left_value, None)

    if data_type in [PredicateValueDataType.FLOAT, PredicateValueDataType.INTEGER]:
        if PredicateOperator.GREATER_THAN == operator:
            return (left_value, left_value + 1)
        elif PredicateOperator.INCLUDES == operator:
            raise CustomTestError
        elif PredicateOperator.LESS_THAN == operator:
            return (left_value + 1, left_value)
        elif PredicateOperator.NOT_EQUALS == operator:
            return (left_value, left_value - left_value)
        elif PredicateOperator.NOT_INCLUDES == operator:
            raise CustomTestError
        elif PredicateOperator.NOT_PRESENT == operator:
            return (left_value, None)

    if PredicateValueDataType.LIST == data_type:
        if operator in [
            PredicateOperator.INCLUDES,
            PredicateOperator.NOT_INCLUDES,
        ]:
            raise CustomTestError

        if PredicateOperator.NOT_EQUALS == operator:
            return (left_value, left_value + left_value)

        if PredicateOperator.GREATER_THAN == operator:
            return (left_value, left_value + left_value)

        if PredicateOperator.LESS_THAN == operator:
            return (left_value + left_value, left_value)

        if PredicateOperator.NOT_PRESENT == operator:
            return (left_value, None)

    if PredicateValueDataType.STRING == data_type:
        if PredicateOperator.NOT_EQUALS == operator:
            return (left_value, left_value + left_value)

        if PredicateOperator.GREATER_THAN == operator:
            return ('A', 'a')

        if PredicateOperator.LESS_THAN == operator:
            return ('a', 'A')

        if PredicateOperator.NOT_INCLUDES == operator:
            return (left_value, left_value + left_value)

        if PredicateOperator.NOT_PRESENT == operator:
            return (left_value, None)

    return (left_value, left_value)


def build_test_validate(
    data_type: PredicateValueDataType,
    left_value: Any,
    object_type: PredicateObjectType,
    operator: PredicateOperator,
    right_value: Any,
    settings: Dict,
):
    async def _test_validate(
        self,
        data_type=data_type,
        left_value=left_value,
        object_type=object_type,
        operator=operator,
        right_value=right_value,
        settings=settings,
    ):
        predicate = HookPredicate.load(
            left_object_keys=settings.get('left_object_keys'),
            left_object_type=object_type,
            left_value=left_value,
            left_value_type=PredicateValueType.load(
                value_data_type=data_type,
            ),
            operator=operator,
            right_value=right_value,
        )

        options = ignore_keys(settings, [
            'left_object_keys',
            'operation_resource',
        ])

        self.assertTrue(predicate.validate(
            settings['operation_resource'],
            **options,
        ))

    return _test_validate


for object_type in PredicateObjectType:
    for data_type in PredicateValueDataType:
        for operator in PredicateOperator:
            left_value = data_type_to_value_mapping[data_type]
            right_value = None

            try:
                left_value, right_value = get_left_right_value(
                    left_value,
                    data_type=data_type,
                    object_type=object_type,
                    operator=operator,
                )
            except CustomTestError:
                continue

            operation_resource_settings = {}
            for tup in build_operation_resource_settings(left_value).items():
                operation_resource_class_name, settings_init = tup
                settings = settings_init.copy()

                if object_type in [
                    PredicateObjectType.RESOURCE_ID,
                    PredicateObjectType.RESOURCE_PARENT_ID,
                ]:
                    settings.update({
                        'left_object_keys': None,
                        object_type.value: left_value,
                    })
                elif PredicateObjectType.OPERATION_RESOURCE != object_type:
                    settings.update({
                        'left_object_keys': [first_object_key],
                        object_type.value: {
                            first_object_key: left_value,
                        },
                    })
                elif list.__name__ == operation_resource_class_name and \
                        PredicateObjectType.OPERATION_RESOURCE == object_type:

                    settings.update(dict(left_object_keys=[first_object_key]))

                operation_resource_settings[operation_resource_class_name] = settings

            for operation_resource_class_name, settings in operation_resource_settings.items():
                method_name = '_'.join([
                    'test_validate',
                    'object_type',
                    object_type.value,
                    'data_type',
                    data_type.value,
                    'operator',
                    operator.value,
                    'operation_resource',
                    operation_resource_class_name,
                ])
                setattr(
                    PredicatesTest,
                    method_name,
                    build_test_validate(
                        data_type=data_type,
                        left_value=left_value,
                        object_type=object_type,
                        operator=operator,
                        right_value=right_value,
                        settings=settings,
                    ),
                )
