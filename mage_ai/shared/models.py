import typing
from dataclasses import dataclass, make_dataclass
from enum import Enum
from functools import reduce
from typing import Dict, List

import inflection

from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex


class BaseClass:
    attribute_aliases = {}
    disable_attribute_snake_case = False

    def __init__(self, *args, **kwargs):
        pass

    @classmethod
    def all_annotations(self) -> Dict:
        annotations = {}

        for key, value in self.__dataclass_fields__.items():
            annotations[key] = value.type

        for parent_class in self.__bases__:
            if issubclass(parent_class, BaseDataClass):
                for key, value in parent_class.__dataclass_fields__.items():
                    if key not in annotations:
                        annotations[key] = value.type

        return annotations

    @classmethod
    def load(self, **kwargs):
        annotations = self.all_annotations()

        props_init = self.load_to_dict(**kwargs)

        props = {}
        props_not_set = {}
        if props_init:
            for key, value in props_init.items():
                if self.attribute_aliases and key in self.attribute_aliases:
                    key = self.attribute_aliases[key]

                annotation = annotations.get(key)
                if annotation:
                    props[key] = self.convert_value(value, annotation)
                else:
                    props_not_set[key] = value

        model = self(**props)

        for key, value in props_not_set.items():
            try:
                if not callable(getattr(model, key)):
                    model.set_value(key, value)
            except AttributeError as err:
                print(f'[WARNING] {self.__name__}.load: {err}')
                raise err

        return model

    def set_value(self, key, value):
        value = self.convert_value(value)

        try:
            setattr(self, key, value)
        except AttributeError:
            pass

    @classmethod
    def convert_value(
        self,
        value,
        annotation=None,
        convert_enum: bool = False,
        ignore_empty: bool = False,
    ):
        is_list = isinstance(value, list)
        if is_list:
            if ignore_empty and len(value) == 0:
                return None

            return [self.convert_value(
                v,
                convert_enum=convert_enum,
                ignore_empty=ignore_empty,
            ) for v in value]

        if not annotation:
            annotation = type(value)

        is_dict_class = isinstance(value, dict)

        def _build_dict(acc, kv, cls=self):
            key, value = kv
            acc[key] = cls.convert_value(
                value,
                convert_enum=convert_enum,
                ignore_empty=ignore_empty,
            )
            return acc

        is_typing_class = False
        if hasattr(typing, '_BaseGenericAlias'):
            is_typing_class = issubclass(annotation.__class__, typing._BaseGenericAlias)
        elif hasattr(typing, '_GenericAlias'):
            is_typing_class = issubclass(annotation.__class__, typing._GenericAlias)

        if is_typing_class:
            if is_dict_class:
                if ignore_empty and len(value) == 0:
                    return None

                return reduce(_build_dict, value.items(), {})
            else:
                return value

        is_data_class = issubclass(annotation, BaseDataClass)
        if is_data_class:
            if is_dict_class:
                if ignore_empty and len(value) == 0:
                    return None

                return annotation.load(**value)
            elif isinstance(value, BaseDataClass):
                return value.to_dict(
                    convert_enum=convert_enum,
                    ignore_empty=ignore_empty,
                )

        is_enum_class = issubclass(annotation, Enum)
        is_enum = isinstance(value, Enum)
        if is_enum_class and not is_enum:
            try:
                return annotation(value)
            except ValueError:
                pass

        if convert_enum and is_enum:
            return value.value

        return value

    @classmethod
    def load_to_dict(self, **kwargs) -> Dict:
        data = {}
        for key, value in kwargs.items():
            if not self.disable_attribute_snake_case:
                key = inflection.underscore(key)
            data[key] = value
        return data

    def serialize_attribute_class(self, attribute_name: str, attribute_class, **kwargs):
        try:
            value = getattr(self, attribute_name)
            if value and isinstance(value, dict):
                setattr(self, attribute_name, attribute_class.load(**merge_dict(value, kwargs)))
        except AttributeError as err:
            print(f'[WARNING] {self.__class__.__name__}.serialize_attribute_class: {err}')

    def serialize_attribute_classes(self, attribute_name: str, attribute_class, **kwargs):
        try:
            value = getattr(self, attribute_name)
            if value and isinstance(value, list):
                arr = []
                for model in value:
                    if isinstance(model, dict):
                        arr.append(attribute_class.load(**merge_dict(model, kwargs)))
                    else:
                        arr.append(model)
                setattr(self, attribute_name, arr)
        except AttributeError as err:
            print(f'[WARNING] {self.__class__.__name__}.serialize_attribute_classes: {err}')

    def serialize_attribute_enum(self, attribute_name: str, enum_class):
        try:
            value = getattr(self, attribute_name)
            if value and isinstance(value, str):
                setattr(self, attribute_name, enum_class(value))
        except AttributeError as err:
            print(f'[WARNING] {self.__class__.__name__}.serialize_attribute_enum: {err}')

    def serialize_attribute_enums(self, attribute_name: str, enum_class):
        try:
            values = getattr(self, attribute_name)
            if values and isinstance(values, list):
                arr = []
                for value in values:
                    if isinstance(value, str):
                        arr.append(enum_class(value))
                    else:
                        arr.append(value)
                setattr(self, attribute_name, arr)
        except AttributeError as err:
            print(f'[WARNING] {self.__class__.__name__}.serialize_attribute_enums: {err}')

    def to_dict(self, convert_enum: bool = False, ignore_empty: bool = False, **kwargs) -> Dict:
        data = {}

        for key, annotation in self.all_annotations().items():
            value = None
            try:
                value = getattr(self, key)
            except AttributeError as err:
                print(f'[WARNING] {self.__class__.__name__}.to_dict: {err}')

            value = self.convert_value(
                value,
                annotation,
                convert_enum=convert_enum,
                ignore_empty=ignore_empty,
            )
            if not ignore_empty or value is not None:
                if self.attribute_aliases and key in self.attribute_aliases:
                    key = self.attribute_aliases[key]

                if ignore_empty and \
                        (isinstance(value, list) or isinstance(value, dict)) and \
                        len(value) == 0:

                    continue

                data[key] = encode_complex(value)

        return data

    def update_attributes(self, **kwargs):
        for key, value in kwargs.items():
            self.set_value(key, value)


@dataclass
class BaseDataClass(BaseClass):
    @classmethod
    def dynamic_fields(self, *args, **kwargs) -> List:
        return None

    def __new__(cls, *args, **kwargs):
        fields = cls.dynamic_fields()
        if fields:
            cls.__class__ = make_dataclass(
                cls.__name__,
                fields=fields,
                bases=(cls,),
            )

        obj = object.__new__(cls)
        BaseClass.__init__(obj, *args, **kwargs)

        return obj
