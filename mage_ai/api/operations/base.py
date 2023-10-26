import importlib
import importlib.util
import inspect
from collections import UserList
from typing import Any, Callable, Dict, Union

import dateutil.parser
import inflection

from mage_ai import settings
from mage_ai.api.api_context import ApiContext
from mage_ai.api.errors import ApiError
from mage_ai.api.monitors.BaseMonitor import BaseMonitor
from mage_ai.api.operations.constants import (
    COOKIE_PREFIX,
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
from mage_ai.api.parsers.BaseParser import BaseParser
from mage_ai.api.presenters.BasePresenter import CustomDict, CustomList
from mage_ai.api.result_set import ResultSet
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.errors import DoesNotExistError
from mage_ai.settings import REQUIRE_USER_PERMISSIONS
from mage_ai.shared.array import flatten
from mage_ai.shared.hash import ignore_keys, merge_dict
from mage_ai.shared.strings import classify


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
        self.payload = kwargs.get('payload') or {}
        self._query = kwargs.get('query', {}) or {}
        self.resource = kwargs.get('resource')
        self.resource_parent = kwargs.get('resource_parent')
        self.resource_parent_id = kwargs.get('resource_parent_id')
        self.user = kwargs.get('user')
        self.context = ApiContext()
        self.__combined_options_attr = None
        self.__presentation_format_attr = None
        self.__updated_options_attr = None

    async def execute(self):
        db_connection.start_cache()

        response = {}
        try:
            already_validated = False

            result = await self.__executed_result()
            presented = await self.__present_results(result)

            if isinstance(presented, CustomDict) or isinstance(presented, CustomList):
                already_validated = presented.already_validated

            presented_results = []
            resource_attributes = []

            presented_is_list = issubclass(type(presented), list)
            if presented_is_list:
                presented_results = presented
                resource_attributes = flatten([d.keys() for d in presented])
            else:
                presented_results = [presented]
                resource_attributes = presented.keys()

            resource_attributes = list(set(resource_attributes))

            if (issubclass(type(result), list) or issubclass(type(result), UserList)):
                results = result
            else:
                results = [result]

            presented_results_count = len(presented_results)
            presented_results_parsed = []
            for idx, res in enumerate(results):
                updated_options = await self.__updated_options()
                policy = self.__policy_class()(res, self.user, **updated_options)

                presented_result = None
                if idx < presented_results_count:
                    presented_result = presented_results[idx]

                if already_validated:
                    presented_results_parsed.append(presented_result)
                    continue

                # Skip this if result has already been validated
                def _build_authorize_attributes(parsed_value: Any, policy=policy) -> Callable:
                    return policy.authorize_attributes(
                        READ,
                        parsed_value.keys(),
                        api_operation_action=self.action,
                    )

                parser = None
                parser_class = self.__parser_class()
                if parser_class:
                    parser = parser_class(
                        resource=res,
                        current_user=self.user,
                        policy=policy,
                        **updated_options,
                    )

                if parser:
                    presented_result_parsed = await parser.parse_read_attributes_and_authorize(
                        presented_result,
                        _build_authorize_attributes,
                        **updated_options,
                    )
                    presented_results_parsed.append(presented_result_parsed)
                else:
                    await policy.authorize_attributes(
                        READ,
                        resource_attributes,
                        api_operation_action=self.action,
                    )
                    presented_results_parsed.append(presented_result)

            response_key = self.resource if LIST == self.action else self.__resource_name_singular()

            if presented_is_list:
                response[response_key] = presented_results_parsed
            else:
                response[response_key] = presented_results_parsed[0] if len(
                    presented_results_parsed,
                ) >= 1 else presented_results_parsed

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
            if err.code == 403 and \
                    self.user and \
                    self.user.project_access == 0 and \
                    not self.user.roles:

                if not REQUIRE_USER_PERMISSIONS:
                    err.message = 'You don’t have access to this project. ' + \
                        'Please ask an admin or owner for permissions.'
            if settings.DEBUG:
                raise err
            else:
                response['error'] = self.__present_error(err)

        db_connection.stop_cache()

        return response

    @property
    def query(self) -> Dict:
        if not self._query:
            return {}

        query = {}
        for key, values in self._query.items():
            query[key] = values
            if isinstance(values, list):
                arr = []
                for v in values:
                    try:
                        v = v.decode()
                    except (UnicodeDecodeError, AttributeError):
                        pass

                    if 'true' == v:
                        v = True
                    elif 'false' == v:
                        v = False

                    arr.append(v)
                query[key] = arr

        return query

    @query.setter
    def query(self, value):
        self._query = value

    async def __executed_result(self):
        if self.action in [CREATE, LIST]:
            return await self.__create_or_index()
        elif self.action in [DELETE, DETAIL, UPDATE]:
            return await self.__delete_show_or_update()

    async def __create_or_index(self):
        updated_options = await self.__updated_options()

        policy = self.__policy_class()(None, self.user, **updated_options)
        await policy.authorize_action(self.action)

        parser = None
        parser_class = self.__parser_class()
        if parser_class:
            parser = parser_class(
                resource=None,
                current_user=self.user,
                policy=policy,
                **updated_options,
            )

        if CREATE == self.action:
            def _build_authorize_attributes(parsed_value: Any, policy=policy) -> Callable:
                return policy.authorize_attributes(
                    WRITE,
                    parsed_value.keys(),
                    **parsed_value,
                )

            payload = self.__payload_for_resource()
            if parser:
                payload = await parser.parse_write_attributes_and_authorize(
                    payload,
                    _build_authorize_attributes,
                    **updated_options,
                )
            else:
                await _build_authorize_attributes(payload)

            options = updated_options.copy()
            options.pop('payload', None)

            return await self.__resource_class().process_create(
                payload,
                self.user,
                result_set_from_external=policy.result_set(),
                **options,
            )
        elif LIST == self.action:
            def _build_authorize_query(
                parsed_value: Any,
                policy=policy,
                updated_options=updated_options,
                **_kwargs,
            ) -> Callable:
                return policy.authorize_query(parsed_value, **ignore_keys(updated_options, [
                    'query',
                ]))

            if parser:
                value_parsed, parser_found, error = await parser.parse_query_and_authorize(
                    self.query,
                    _build_authorize_query,
                    **updated_options,
                )
                self.query = value_parsed
            else:
                await _build_authorize_query(self.query)

            options = updated_options.copy()
            options.pop('meta', None)
            options.pop('query', None)

            return await self.__resource_class().process_collection(
                self.query,
                self.meta,
                self.user,
                result_set_from_external=policy.result_set(),
                **options,
            )

    async def __delete_show_or_update(self):
        updated_options = await self.__updated_options()

        res = await self.__resource_class().process_member(
            self.pk,
            self.user,
            **updated_options,
        )

        policy = self.__policy_class()(res, self.user, **updated_options)
        await policy.authorize_action(self.action)

        parser = None
        parser_class = self.__parser_class()
        if parser_class:
            parser = parser_class(
                resource=res,
                current_user=self.user,
                policy=policy,
                **updated_options,
            )

        if DELETE == self.action:
            await res.process_delete(**updated_options)
        elif DETAIL == self.action:
            def _build_authorize_query(
                parsed_value: Any,
                policy=policy,
                updated_options=updated_options,
                **_kwargs,
            ) -> Callable:
                return policy.authorize_query(parsed_value, **ignore_keys(updated_options, [
                    'query',
                ]))

            if parser:
                value_parsed, parser_found, error = await parser.parse_query_and_authorize(
                    self.query,
                    _build_authorize_query,
                    return_on_first_failure=True,
                    **updated_options,
                )

                if error:
                    if parser_found:
                        self.query = value_parsed
                        res = await self.__resource_class().process_member(
                            self.pk,
                            self.user,
                            **merge_dict(updated_options, dict(query=self.query)),
                        )
                        policy = self.__policy_class()(res, self.user, **updated_options)
                        await policy.authorize_query(self.query, **ignore_keys(updated_options, [
                            'query',
                        ]))
                    else:
                        raise error
            else:
                await _build_authorize_query(self.query)

        elif UPDATE == self.action:
            def _build_authorize_attributes(parsed_value: Any, policy=policy) -> Callable:
                return policy.authorize_attributes(
                    WRITE,
                    parsed_value.keys(),
                    **parsed_value,
                )

            payload = self.__payload_for_resource()
            if parser:
                payload = await parser.parse_write_attributes_and_authorize(
                    payload,
                    _build_authorize_attributes,
                    **updated_options,
                )
            else:
                await _build_authorize_attributes(payload)

            def _build_authorize_query(
                parsed_value: Any,
                policy=policy,
                updated_options=updated_options,
                **_kwargs,
            ) -> Callable:
                return policy.authorize_query(parsed_value, **ignore_keys(updated_options, [
                    'query',
                ]))

            if parser:
                value_parsed, parser_found, error = await parser.parse_query_and_authorize(
                    self.query,
                    _build_authorize_query,
                    **updated_options,
                )
                self.query = value_parsed
            else:
                await _build_authorize_query(self.query, **updated_options)

            options = merge_dict(updated_options.copy(), dict(query=self.query))
            options.pop('payload', None)

            await res.process_update(payload, **options)

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

    def __parser_class(self) -> Union[BaseParser, None]:
        klass = self.__classified_class()
        module_name = f'mage_ai.api.parsers.{klass}Parser'
        class_name = f'{klass}Parser'

        try:
            return getattr(importlib.import_module(module_name), class_name)
        except ModuleNotFoundError:
            return None

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

    async def __parent_model(self):
        if self.resource_parent and self.resource_parent_id:
            parent_class = classify(singularize(self.resource_parent))
            parent_resource_class = getattr(
                importlib.import_module(
                    'mage_ai.api.resources.{}Resource'.format(parent_class)),
                '{}Resource'.format(parent_class),
            )
            try:
                model = parent_resource_class.get_model(self.resource_parent_id)
                if inspect.isawaitable(model):
                    model = await model
                return model
            except DoesNotExistError:
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

        for key in self.__resource_class().datetime_keys:
            if payload.get(key) is not None:
                if type(payload[key]) is str:
                    payload[key] = dateutil.parser.parse(payload[key])

        # Inject any cookies declared by the resource into the payload
        # - expecting a list of cookie names
        # - payload keys are contructed as COOKIE_PREFIX + <cookie_name>
        cookie_names = self.__resource_class().cookie_names
        if len(cookie_names) > 0:
            # Parse cookies
            cookies = None
            cookie_header = self.headers.get('Cookie')
            if cookie_header is not None:
                from http.cookies import SimpleCookie
                cookies = SimpleCookie()
                cookies.load(cookie_header)
            # Handle each cookie:
            # - remove any matching name from incoming payload, for security
            # - inject cookie values (if available)
            for cookie_name in cookie_names:
                payload_key = COOKIE_PREFIX + cookie_name
                payload.pop(payload_key, None)
                cookie = None
                if cookies is not None:
                    cookie = cookies.get(cookie_name)
                if cookie is not None:
                    payload[payload_key] = cookie.value

        return payload

    async def __present_results(self, results):
        updated_options = await self.__updated_options()
        data = updated_options.copy()
        data.update({'format': self.__presentation_format()})
        return await self.__presenter_class().present_resource(results, self.user, **data)

    def __presentation_format(self):
        if not self.__presentation_format_attr:
            self.__presentation_format_attr = (self.meta or {}).get(
                META_KEY_FORMAT, self.action)
        return self.__presentation_format_attr

    async def __updated_options(self):
        if not self.__updated_options_attr:
            self.__updated_options_attr = self.__combined_options().copy()
            self.__updated_options_attr.update({
                'api_operation_action': self.action,
                'oauth_client': self.oauth_client,
                'oauth_token': self.oauth_token,
                'parent_model': await self.__parent_model(),
            })
            self.__updated_options_attr.update(self.headers)
        return self.__updated_options_attr
