import importlib
import inspect
from collections import UserList
from collections.abc import Iterable
from datetime import datetime
from typing import Any, Callable, Dict, Union

from mage_ai.api.operations.constants import READ
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.orchestration.db.models.base import BaseModel
from mage_ai.shared.hash import merge_dict


class CustomDict(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.already_validated = False


class CustomList(list):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.already_validated = False


class BasePresenter:
    all_attributes_attr = {}
    all_formats_attr = {}
    default_attributes = []

    def __init__(self, resource, current_user, **kwargs):
        self.current_user = current_user
        self.options = kwargs
        self.resource = resource

    @classmethod
    def all_attributes(self):
        if not self.all_attributes_attr.get(self.__name__):
            self.all_attributes_attr[self.__name__] = {}
        return self.all_attributes_attr[self.__name__]

    @classmethod
    def all_formats(self):
        if not self.all_formats_attr.get(self.__name__):
            self.all_formats_attr[self.__name__] = {
                'default': self.default_attributes,
            }
        return self.all_formats_attr[self.__name__]

    @classmethod
    def formats(self, format_arg):
        if format_arg and self.all_formats().get(format_arg, None) is not None:
            return self.all_formats()[format_arg]
        else:
            return self.all_formats()['default']

    @classmethod
    def register_attributes(self, keys, klass_symbol_or_lambda):
        for key in keys:
            self.all_attributes()[key] = klass_symbol_or_lambda

    @classmethod
    def register_format(self, format_arg, keys):
        self.all_formats()[format_arg] = keys

    @classmethod
    def register_formats(self, formats, keys):
        arr = formats if isinstance(formats, list) else [formats]
        for format_arg in arr:
            self.register_format(format_arg, keys)

    @classmethod
    async def present_resource(self, resource, user, **kwargs):
        async def present_lambda(r):
            if r and inspect.isawaitable(r):
                r = await r

            results = r.__class__.presenter_class()(
                r,
                user,
                **kwargs,
            ).present(
                **kwargs,
            )

            if results and inspect.isawaitable(results):
                results = await results

            return results

        if isinstance(resource, Iterable):
            already_validated_values = []

            arr = []
            for r in resource:
                res = await present_lambda(r)
                arr.append(res)

                already_validated = False
                if isinstance(res, CustomDict) or isinstance(res, CustomList):
                    already_validated = res.already_validated
                already_validated_values.append(already_validated)

            custom_list = CustomList(arr)
            custom_list.already_validated = all(already_validated_values)

            return custom_list
        else:
            return await present_lambda(resource)

    @classmethod
    async def present_model(self, model, resource_class, user, **kwargs):
        if model:
            return await self.present_resource(
                resource_class(model, user, **kwargs),
                user,
                **kwargs,
            )

    @classmethod
    async def present_models(self, models, resource_class, user, **kwargs):
        return await self.present_resource(
            resource_class.build_result_set(models, user, **kwargs),
            user,
            **kwargs,
        )

    async def prepare_present(self, **kwargs) -> Union[Any, None]:
        return self

    async def present(self, present_options_by_key: Dict = None, **kwargs):
        object_to_present = await self.prepare_present(**kwargs)

        async def _build(
            obj,
            key,
            object_to_present=object_to_present,
            present_options_by_key=present_options_by_key,
        ):
            if isinstance(object_to_present, dict):
                value = object_to_present.get(key)
            else:
                value = getattr(object_to_present, key)

            if callable(value):
                value = value(**kwargs)
            self.__validate_attribute_type(key, value)

            options_for_key = present_options_by_key.get(key) if present_options_by_key else {}

            if issubclass(value.__class__, list) or issubclass(value.__class__, UserList):
                obj[key] = [
                    await self.__transform_value(
                        key,
                        v,
                        **merge_dict(kwargs, options_for_key or {}),
                    )
                    for v in value
                ]
            else:
                obj[key] = await self.__transform_value(
                    key,
                    value,
                    **merge_dict(kwargs, options_for_key or {}),
                )
            return obj

        format_to_present = kwargs.get('format', None)
        if format_to_present and self.options.get('from_resource'):
            from_resource_name = self.options['from_resource'].resource_name_singular()
            format_to_present = f'{from_resource_name}/{format_to_present}'

        mapping = {}
        for key in self.__class__.formats(format_to_present):
            mapping = await _build(mapping, key)

        return mapping

    async def __transform_value(self, key, value, **kwargs):
        klass_symbol_or_lambda = self.__class__.all_attributes().get(key, None)

        if issubclass(value.__class__, BaseModel):
            resource_class_name = f'{value.__class__.__name__}Resource'
            resource_class = getattr(
                importlib.import_module(f'mage_ai.api.resources.{resource_class_name}'),
                resource_class_name,
            )
            value = resource_class(value, self.current_user, **kwargs)

        if isinstance(value, datetime):
            return str(value)
        elif klass_symbol_or_lambda is float:
            return float(value)
        elif klass_symbol_or_lambda is int:
            return int(value)
        elif issubclass(value.__class__, BaseResource):
            opts = self.options.copy()
            opts['from_resource'] = self.resource
            data = await value.presenter_class().present_resource(
                value,
                self.current_user,
                **merge_dict(kwargs, opts),
            )

            if not kwargs.get('ignore_permissions'):
                policy = value.policy_class()(value, self.current_user, **opts)

                def _build_authorize_attributes(
                    parsed_value: Any,
                    policy=policy,
                    opts=opts,
                ) -> Callable:
                    return policy.authorize_attributes(
                        READ,
                        parsed_value.keys(),
                        **opts,
                    )

                parser = None
                parser_class = value.parser_class()
                if parser_class:
                    parser = parser_class(
                        resource=value,
                        current_user=self.current_user,
                        policy=policy,
                        **opts,
                    )
                    data = await parser.parse_read_attributes_and_authorize(
                        data,
                        _build_authorize_attributes,
                        **opts,
                    )
                    if isinstance(data, list):
                        data = CustomList(data)
                        data.already_validated = True
                    elif isinstance(data, dict):
                        data = CustomDict(data)
                        data.already_validated = True
                else:
                    await policy.authorize_attributes(
                        READ,
                        data.keys(),
                        **opts,
                    )

            return data
        else:
            return value

    def __validate_attribute_class(self, klass_symbol, value):
        pass

    def __validate_attribute_type(self, key, value):
        pass

    def __getattr__(self, name):
        def _missing(*args, **kwargs):
            val = getattr(self.resource, name)
            if callable(val):
                return val(*args, **kwargs)
            else:
                return val

        return _missing()
