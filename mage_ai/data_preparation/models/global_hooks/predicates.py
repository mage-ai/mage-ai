import json
from abc import abstractmethod
from collections.abc import Iterable
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Union

from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.global_hooks.constants import (
    INTERNAL_DEFAULT_PREDICATE_VALUE,
    PredicateAndOrOperator,
    PredicateObjectType,
    PredicateOperator,
    PredicateValueDataType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.models import BaseDataClass


@dataclass
class PredicateValueType(BaseDataClass):
    value_data_type: PredicateValueDataType = None
    value_type: Dict = None

    def __post_init__(self):
        self.serialize_attribute_enum('value_data_type', PredicateValueDataType)

        if self.value_type and isinstance(self.value_type, dict):
            self.value_type = self.__class__.load(**self.value_type)

    def to_dict(self, **kwargs) -> Dict:
        data = super().to_dict(**kwargs)

        if self.value_type and issubclass(self.value_type.__class__, BaseDataClass):
            data['value_type'] = self.value_type.to_dict(**kwargs)

        return data


@dataclass
class BasePredicate(BaseDataClass):
    and_or_operator: PredicateAndOrOperator = None
    left_object_keys: List[str] = None
    left_object_type: PredicateObjectType = None
    left_value: Union[bool, Dict, float, int, List, str] = None
    left_value_type: PredicateValueType = None
    operator: PredicateOperator = None
    predicates: List = None
    right_object_keys: List[str] = None
    right_object_type: PredicateObjectType = None
    right_value: Union[bool, Dict, float, int, List, str] = None
    right_value_type: PredicateValueType = None

    @abstractmethod
    def validate(
        self,
        operation_resource: Union[BaseResource, Block, Dict, List[BaseResource], Pipeline],
        error: Dict = None,  # code, errors, message, type
        hook: Dict = None,
        meta: Dict = None,
        metadata: Dict = None,
        payload: Dict = None,
        query: Dict = None,
        resource: Dict = None,
        resource_id: Union[int, str] = None,
        resource_parent_id: Union[int, str] = None,
        resources: Dict = None,
        user: Dict = None,
    ) -> bool:
        return False


@dataclass
class HookPredicate(BasePredicate):
    predicates: List[BasePredicate] = None

    def __post_init__(self):
        self.serialize_attribute_classes('predicates', self.__class__)
        self.serialize_attribute_class('left_value_type', PredicateValueType)
        self.serialize_attribute_class('right_value_type', PredicateValueType)
        self.serialize_attribute_enum('and_or_operator', PredicateAndOrOperator)
        self.serialize_attribute_enum('left_object_type', PredicateObjectType)
        self.serialize_attribute_enum('operator', PredicateOperator)
        self.serialize_attribute_enum('right_object_type', PredicateObjectType)

    def validate(
        self,
        operation_resource: Union[BaseResource, Block, Dict, List[BaseResource], Pipeline],
        **kwargs,
    ) -> bool:
        if self.predicates:
            operator_func = all

            if PredicateAndOrOperator.OR == self.and_or_operator:
                operator_func = any

            return operator_func([predicate.validate(
                operation_resource,
                **kwargs,
            ) for predicate in self.predicates])

        return self.__validate_resource(operation_resource, **kwargs)

    def __validate_resource(
        self,
        operation_resource: Union[BaseResource, Block, Dict, List[BaseResource], Pipeline],
        **kwargs,
    ) -> bool:
        if isinstance(operation_resource, Iterable) and not isinstance(operation_resource, dict):
            return all([self.__validate(
                operation_resource=res,
                **kwargs,
            ) for res in operation_resource])

        return self.__validate(operation_resource=operation_resource, **kwargs)

    def __validate(self, **kwargs) -> bool:

        left_object = None
        right_object = None

        left_value_to_compare = INTERNAL_DEFAULT_PREDICATE_VALUE
        right_value_to_compare = INTERNAL_DEFAULT_PREDICATE_VALUE

        # Get the value from the object
        if self.left_object_type:
            key = self.left_object_type.value
            if key in kwargs:
                left_object = kwargs[key]

        if self.right_object_type:
            key = self.right_object_type.value
            if key in kwargs:
                right_object = kwargs[key]

        # Get value from object using keys if self.right_value is not None
        if self.left_value is not None:
            left_value_to_compare = self.left_value
        elif left_object:
            if self.left_object_keys:
                left_value_to_compare = get_value(left_object, self.left_object_keys)
            else:
                left_value_to_compare = left_object

        # Convert left value to the specified data type
        if self.left_value_type and INTERNAL_DEFAULT_PREDICATE_VALUE != left_value_to_compare:
            left_value_to_compare = convert_value(left_value_to_compare, self.left_value_type)

        # Get value from object using keys if self.right_value is not None
        if self.right_value is not None:
            right_value_to_compare = self.right_value
        elif right_object:
            if self.right_object_keys:
                right_value_to_compare = get_value(right_object, self.right_object_keys)
            else:
                right_value_to_compare = right_object

        # Convert value to the specified data type
        if self.right_value_type and INTERNAL_DEFAULT_PREDICATE_VALUE != right_value_to_compare:
            right_value_to_compare = convert_value(right_value_to_compare, self.right_value_type)

        if INTERNAL_DEFAULT_PREDICATE_VALUE == left_value_to_compare:
            left_value_to_compare = None

        if INTERNAL_DEFAULT_PREDICATE_VALUE == right_value_to_compare:
            right_value_to_compare = None

        if self.operator:
            return compare_using_operator(
                self.operator,
                left_value_to_compare,
                right_value_to_compare,
            )

        return False


def get_value(
    object_arg: Union[BaseResource, Block, Dict, List[BaseResource], Pipeline, int, str],
    keys: List[str] = None,
) -> Union[bool, Dict, float, int, List, str]:
    value_temp = None

    if keys:
        if not isinstance(object_arg, Iterable) and (
            issubclass(object_arg.__class__, BaseResource) or
            isinstance(object_arg, Block) or
            isinstance(object_arg, Pipeline)
        ):
            for idx, key in enumerate(keys):
                if idx == 0:
                    value_temp = getattr(object_arg, key)
                else:
                    value_temp = get_value(value_temp, [key])
        elif isinstance(object_arg, Iterable) and \
                not isinstance(object_arg, dict) and \
                not isinstance(object_arg, str):

            for idx, key in enumerate(keys):
                if idx == 0:
                    if isinstance(key, str) and hasattr(object_arg, key):
                        value_temp = getattr(object_arg, key)
                    elif isinstance(key, int) or isinstance(key, float):
                        index_inner = int(key)

                        if object_arg and index_inner < len(object_arg):
                            value_temp = object_arg[index_inner]
                else:
                    value_temp = get_value(value_temp, [key])
        elif isinstance(object_arg, dict):
            for idx, key in enumerate(keys):
                if idx == 0:
                    value_temp = object_arg.get(key)
                else:
                    value_temp = get_value(value_temp, [key])

    if callable(value_temp):
        value_temp = value_temp()

    return value_temp


def convert_value(
    value: Union[bool, Dict, float, int, List, str],
    value_type: PredicateValueType,
) -> Union[bool, Dict, float, int, List, str]:
    value_data_type = value_type.value_data_type
    value_type_sub = value_type.value_type

    if PredicateValueDataType.BOOLEAN == value_data_type:
        value = bool(value)
    elif PredicateValueDataType.DICTIONARY == value_data_type:
        if value is not None:
            if isinstance(value, str):
                value = json.loads(value)
            if value_type_sub:
                for k, v in value.items():
                    value[k] = convert_value(v, value_type_sub)
    elif PredicateValueDataType.FLOAT == value_data_type:
        if value is not None:
            value = float(value)
    elif PredicateValueDataType.INTEGER == value_data_type:
        if value is not None:
            value = int(value)
    elif PredicateValueDataType.LIST == value_data_type:
        if value is not None:
            if isinstance(value, str):
                value = json.loads(value)
            if value_type_sub:
                value = [convert_value(v, value_type_sub) for v in value]
    elif PredicateValueDataType.STRING == value_data_type:
        if value is None:
            value = ''
        if isinstance(value, Enum):
            value = value.value
        value = str(value)

    return value


def compare_using_operator(
    operator: PredicateOperator,
    left_value: Union[bool, Dict, float, int, List, str],
    right_value: Union[bool, Dict, float, int, List, str],
) -> bool:
    try:
        if operator in [
            PredicateOperator.GREATER_THAN,
            PredicateOperator.GREATER_THAN_OR_EQUALS,
            PredicateOperator.LESS_THAN,
            PredicateOperator.LESS_THAN_OR_EQUALS,
        ]:
            if (
                left_value is not None and
                not isinstance(left_value, str) and
                (isinstance(left_value, dict) or isinstance(left_value, Iterable))
            ) or (
                right_value is not None and
                not isinstance(right_value, str) and
                (isinstance(right_value, dict) or isinstance(right_value, Iterable))
            ):
                if left_value is None:
                    left_value = 0
                else:
                    left_value = len(left_value)

                if right_value is None:
                    right_value = 0
                else:
                    right_value = len(right_value)

        if PredicateOperator.EQUALS == operator:
            return left_value == right_value
        if PredicateOperator.GREATER_THAN == operator:
            return left_value > right_value
        if PredicateOperator.GREATER_THAN_OR_EQUALS == operator:
            return left_value >= right_value
        if PredicateOperator.INCLUDES == operator:
            return left_value in right_value
        if PredicateOperator.LESS_THAN == operator:
            return left_value < right_value
        if PredicateOperator.LESS_THAN_OR_EQUALS == operator:
            return left_value <= right_value
        if PredicateOperator.NOT_EQUALS == operator:
            return left_value != right_value
        if PredicateOperator.NOT_INCLUDES == operator:
            return left_value not in right_value
        if PredicateOperator.NOT_PRESENT == operator:
            return False if left_value else True
        if PredicateOperator.PRESENT == operator:
            return True if left_value else False
    except TypeError as err:
        print(f'[ERROR] Predicate error comparing {left_value} {operator} {right_value}: {err}.')

    return False
