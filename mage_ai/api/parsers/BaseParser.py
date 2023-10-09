import inspect
from collections.abc import Iterable
from typing import Any, Callable, Dict, List, Tuple, Union

from mage_ai.api.constants import AuthorizeStatusType
from mage_ai.api.errors import ApiError
from mage_ai.api.oauth_scope import OauthScope, OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.orchestration.db.models.oauth import User


class BaseParser:
    query_parsers = {}
    read_parsers = {}
    write_parsers = {}

    def __init__(
        self,
        resource: BaseResource,
        current_user: User,
        policy: BasePolicy,
        **kwargs,
    ):
        self.current_user = current_user
        self.options = kwargs
        self.resource = resource
        if isinstance(resource, Iterable):
            self.resources = resource
        else:
            self.resources = [resource]
        self.policy = policy

    @classmethod
    def query_parser(self, query_parameter: str) -> Dict:
        if not self.query_parsers.get(self.__name__):
            self.query_parsers[self.__name__] = {}
        return self.query_parsers[self.__name__].get(query_parameter)

    @classmethod
    def read_parser(self, resource_attribute: str) -> Dict:
        if not self.read_parsers.get(self.__name__):
            self.read_parsers[self.__name__] = {}
        return self.read_parsers[self.__name__].get(resource_attribute)

    @classmethod
    def write_parser(self, resource_attribute: str) -> Dict:
        if not self.write_parsers.get(self.__name__):
            self.write_parsers[self.__name__] = {}
        return self.write_parsers[self.__name__].get(resource_attribute)

    @classmethod
    def parse_query(
        self,
        parser: Callable[['BaseParser', Any, Union[ApiError], Dict], Any],
        on_action: Union[List[OperationType], OperationType] = None,
        on_authorize_status: Union[List[AuthorizeStatusType], AuthorizeStatusType] = None,
        scopes: List[OauthScopeType] = None,
    ) -> None:
        if not self.query_parsers.get(self.__name__):
            self.query_parsers[self.__name__] = {}

        actions = on_action or [OperationType.ALL.value]
        if not isinstance(actions, list):
            actions = [actions]

        authorize_statuses = on_authorize_status or [AuthorizeStatusType.ALL.value]
        if not isinstance(authorize_statuses, list):
            authorize_statuses = [authorize_statuses]

        for scope in (scopes or [OauthScopeType.ALL]):
            if not self.query_parsers[self.__name__].get(scope):
                self.query_parsers[self.__name__][scope] = {}

            for action in actions:
                if not self.query_parsers[self.__name__][scope].get(action):
                    self.query_parsers[self.__name__][scope][action] = {}

                for authorize_status in authorize_statuses:
                    self.query_parsers[self.__name__][scope][action][authorize_status] = parser

    @classmethod
    def parse_read(
        self,
        parser: Callable[['BaseParser', Any, Union[ApiError, Dict]], Any],
        on_action: Union[List[OperationType], OperationType] = None,
        on_authorize_status: Union[List[AuthorizeStatusType], AuthorizeStatusType] = None,
        scopes: List[OauthScopeType] = None,
    ) -> None:
        if not self.read_parsers.get(self.__name__):
            self.read_parsers[self.__name__] = {}

        actions = on_action or [OperationType.ALL.value]
        if not isinstance(actions, list):
            actions = [actions]

        authorize_statuses = on_authorize_status or [AuthorizeStatusType.ALL.value]
        if not isinstance(authorize_statuses, list):
            authorize_statuses = [authorize_statuses]

        for scope in (scopes or [OauthScopeType.ALL]):
            if not self.read_parsers[self.__name__].get(scope):
                self.read_parsers[self.__name__][scope] = {}

            for action in actions:
                if not self.read_parsers[self.__name__][scope].get(action):
                    self.read_parsers[self.__name__][scope][action] = {}

                for authorize_status in authorize_statuses:
                    self.read_parsers[self.__name__][scope][action][authorize_status] = parser

    @classmethod
    def parse_write(
        self,
        parser: Callable[['BaseParser', Any, Union[ApiError, Dict]], Any],
        on_action: Union[List[OperationType], OperationType] = None,
        on_authorize_status: Union[List[AuthorizeStatusType], AuthorizeStatusType] = None,
        scopes: List[OauthScopeType] = None,
    ) -> None:
        if not self.write_parsers.get(self.__name__):
            self.write_parsers[self.__name__] = {}

        actions = on_action or [OperationType.ALL.value]
        if not isinstance(actions, list):
            actions = [actions]

        authorize_statuses = on_authorize_status or [AuthorizeStatusType.ALL.value]
        if not isinstance(authorize_statuses, list):
            authorize_statuses = [authorize_statuses]

        for scope in (scopes or [OauthScopeType.ALL]):
            if not self.write_parsers[self.__name__].get(scope):
                self.write_parsers[self.__name__][scope] = {}

            for action in actions:
                if not self.write_parsers[self.__name__][scope].get(action):
                    self.write_parsers[self.__name__][scope][action] = {}

                for authorize_status in authorize_statuses:
                    self.write_parsers[self.__name__][scope][action][authorize_status] = parser

    async def parse_query_and_authorize(
        self,
        value: Any,
        build_authorize: Callable,
        return_on_first_failure: bool = False,
        **kwargs,
    ) -> Tuple[Any, bool, ApiError]:
        authorize_status = None
        error = None

        try:
            await build_authorize(value)
            authorize_status = AuthorizeStatusType.SUCCEEDED
        except ApiError as err:
            error = err
            authorize_status = AuthorizeStatusType.FAILED

        value_parsed, parser_found = await self.__parse(
            self.query_parsers.get(self.__class__.__name__) or {},
            value,
            authorize_status,
            error=error,
            **kwargs,
        )

        if error and return_on_first_failure:
            return value_parsed, parser_found, error

        if error:
            if parser_found:
                await build_authorize(value_parsed)
            else:
                raise error

        return value_parsed, parser_found, None

    async def parse_read_attributes_and_authorize(
        self,
        value: Any,
        build_authorize: Callable,
        **kwargs,
    ) -> Any:
        authorize_status = None
        error = None

        try:
            await build_authorize(value)
            authorize_status = AuthorizeStatusType.SUCCEEDED
        except ApiError as err:
            error = err
            authorize_status = AuthorizeStatusType.FAILED

        value_parsed, parser_found = await self.__parse(
            self.read_parsers.get(self.__class__.__name__) or {},
            value,
            authorize_status,
            **kwargs,
        )

        if error:
            if parser_found:
                await build_authorize(value_parsed)
            else:
                raise error

        return value_parsed

    async def parse_write_attributes_and_authorize(
        self,
        value: Any,
        build_authorize: Callable,
        **kwargs,
    ) -> Any:
        authorize_status = None
        error = None

        try:
            await build_authorize(value)
            authorize_status = AuthorizeStatusType.SUCCEEDED
        except ApiError as err:
            error = err
            authorize_status = AuthorizeStatusType.FAILED

        value_parsed, parser_found = await self.__parse(
            self.write_parsers.get(self.__class__.__name__) or {},
            value,
            authorize_status,
            **kwargs,
        )

        if error:
            if parser_found:
                await build_authorize(value_parsed)
            else:
                raise error

        return value_parsed

    async def __parse(
        self,
        parser_mapping: Dict,
        value: Any,
        authorize_status: AuthorizeStatusType,
        error: ApiError = None,
        **kwargs,
    ) -> Tuple[Any, bool]:
        api_operation_action = self.options.get('api_operation_action') or \
            kwargs.get('api_operation_action') or \
            OperationType.ALL

        parser = None
        parser_scope = parser_mapping.get(self.__current_scope()) or {}
        if parser_scope:
            parser_action = parser_scope.get(
                api_operation_action,
            ) or parser_scope.get(OperationType.ALL)
            if parser_action:
                parser = parser_action.get(
                    authorize_status,
                ) or parser_action.get(AuthorizeStatusType.ALL)

        if not parser:
            return value, False

        value_parsed = parser(self, value, authorize_status=authorize_status, error=error, **kwargs)

        if value_parsed and inspect.isawaitable(value_parsed):
            value_parsed = await value_parsed

        return value_parsed, True

    def __current_scope(self) -> OauthScope:
        return self.policy.current_scope()
