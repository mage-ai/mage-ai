import json
import uuid
from typing import Dict, List, Tuple, Union

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
from mage_ai.shared.hash import ignore_keys

# from mage_ai.shared.models import BaseDataClass
from mage_ai.tests.base_test import AsyncDBTestCase


class CustomTestError(Exception):
    pass


def get_left_right_value(
    left_value: Union[bool, Dict, float, int, List, str],
    data_type: PredicateValueDataType,
    object_type: PredicateObjectType,
    operator: PredicateOperator,
) -> Tuple[Union[bool, Dict, float, int, List, str], Union[bool, Dict, float, int, List, str]]:
    # EQUALS
    # GREATER_THAN
    # GREATER_THAN_OR_EQUALS
    # INCLUDES
    # LESS_THAN
    # LESS_THAN_OR_EQUALS
    # NOT_EQUALS
    # NOT_INCLUDES
    # NOT_PRESENT
    # PRESENT

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
        pass

    if PredicateValueDataType.FLOAT == data_type:
        pass

    if PredicateValueDataType.INTEGER == data_type:
        pass

    if PredicateValueDataType.LIST == data_type:
        pass

    if PredicateValueDataType.STRING == data_type:
        pass

    return (left_value, left_value)


class PredicatesTest(AsyncDBTestCase):
    def test_valid_predicates(self):
        pass

    def test_validate_with_no_child_predicates(self):
        first_object_key = 'first_object_key'
        right_value = 100
        model = dict(power=right_value)

        data_type_to_value_mapping = {
            PredicateValueDataType.BOOLEAN: True,
            PredicateValueDataType.DICTIONARY: model,
            PredicateValueDataType.FLOAT: 1.0,
            PredicateValueDataType.INTEGER: 3,
            PredicateValueDataType.LIST: [model],
            PredicateValueDataType.STRING: json.dumps(model),
        }

        def _build_operation_resource_settings(
            left_value: Union[bool, Dict, float, int, List, str],
            first_object_key=first_object_key,
        ) -> Dict:
            return {
                BaseResource.__name__: dict(
                    left_object_keys=[first_object_key],
                    operation_resource=GenericResource({
                        first_object_key: left_value,
                    }, None),
                ),
                Block.__name__: dict(
                    left_object_keys=['configuration', first_object_key],
                    operation_resource=Block.create(
                        uuid.uuid4().hex,
                        BlockType.DATA_LOADER,
                        self.repo_path,
                        configuration={
                            first_object_key: left_value,
                        },
                    ),
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

        for object_type in PredicateObjectType:
            # ERROR
            # HOOK
            # META
            # METADATA
            # OPERATION_RESOURCE
            # PAYLOAD
            # QUERY
            # RESOURCE
            # RESOURCES
            # RESOURCE_ID
            # RESOURCE_PARENT_ID
            # USER

            for data_type in [PredicateValueDataType.BOOLEAN]:
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
                        print(
                            f'Skipping test for operator {operator.value} '
                            f'and data type {data_type.value}.',
                        )
                        continue

                    validate_kwargs_arr = []
                    for tup in _build_operation_resource_settings(left_value).items():
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

                        validate_kwargs_arr.append(settings)

                    for validate_kwargs in validate_kwargs_arr:
                        predicate = HookPredicate.load(
                            left_object_keys=validate_kwargs.get('left_object_keys'),
                            left_object_type=object_type,
                            left_value=left_value,
                            left_value_type=PredicateValueType.load(
                                value_data_type=data_type,
                            ),
                            operator=operator,
                            right_value=right_value,
                        )

                        options = ignore_keys(validate_kwargs, [
                            'left_object_keys',
                            'operation_resource',
                        ])

                        print('~~~~~~~~~~~~~~~~~~~~~~~~~~ info')
                        print(object_type, validate_kwargs['operation_resource'])
                        print(data_type)
                        print(operator)
                        self.assertTrue(predicate.validate(
                            validate_kwargs['operation_resource'],
                            **options,
                        ))

        # value_data_type_configs = {
        #     PredicateValueDataType.BOOLEAN.value: dict(
        #         value=True,
        #     ),
        #     PredicateValueDataType.DICTIONARY.value: dict(
        #         value=
        #     ),
        #     PredicateValueDataType.FLOAT.value: dict(
        #         value=
        #     ),
        #     PredicateValueDataType.INTEGER.value: dict(
        #         value=
        #     ),
        #     PredicateValueDataType.LIST.value: dict(
        #         value=
        #     ),
        #     PredicateValueDataType.STRING.value: dict(
        #         value=
        #     ),
        # }

        # configs = [
        #     dict(
        #         left_value_type=PredicateValueDataType.BOOLEAN,
        #         value=True,
        #     ),
        #     dict(
        #         left_value_type=PredicateValueDataType.DICTIONARY,
        #         value=dict(value_parent=model)
        #     ),
        #     dict(
        #         left_value_type=PredicateValueDataType.FLOAT,
        #     ),
        #     dict(
        #         left_value_type=PredicateValueDataType.INTEGER,
        #     ),
        #     dict(
        #         left_value_type=PredicateValueDataType.LIST,
        #     ),
        #     dict(
        #         left_value_type=PredicateValueDataType.STRING,
        #     ),
        # ]

        # predicate = HookPredicate.load(
        #     left_object_keys=['power'],
        #     left_object_type=PredicateObjectType.RESOURCE,
        #     left_value_type=PredicateValueType.load(value_data_type=PredicateValueDataType.INTEGER),
        #     operator=PredicateOperator.EQUALS,
        #     right_value=right_value,
        # )

        # self.assertTrue(predicate.validate(
        #     GenericResource(model, None),
        #     resource=model,
        # ))

        # PredicateObjectType.ERROR
        # PredicateObjectType.HOOK
        # PredicateObjectType.META
        # PredicateObjectType.METADATA
        # PredicateObjectType.OPERATION_RESOURCE
        # PredicateObjectType.PAYLOAD
        # PredicateObjectType.QUERY
        # PredicateObjectType.RESOURCE
        # PredicateObjectType.RESOURCES
        # PredicateObjectType.RESOURCE_ID
        # PredicateObjectType.RESOURCE_PARENT_ID
        # PredicateObjectType.USER
