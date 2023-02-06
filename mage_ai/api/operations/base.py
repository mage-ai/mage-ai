from collections import UserList
from mage_ai import settings
from mage_ai.api.api_context import ApiContext
from mage_ai.api.errors import ApiError
from mage_ai.api.monitors.BaseMonitor import BaseMonitor
from mage_ai.api.operations.constants import (
    CREATE,
    DELETE,
    DETAIL,
    FILE_KEY_NAME,
    LIST,
    META_KEY_FORMAT,
    READ,
    UPDATE,
    WRITE,
)
from mage_ai.api.result_set import ResultSet
from mage_ai.shared.array import flatten
from mage_ai.shared.hash import merge_dict, ignore_keys
import importlib
import inflection


def classify(name):
    return ''.join([n.capitalize() for n in name.split('_')])


def singularize(name):
    return inflection.singularize(name)


class BaseOperation():
    def __init__(self, **kwargs):
        self.action = kwargs.get('action')
        self.files = kwargs.get('files', {})
        self.pk = kwargs.get('pk')
        self.headers = kwargs.get('headers', {})
        self.meta = kwargs.get('meta', {})
        self.oauth_client = kwargs.get('oauth_client')
        self.oauth_token = kwargs.get('oauth_token')
        self.options = kwargs.get('options', {})
        self.payload = kwargs.get('payload', {})
        self.query = kwargs.get('query', {}) or {}
        self.resource = kwargs.get('resource')
        self.resource_parent = kwargs.get('resource_parent')
        self.resource_parent_id = kwargs.get('resource_parent_id')
        self.user = kwargs.get('user')
        self.context = ApiContext()
        self.__combined_options_attr = None
        self.__presentation_format_attr = None
        self.__updated_options_attr = None

    def execute(self):
        response = {}
        try:
            result = self.__executed_result()
            presented = self.__present_results(result)
            attrb = flatten([d.keys() for d in presented]) if issubclass(
                type(presented), list) else presented.keys()
            if (issubclass(type(result), list) or issubclass(type(result), UserList)):
                results = result
            else:
                results = [result]
            for res in results:
                policy = self.__policy_class()(res, self.user, **self.__updated_options())
                policy.authorize_attributes(
                    READ, attrb, api_operation_action=self.action)
            response_key = self.resource if LIST == self.action else self.__resource_name_singular()
            response[response_key] = presented

            if isinstance(result, ResultSet):
                response['metadata'] = result.metadata

            if settings.DEBUG:
                debug_payload = {}
                debug_payload[self.__resource_name_singular()] = merge_dict(
                    self.payload.get(self.__resource_name_singular(), {}),
                    {
                        'file': None,
                    },
                )
                response['debug'] = {
                    'action': self.action,
                    'meta': self.meta,
                    'options': self.options,
                    'payload': merge_dict(self.payload, debug_payload),
                    'pk': self.pk,
                    'presentation_format': self.__presentation_format(),
                    'query': self.query,
                    'resource': self.resource,
                    'resource_parent': self.resource_parent,
                    'resource_parent_id': self.resource_parent_id,
                    'user': {
                        'id': self.user.id if self.user else None,
                    },
                }
        except ApiError as err:
            if settings.DEBUG:
                raise err
            else:
                response['error'] = self.__present_error(err)
        return response

    def __executed_result(self):
        if self.action in [CREATE, LIST]:
            return self.__create_or_index()
        elif self.action in [DELETE, DETAIL, UPDATE]:
            return self.__delete_show_or_update()

    def __create_or_index(self):
        policy = self.__policy_class()(None, self.user, **self.__updated_options())
        policy.authorize_action(self.action)
        if CREATE == self.action:
            policy.authorize_attributes(
                WRITE,
                self.__payload_for_resource().keys(),
                **self.__payload_for_resource(),
            )
            options = self.__updated_options().copy()
            options.pop('payload', None)
            return self.__resource_class().process_create(
                self.__payload_for_resource(),
                self.user,
                **options,
            )
        elif LIST == self.action:
            policy.authorize_query(self.query)
            options = self.__updated_options().copy()
            options.pop('meta', None)
            options.pop('query', None)
            return self.__resource_class().process_collection(
                self.query,
                self.meta,
                self.user,
                **options,
            )

    def __delete_show_or_update(self):
        res = self.__resource_class().process_member(
            self.pk, self.user, **self.__updated_options())
        policy = self.__policy_class()(res, self.user, **self.__updated_options())
        policy.authorize_action(self.action)

        if DELETE == self.action:
            res.process_delete(**self.__updated_options())
        elif DETAIL == self.action:
            policy.authorize_query(self.query)
        elif UPDATE == self.action:
            policy.authorize_attributes(
                WRITE,
                self.__payload_for_resource().keys(),
                **self.__payload_for_resource(),
            )
            options = self.__updated_options().copy()
            options.pop('payload', None)
            res.process_update(self.__payload_for_resource(), **options)

        return res

    def __present_error(self, error):
        return self.__monitor_class()(
            self.resource,
            self.user,
            error,
            **self.__combined_options(),
        ).present()

    def __classified_class(self):
        return classify(self.__resource_name_singular())

    def __resource_name_singular(self):
        return singularize(self.resource)

    def __monitor_class(self):
        try:
            return getattr(
                importlib.import_module(
                    'mage_ai.api.monitors.{}Monitor'.format(
                        self.__classified_class())), '{}Monitor'.format(
                    self.__classified_class()), )
        except ModuleNotFoundError:
            return BaseMonitor

    def __policy_class(self):
        return getattr(
            importlib.import_module(
                'mage_ai.api.policies.{}Policy'.format(
                    self.__classified_class())), '{}Policy'.format(
                self.__classified_class()), )

    def __presenter_class(self):
        return getattr(
            importlib.import_module(
                'mage_ai.api.presenters.{}Presenter'.format(
                    self.__classified_class())), '{}Presenter'.format(
                self.__classified_class()), )

    def __resource_class(self):
        return getattr(
            importlib.import_module(
                'mage_ai.api.resources.{}Resource'.format(
                    self.__classified_class())), '{}Resource'.format(
                self.__classified_class()), )

    def __parent_model(self):
        if self.resource_parent and self.resource_parent_id:
            parent_class = classify(singularize(self.resource_parent))
            parent_resource_class = getattr(
                importlib.import_module(
                    'mage_ai.api.resources.{}Resource'.format(parent_class)),
                '{}Resource'.format(parent_class),
            )
            try:
                return parent_resource_class.model_class.objects.get(
                    pk=self.resource_parent_id)
            except parent_resource_class.model_class.DoesNotExist:
                raise ApiError(ApiError.RESOURCE_NOT_FOUND)

    def __combined_options(self):
        if not self.__combined_options_attr:
            self.__combined_options_attr = {
                'context': self.context,
                'meta': self.meta,
                'options': self.options,
                'payload': self.payload,
                'query': self.query,
            }
        return self.__combined_options_attr

    def __payload_for_resource(self):
        payload = self.payload.get(self.__resource_name_singular(), {})
        if self.files and self.files.get(FILE_KEY_NAME):
            payload_prev = ignore_keys(self.payload, [FILE_KEY_NAME])
            payload[FILE_KEY_NAME] = self.files.get(FILE_KEY_NAME)
            payload.update(payload_prev)
        return payload

    def __present_results(self, results):
        data = self.__updated_options().copy()
        data.update({'format': self.__presentation_format()})
        return self.__presenter_class().present_resource(results, self.user, **data)

    def __presentation_format(self):
        if not self.__presentation_format_attr:
            self.__presentation_format_attr = self.meta.get(
                META_KEY_FORMAT, self.action)
        return self.__presentation_format_attr

    def __updated_options(self):
        if not self.__updated_options_attr:
            self.__updated_options_attr = self.__combined_options().copy()
            self.__updated_options_attr.update({
                'api_operation_action': self.action,
                'oauth_client': self.oauth_client,
                'oauth_token': self.oauth_token,
                'parent_model': self.__parent_model(),
            })
            self.__updated_options_attr.update(self.headers)
        return self.__updated_options_attr
