import json
import random
import uuid
from typing import Any, Dict, List, Tuple, Union

from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.global_hooks.constants import (
    PredicateAndOrOperator,
    PredicateObjectType,
    PredicateOperator,
    PredicateValueDataType,
)
from mage_ai.data_preparation.models.global_hooks.predicates import (
    HookPredicate,
    PredicateValueType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.settings.repo import get_repo_path
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
    right_value: Union[bool, Dict, float, int, List, str],
    first_object_key=first_object_key,
    repo_path: str = None,
) -> Dict:
    repo_path = repo_path or get_repo_path()
    settings = {
        BaseResource.__name__: dict(
            right_object_keys=[first_object_key],
            operation_resource=GenericResource({
                first_object_key: right_value,
            }, None),
        ),
        dict.__name__: dict(
            right_object_keys=[first_object_key],
            operation_resource={
                first_object_key: right_value,
            },
        ),
        list.__name__: dict(
            right_object_keys=[0, first_object_key],
            operation_resource=[
                GenericResource({
                    first_object_key: right_value,
                }, None),
            ],
        ),
        Pipeline.__name__: dict(
            right_object_keys=['variables', first_object_key],
            operation_resource=Pipeline(
                uuid.uuid4().hex,
                config=dict(variables={
                    first_object_key: right_value,
                }),
                repo_path=repo_path,
            ),
        ),
    }

    if repo_path:
        settings[Block.__name__] = dict(
            right_object_keys=['configuration', first_object_key],
            operation_resource=Block.create(
                uuid.uuid4().hex,
                BlockType.DATA_LOADER,
                repo_path,
                configuration={
                    first_object_key: right_value,
                },
            ),
        )

    return settings


