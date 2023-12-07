import importlib
import inspect

import inflection

from mage_ai import settings
from mage_ai.api.errors import ApiError
from mage_ai.api.mixins.result_set import ResultSetMixIn
from mage_ai.api.resources.Resource import Resource
from mage_ai.api.resources.shared import collective_loaders
from mage_ai.api.result_set import ResultSet
from mage_ai.orchestration.db.errors import DoesNotExistError
from mage_ai.shared.hash import merge_dict


class BaseResource(Resource, ResultSetMixIn):
    collective_loader_attr = {}
    datetime_keys = []

    # Declared list of cookies names to be injected into the payload
    # - provide a list of cookie names in the subclassed resource
    # - payload keys are contructed as:
    #     mage_ai.api.operations.constants.COOKIE_PREFIX + <cookie_name>
    cookie_names = []
    model_class = None
    parent_models_attr = {}
    parent_resource_attr = {}

    @classmethod
    def model_name(self) -> str:
        return self.__name__.replace('Resource', '')

    @classmethod
    def parser_class(self):
        model_name = self.model_name()
        module_name = f'mage_ai.api.parsers.{model_name}Parser'
        class_name = f'{model_name}Parser'

        try:
            return getattr(importlib.import_module(module_name), class_name)
        except ModuleNotFoundError:
            return None

    @classmethod
    def policy_class(self):
        model_name = self.model_name()
        return getattr(
            importlib.import_module(
                'mage_ai.api.policies.{}Policy'.format(model_name)),
            '{}Policy'.format(model_name),
        )

    @classmethod
    def presenter_class(self):
        model_name = self.model_name()
        return getattr(
            importlib.import_module(
                'mage_ai.api.presenters.{}Presenter'.format(model_name)),
            '{}Presenter'.format(model_name),
        )

    @classmethod
    def collective_loader(self):
        if not self.collective_loader_attr.get(self.__name__):
            self.collective_loader_attr[self.__name__] = {}
        return self.collective_loader_attr[self.__name__]

    @classmethod
    def parent_models(self):
        if not self.parent_models_attr.get(self.__name__):
            self.parent_models_attr[self.__name__] = {}
        return self.parent_models_attr[self.__name__]

    @classmethod
    def parent_resource(self):
        if not self.parent_resource_attr.get(self.__name__):
            self.parent_resource_attr[self.__name__] = {}
        return self.parent_resource_attr[self.__name__]

    @classmethod
    def register_collective_loader(self, key, **kwargs):
        self.collective_loader()[key] = kwargs

    @classmethod
    def register_collective_loader_find(self, resource_class, **kwargs):
        attribute = kwargs.get('attribute',
                               resource_class.resource_name_singular())
        self.register_collective_loader(
            attribute,
            load=collective_loaders.build_load(
                resource_class,
                attribute=attribute),
            select=collective_loaders.build_select_find(
                '{}_id'.format(attribute)),
        )

    @classmethod
    def register_collective_loader_select(self, resource_class, **kwargs):
        attribute = kwargs.get('attribute', resource_class.resource_name())
        self.register_collective_loader(
            attribute,
            load=collective_loaders.build_load_select(
                self,
                resource_class,
                attribute=self.resource_name_singular()),
            select=collective_loaders.build_select_filter(
                '{}_id'.format(
                    self.resource_name_singular())),
        )

    @classmethod
    def register_parent_model(self, key, value):
        self.parent_models()[key] = value

    @classmethod
    def register_parent_models(self, key_values):
        for key, value in key_values.items():
            self.register_parent_model(key, value)

    @classmethod
    def register_parent_resource(self, resource_class, **kwargs):
        column_name = kwargs.get(
            'column_name',
            '{}_id'.format(resource_class.resource_name_singular()),
        )
        self.parent_resource()[column_name] = resource_class

    @classmethod
    def build_result_set(self, arr, user, **kwargs):
        return ResultSet([mod if issubclass(mod.__class__, BaseResource) else self(
            mod, user, **kwargs) for mod in arr], )

    @classmethod
    def collection(self, query, meta, user, **kwargs):
        """
        Subclasses override this method
        """
        pass

    @classmethod
    def create(self, payload, user, **kwargs):
        """
        Subclasses override this method
        """
        pass

    @classmethod
    def member(self, pk, user, **kwargs):
        """
        Subclasses override this method
        """
        pass

    @classmethod
    def before_create(self, payload, user, **kwargs):
        pass

    @classmethod
    async def process_create(
        self,
        payload,
        user,
        **kwargs,
    ):
        self.on_create_callback = None
        self.on_create_failure_callback = None
        before_create = self.before_create(payload, user, **kwargs)

        try:
            res = self.create(payload, user, **merge_dict(kwargs, {
                'before_create': before_create,
            }))
            if res and inspect.isawaitable(res):
                res = await res

            if self.on_create_callback:
                callback = self.on_create_callback(resource=res)
                if callback and inspect.isawaitable(callback):
                    await callback

            return res
        except Exception as err:
            if self.on_create_failure_callback:
                self.on_create_failure_callback()

            raise err

    @classmethod
    async def process_collection(self, query, meta, user, **kwargs):
        res = self.collection(query, meta, user, **kwargs)
        if res and inspect.isawaitable(res):
            res = await res
        return res

    @classmethod
    async def process_member(self, pk, user, **kwargs):
        try:
            res = self.member(pk, user, **kwargs)
            if res and inspect.isawaitable(res):
                res = await res

            return res
        except DoesNotExistError as err:
            if settings.DEBUG:
                raise err
            else:
                error = ApiError.RESOURCE_NOT_FOUND
                raise ApiError(error)

    @classmethod
    def resource_name(self):
        return inflection.pluralize(self.resource_name_singular())

    @classmethod
    def resource_name_singular(self):
        return inflection.underscore(
            self.__name__.replace(
                'Resource', '')).lower()

    @classmethod
    async def get_model(self, pk):
        if self.model_class:
            return self.model_class.query.get(pk)

    def delete(self, **kwargs):
        """
        Subclasses override this method
        """
        pass

    def parent_model(self):
        return self.model_options.get('parent_model')

    async def process_delete(self, **kwargs):
        self.on_delete_callback = None
        self.on_delete_failure_callback = None

        try:
            res = self.delete(**kwargs)
            if res and inspect.isawaitable(res):
                res = await res

            if self.on_delete_callback:
                callback = self.on_delete_callback(resource=self)
                if callback and inspect.isawaitable(callback):
                    await callback

            return res
        except Exception as err:
            if self.on_delete_failure_callback:
                self.on_delete_failure_callback(resource=self)

            raise err

    async def process_update(self, payload, **kwargs):
        self.on_update_callback = None
        self.on_update_failure_callback = None

        try:
            res = self.update(payload, **kwargs)
            if res and inspect.isawaitable(res):
                res = await res

            if self.on_update_callback:
                callback = self.on_update_callback(resource=res)
                if callback and inspect.isawaitable(callback):
                    await callback

            return res
        except Exception as err:
            if self.on_update_failure_callback:
                self.on_update_failure_callback(resource=self)

            raise err

    def result_set(self) -> ResultSet:
        if self.__result_sets().get(self.__class__.__name__, None):
            return self.__result_sets()[self.__class__.__name__]
        elif not self.result_set_attr:
            if self.result_set_from_external is not None:
                self.result_set_attr = self.result_set_from_external
                if self not in self.result_set_attr:
                    self.result_set_attr.add_results([self])
            else:
                self.result_set_attr = ResultSet([self])
        return self.result_set_attr

    def update(self, payload, **kwargs):
        """
        Subclasses override this method
        """
        pass

    def collective_load_for_attribute(self, key):
        k_name = self.__class__.__name__
        if self.result_set().context and self.result_set().context.data:
            loaded = self.result_set().context.data.get(k_name, {}).get(key, None)
        else:
            loaded = None
        loader = self.__class__.collective_loader().get(key, None)
        if not loaded and loader:
            loaded = loader['load'](self)
            if loaded and not isinstance(
                    loaded,
                    ResultSet) and not isinstance(
                    loaded,
                    dict):
                loaded = ResultSet(loaded)
            if not self.result_set().context.data.get(k_name):
                self.result_set().context.data[k_name] = {}
            self.result_set().context.data[k_name][key] = loaded
        return loaded

    def __result_sets(self):
        return self.model_options.get('result_sets', {})

    def __getattr__(self, name):
        def _missing(*args, **kwargs):
            loader = self.__class__.collective_loader().get(name, None)
            if loader:
                arr = self.collective_load_for_attribute(name)
                if loader['select']:
                    val = loader['select'](self, arr)
                else:
                    val = arr
            else:
                val = getattr(self.model, name)

            # This turns functions into attributes
            # if callable(val):
            #     breakpoint()
            #     return val(*args, **kwargs)
            # else:
            #     return val

            return val
        return _missing()
