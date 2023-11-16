import typing
from dataclasses import dataclass
from enum import Enum
from functools import reduce
from typing import Dict

import inflection

from mage_ai.shared.parsers import encode_complex


@dataclass
class BaseDataClass:
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
            except AttributeError:
                pass

        return model

    @classmethod
    def set_value(self, key, value):
        value = self.convert_value(value)

        try:
            setattr(self, key, value)
        except AttributeError:
            pass

    @classmethod
    def convert_value(self, value, annotation=None):
        is_list = isinstance(value, list)
        if is_list:
            return [self.convert_value(v) for v in value]

        if not annotation:
            annotation = type(value)

        is_dict_class = isinstance(value, dict)

        def _build_dict(acc, kv, cls=self):
            key, value = kv
            acc[key] = cls.convert_value(value)
            return acc

        is_typing_class = False
        if hasattr(typing, '_BaseGenericAlias'):
            is_typing_class = issubclass(annotation.__class__, typing._BaseGenericAlias)
        elif hasattr(typing, '_GenericAlias'):
            is_typing_class = issubclass(annotation.__class__, typing._GenericAlias)

        if is_typing_class:
            if is_dict_class:
                return reduce(_build_dict, value.items(), {})
            else:
                return value

        is_data_class = issubclass(annotation, BaseDataClass)
        if is_data_class:
            if is_dict_class:
                return annotation.load(**value)
            elif isinstance(value, BaseDataClass):
                return value.to_dict()

        is_enum_class = issubclass(annotation, Enum)
        is_enum = isinstance(value, Enum)
        if is_enum_class and not is_enum:
            try:
                return annotation(value)
            except ValueError:
                pass

        return value

    @classmethod
    def load_to_dict(self, **kwargs) -> Dict:
        data = {}
        for key, value in kwargs.items():
            data[inflection.underscore(key)] = value
        return data

    def serialize_attribute_class(self, attribute_name: str, attribute_class):
        try:
            value = getattr(self, attribute_name)
            if value and isinstance(value, dict):
                setattr(self, attribute_name, attribute_class.load(**value))
        except AttributeError as err:
            print(f'[WARNING] {self.__class__.__name__}.serialize_attribute_class: {err}')

    def serialize_attribute_classes(self, attribute_name: str, attribute_class):
        try:
            value = getattr(self, attribute_name)
            if value and isinstance(value, list):
                arr = []
                for model in value:
                    if isinstance(model, dict):
                        arr.append(attribute_class.load(**model))
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

    def to_dict(self) -> Dict:
        data = {}

        for key, annotation in self.all_annotations().items():
            value = None
            try:
                value = getattr(self, key)
            except AttributeError:
                pass

            value = self.convert_value(value, annotation)
            data[key] = encode_complex(value)

        return data