class PredicatesTest(AsyncDBTestCase):
    def test_validate_operator_includes(self):
        value = uuid.uuid4().hex

        for left_value_data_type, left_value, left_value_not_included in [
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
            for left_value_use, assertion_func in [
                (left_value, self.assertTrue),
                (left_value_not_included, self.assertFalse),
            ]:
                predicate = HookPredicate.load(
                    right_value=[left_value],
                    right_value_type=PredicateValueType.load(
                        value_data_type=PredicateValueDataType.LIST,
                        value_type=PredicateValueType.load(
                            value_data_type=left_value_data_type,
                        ),
                    ),
                    operator=PredicateOperator.INCLUDES,
                    left_value=left_value_use,
                    left_value_type=PredicateValueType.load(
                        value_data_type=left_value_data_type,
                    ),
                )

                assertion_func(predicate.validate(None))

    def test_validate_using_object_types(self):
        value = uuid.uuid4().hex

        right_object_keys = ['fire']
        right_value_type = PredicateValueType.load(
            value_data_type=PredicateValueDataType.STRING,
        )
        right_object = set_value({}, right_object_keys, value)

        operator = PredicateOperator.EQUALS
        left_object_keys = ['wind', 'level']
        left_value_type = right_value_type
        left_object = set_value({}, left_object_keys, value)

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
        for right_object_type in object_types:
            left_object_type = find(
                lambda x, right_object_type=right_object_type: x != right_object_type,
                object_types,
            )

            for left_value_use, assertion_func in [
                (value, self.assertTrue),
                (value + value, self.assertFalse),
            ]:
                left_object_use = set_value(
                    left_object,
                    left_object_keys,
                    left_value_use,
                )

                right_object_keys_use = right_object_keys
                right_object_use = right_object
                left_object_keys_use = left_object_keys
                left_object_use = left_object

                if right_object_type in [
                    PredicateObjectType.RESOURCE_ID,
                    PredicateObjectType.RESOURCE_PARENT_ID,
                ]:
                    right_object_use = dig(right_object_use, right_object_keys)
                    right_object_keys_use = None

                if left_object_type in [
                    PredicateObjectType.RESOURCE_ID,
                    PredicateObjectType.RESOURCE_PARENT_ID,
                ]:
                    left_object_use = dig(left_object_use, left_object_keys)
                    left_object_keys_use = None

                predicate = HookPredicate.load(
                    right_object_keys=right_object_keys_use,
                    right_object_type=right_object_type,
                    right_value_type=right_value_type,
                    operator=operator,
                    left_object_keys=left_object_keys_use,
                    left_object_type=left_object_type,
                    left_value_type=left_value_type,
                )

                settings = {
                    right_object_type.value: right_object_use,
                    left_object_type.value: left_object_use,
                }

                assertion_func(predicate.validate(None, **settings))

    def test_validate_using_operation_resource(self):
        right_value = uuid.uuid4().hex

        for operation_resource_class_name, settings in build_operation_resource_settings(
            right_value,
            repo_path=self.repo_path,
        ).items():
            right_object_keys = settings['right_object_keys']
            operation_resource = settings['operation_resource']

            for left_value_use, assertion_func in [
                (right_value, self.assertTrue),
                (right_value + right_value, self.assertFalse),
            ]:
                right_object_keys_use = right_object_keys
                if list.__name__ == operation_resource_class_name:
                    right_object_keys_use = right_object_keys[1:]

                predicate = HookPredicate.load(
                    right_object_keys=right_object_keys_use,
                    right_object_type=PredicateObjectType.OPERATION_RESOURCE,
                    right_value_type=PredicateValueType.load(
                        value_data_type=PredicateValueDataType.STRING,
                    ),
                    operator=PredicateOperator.EQUALS,
                    left_value=left_value_use,
                    left_value_type=PredicateValueType.load(
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
                right_object_keys=['fire'],
                right_object_type=PredicateObjectType.OPERATION_RESOURCE,
                right_value_type=PredicateValueType.load(
                    value_data_type=PredicateValueDataType.STRING,
                ),
                operator=PredicateOperator.EQUALS,
                left_value=value,
                left_value_type=PredicateValueType.load(
                    value_data_type=PredicateValueDataType.STRING,
                ),
            )

            assertion_func(predicate.validate(operation_resources))

    def test_validate_with_nested_predicates(self):
        (
            operation_resource,
            predicate,
            predicates_level_1,
            predicates_level_2,
            predicates_level_3,
        ) = build_nested_predicates()

        for pred_dicts in [
            predicates_level_1,
            predicates_level_2,
            predicates_level_3,
        ]:
            for key, arr in pred_dicts.items():
                for predicate_inner in arr:
                    assertion_func = self.assertTrue if 'succeed' == key else self.assertFalse

                    for predicate_inner in arr:
                        assertion_func(predicate_inner.validate(operation_resource))

        self.assertTrue(predicate.validate(operation_resource))

    def test_validate_with_nested_predicates_other_combinations(self):
        (
            operation_resource,
            predicate,
            predicates_level_1,
            predicates_level_2,
            predicates_level_3,
        ) = build_nested_predicates()

        predicates_failed = []
        predicates_succeed = [predicate]

        for pred_dict in [
            predicates_level_1,
            predicates_level_2,
            predicates_level_3,
        ]:
            predicates_failed.extend(pred_dict['failed'])
            predicates_succeed.extend(pred_dict['succeed'])

        predicates_failed_count = len(predicates_failed)
        predicates_succeed_count = len(predicates_succeed)
        predicates_count = predicates_failed_count + predicates_succeed_count

        def _get_and_or_operator() -> PredicateAndOrOperator:
            return random.choice([v for v in PredicateAndOrOperator])

        def _get_predicates(
            operator: PredicateAndOrOperator,
            force_failure: bool = False,
            predicates_failed=predicates_failed,
            predicates_succeed=predicates_succeed,
            predicates_succeed_count=predicates_succeed_count,
        ) -> List[HookPredicate]:
            failed_sample = 0
            succeed_sample = random.randint(1, predicates_succeed_count)

            if PredicateAndOrOperator.OR == operator or force_failure:
                failed_sample = random.randint(1, predicates_failed_count)

            arr_failed = random.sample(predicates_failed, failed_sample)
            arr_succeed = random.sample(predicates_succeed, succeed_sample)

            if force_failure:
                return arr_failed

            return arr_failed + arr_succeed

        levels = 10

        def _build_all(
            # force_failure_at_level: int = None,
            levels=levels,
            predicates_count=predicates_count,
            get_and_or_operator=_get_and_or_operator,
            get_predicates=_get_predicates,
        ) -> List[List[HookPredicate]]:
            predicates_in_reverse_level_order = []
            for i1 in range(levels):
                row = []
                predicates_to_create_at_this_level = random.randint(
                    predicates_count - i1, predicates_count,
                )
                for _i2 in range(predicates_to_create_at_this_level):
                    operator = get_and_or_operator()
                    predicates = get_predicates(
                        operator,
                        # force_failure=(
                        #     force_failure_at_level is not None and
                        #     force_failure_at_level == levels - i1
                        # ),
                    )

                    pred = HookPredicate.load(
                        and_or_operator=operator,
                        predicates=predicates,
                    )
                    row.append(pred)

                if i1 >= 1:
                    previous_row = predicates_in_reverse_level_order[i1 - 1]
                    batch_count = round(len(previous_row) / len(row))

                    for idx, pred in enumerate(row):
                        start_index = idx * batch_count
                        end_index = (idx + 1) * batch_count
                        pred.predicates += previous_row[start_index:end_index]

                predicates_in_reverse_level_order.append(row)

            return predicates_in_reverse_level_order

        all_succeed = _build_all()

        for i in range(levels):
            level_to_run = levels - (i + 1)
            for predicate0 in all_succeed[level_to_run]:
                self.assertTrue(predicate0.validate(operation_resource))


class CustomTestError(Exception):
    pass


def get_right_left_value(
    right_value: Union[bool, Dict, float, int, List, str],
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
            return (right_value, not right_value)
        elif PredicateOperator.NOT_INCLUDES == operator:
            raise CustomTestError
        elif PredicateOperator.NOT_PRESENT == operator:
            return (right_value, '')

    if PredicateValueDataType.DICTIONARY == data_type:
        if operator in [
            PredicateOperator.INCLUDES,
            PredicateOperator.NOT_INCLUDES,
        ]:
            raise CustomTestError

        if PredicateOperator.NOT_EQUALS == operator:
            return [right_value, merge_dict(right_value, dict(
                random=uuid.uuid4().hex,
            ))]

        if PredicateOperator.GREATER_THAN == operator:
            return (right_value, merge_dict(right_value, dict(
                random=uuid.uuid4().hex,
            )))

        if PredicateOperator.LESS_THAN == operator:
            return (merge_dict(right_value, dict(
                random=uuid.uuid4().hex,
            )), right_value)

        if PredicateOperator.NOT_PRESENT == operator:
            return (right_value, None)

    if data_type in [PredicateValueDataType.FLOAT, PredicateValueDataType.INTEGER]:
        if PredicateOperator.GREATER_THAN == operator:
            return (right_value, right_value + 1)
        elif PredicateOperator.INCLUDES == operator:
            raise CustomTestError
        elif PredicateOperator.LESS_THAN == operator:
            return (right_value + 1, right_value)
        elif PredicateOperator.NOT_EQUALS == operator:
            return (right_value, right_value - right_value)
        elif PredicateOperator.NOT_INCLUDES == operator:
            raise CustomTestError
        elif PredicateOperator.NOT_PRESENT == operator:
            return (right_value, None)

    if PredicateValueDataType.LIST == data_type:
        if operator in [
            PredicateOperator.INCLUDES,
            PredicateOperator.NOT_INCLUDES,
        ]:
            raise CustomTestError

        if PredicateOperator.NOT_EQUALS == operator:
            return (right_value, right_value + right_value)

        if PredicateOperator.GREATER_THAN == operator:
            return (right_value, right_value + right_value)

        if PredicateOperator.LESS_THAN == operator:
            return (right_value + right_value, right_value)

        if PredicateOperator.NOT_PRESENT == operator:
            return (right_value, None)

    if PredicateValueDataType.STRING == data_type:
        if PredicateOperator.NOT_EQUALS == operator:
            return (right_value, right_value + right_value)

        if PredicateOperator.GREATER_THAN == operator:
            return ('A', 'a')

        if PredicateOperator.LESS_THAN == operator:
            return ('a', 'A')

        if PredicateOperator.NOT_INCLUDES == operator:
            return (right_value, right_value + right_value)

        if PredicateOperator.NOT_PRESENT == operator:
            return (right_value, None)

    return (right_value, right_value)


def build_test_validate(
    data_type: PredicateValueDataType,
    right_value: Any,
    object_type: PredicateObjectType,
    operator: PredicateOperator,
    left_value: Any,
    settings: Dict,
):
    async def _test_validate(
        self,
        data_type=data_type,
        right_value=right_value,
        object_type=object_type,
        operator=operator,
        left_value=left_value,
        settings=settings,
    ):
        predicate = HookPredicate.load(
            right_object_keys=settings.get('right_object_keys'),
            right_object_type=object_type,
            right_value=right_value,
            right_value_type=PredicateValueType.load(
                value_data_type=data_type,
            ),
            operator=operator,
            left_value=left_value,
        )

        options = ignore_keys(settings, [
            'right_object_keys',
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
            right_value = data_type_to_value_mapping[data_type]
            left_value = None

            try:
                right_value, left_value = get_right_left_value(
                    right_value,
                    data_type=data_type,
                    object_type=object_type,
                    operator=operator,
                )
            except CustomTestError:
                continue

            operation_resource_settings = {}
            for tup in build_operation_resource_settings(right_value).items():
                operation_resource_class_name, settings_init = tup
                settings = settings_init.copy()

                if object_type in [
                    PredicateObjectType.RESOURCE_ID,
                    PredicateObjectType.RESOURCE_PARENT_ID,
                ]:
                    settings.update({
                        'right_object_keys': None,
                        object_type.value: right_value,
                    })
                elif PredicateObjectType.OPERATION_RESOURCE != object_type:
                    settings.update({
                        'right_object_keys': [first_object_key],
                        object_type.value: {
                            first_object_key: right_value,
                        },
                    })
                elif list.__name__ == operation_resource_class_name and \
                        PredicateObjectType.OPERATION_RESOURCE == object_type:

                    settings.update(dict(right_object_keys=[first_object_key]))

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
                        right_value=right_value,
                        object_type=object_type,
                        operator=operator,
                        left_value=left_value,
                        settings=settings,
                    ),
                )


def build_nested_predicates() -> Tuple[Dict, HookPredicate, Dict, Dict, Dict]:
    operation_resource = dict(
        earth=1,
        fire=2,
        ice=[3],
        laser=4,
        lightning=5,
        power=6,
        water=7,
        wind=8,
    )

    def _build_settings(**kwargs) -> Dict:
        right_value_type = PredicateValueType.load(
            value_data_type=PredicateValueDataType.INTEGER,
        )

        return merge_dict(dict(
            right_object_type=PredicateObjectType.OPERATION_RESOURCE,
            right_value_type=right_value_type,
            operator=PredicateOperator.EQUALS,
            left_value_type=right_value_type,
        ), kwargs)

    predicate2_3_or_or_terminal_failed = HookPredicate.load(**_build_settings(
        right_object_type=None,
        right_value_type=None,
        operator=PredicateOperator.PRESENT,
        left_value=None,
        left_value_type=None,
    ))

    predicate2_3_and_and_and_terminal_failed = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.AND,
        right_object_keys=['ice'],
        right_value_type=PredicateValueType.load(
            value_data_type=PredicateValueDataType.LIST,
            value_type=PredicateValueType.load(
                value_data_type=PredicateValueDataType.INTEGER,
            ),
        ),
        operator=PredicateOperator.NOT_INCLUDES,
        left_value=3,
    ))

    predicate2_3_or_or_terminal_succeed = HookPredicate.load(**_build_settings(
        right_object_keys=['power'],
        operator=PredicateOperator.GREATER_THAN_OR_EQUALS,
        left_value=6
    ))

    predicate2_3_and_and_or_terminal_succeed = HookPredicate.load(**_build_settings(
        right_object_keys=['water'],
        operator=PredicateOperator.LESS_THAN_OR_EQUALS,
        left_value=6,
    ))

    predicate2_and_and_succeed = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.AND,
        right_object_keys=['wind'],
        operator=PredicateOperator.LESS_THAN_OR_EQUALS,
        predicates=[
            predicate2_3_and_and_or_terminal_succeed,
            predicate2_3_or_or_terminal_succeed,
        ],
        left_value=8,
    ))

    predicate2_and_or_succeed = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.OR,
        right_object_keys=['water'],
        operator=PredicateOperator.NOT_EQUALS,
        predicates=[
            predicate2_3_and_and_or_terminal_succeed,
        ],
        left_value=8,
    ))

    predicate2_or_and_failed = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.AND,
        right_object_keys=['ice'],
        right_value_type=PredicateValueType.load(
            value_data_type=PredicateValueDataType.LIST,
            value_type=PredicateValueType.load(
                value_data_type=PredicateValueDataType.INTEGER,
            ),
        ),
        operator=PredicateOperator.INCLUDES,
        predicates=[
            predicate2_3_and_and_and_terminal_failed,
            predicate2_3_and_and_or_terminal_succeed,
        ],
        left_value=3,
    ))

    predicate2_or_or_succeed = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.OR,
        right_value_type=None,
        operator=PredicateOperator.NOT_PRESENT,
        predicates=[
            predicate2_3_or_or_terminal_failed,
            predicate2_3_or_or_terminal_succeed,
        ],
        left_value=None,
        left_value_type=None,
    ))

    predicate1_and_succeed = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.AND,
        right_object_keys=['ice'],
        right_value_type=PredicateValueType.load(
            value_data_type=PredicateValueDataType.LIST,
            value_type=PredicateValueType.load(
                value_data_type=PredicateValueDataType.INTEGER,
            ),
        ),
        operator=PredicateOperator.INCLUDES,
        predicates=[
            predicate2_and_and_succeed,
            predicate2_and_or_succeed,
        ],
        left_value=3,
    ))

    predicate1_or_succeed = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.OR,
        right_object_keys=['fire'],
        operator=PredicateOperator.GREATER_THAN,
        predicates=[
            predicate2_or_and_failed,
            predicate2_or_or_succeed,
        ],
        left_value=3,
    ))

    predicates_level_3 = dict(
        failed=[
            predicate2_3_and_and_and_terminal_failed,
            predicate2_3_or_or_terminal_failed,
        ],
        succeed=[
            predicate2_3_and_and_or_terminal_succeed,
            predicate2_3_or_or_terminal_succeed,
        ],
    )

    predicates_level_2 = dict(
        failed=[
            predicate2_or_and_failed,
        ],
        succeed=[
            predicate2_and_and_succeed,
            predicate2_and_or_succeed,
            predicate2_or_or_succeed,
        ],
    )

    predicates_level_1 = dict(
        failed=[],
        succeed=[
            predicate1_and_succeed,
            predicate1_or_succeed,
        ],
    )

    predicate = HookPredicate.load(**_build_settings(
        and_or_operator=PredicateAndOrOperator.AND,
        right_object_keys=['earth'],
        predicates=[
            predicate1_and_succeed,
            predicate1_or_succeed,
        ],
        left_value=1,
    ))

    return (
        operation_resource,
        predicate,
        predicates_level_1,
        predicates_level_2,
        predicates_level_3,
    )
