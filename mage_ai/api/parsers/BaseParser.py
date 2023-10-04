import inspect
from collections.abc import Iterable
from typing import Any, Callable, Dict, List

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
        parser: Callable[['BaseParser', Any, Dict], Any],
        on_action: List[OperationType] = None,
        scopes: List[OauthScopeType] = None,
    ) -> None:
        if not self.query_parsers.get(self.__name__):
            self.query_parsers[self.__name__] = {}

        actions = on_action or OperationType.ALL
        if not isinstance(actions, list):
            actions = [actions]

        for scope in (scopes or [OauthScopeType.ALL]):
            if not self.query_parsers[self.__name__].get(scope):
                self.query_parsers[self.__name__][scope] = {}

            for action in actions:
                self.query_parsers[self.__name__][scope][action] = parser

    @classmethod
    def parse_read(
        self,
        parser: Callable[['BaseParser', Any, Dict], Any],
        on_action: List[OperationType] = None,
        scopes: List[OauthScopeType] = None,
    ) -> None:
        if not self.read_parsers.get(self.__name__):
            self.read_parsers[self.__name__] = {}

        actions = on_action or OperationType.ALL
        if not isinstance(actions, list):
            actions = [actions]

        for scope in (scopes or [OauthScopeType.ALL]):
            if not self.read_parsers[self.__name__].get(scope):
                self.read_parsers[self.__name__][scope] = {}

            for action in actions:
                self.read_parsers[self.__name__][scope][action] = parser

    @classmethod
    def parse_write(
        self,
        parser: Callable[['BaseParser', Any, Dict], Any],
        on_action: List[OperationType] = None,
        scopes: List[OauthScopeType] = None,
    ) -> None:
        if not self.write_parsers.get(self.__name__):
            self.write_parsers[self.__name__] = {}

        actions = on_action or OperationType.ALL
        if not isinstance(actions, list):
            actions = [actions]

        for scope in (scopes or [OauthScopeType.ALL]):
            if not self.write_parsers[self.__name__].get(scope):
                self.write_parsers[self.__name__][scope] = {}

            for action in actions:
                self.write_parsers[self.__name__][scope][action] = parser

    async def parse_query_values(self, value: Any, **kwargs) -> Any:
        return await self.__parse(
            self.query_parsers[self.__class__.__name__] or {},
            value,
            **kwargs,
        )

    async def parse_read_attributes(self, value: Any, **kwargs) -> Any:
        return await self.__parse(
            self.read_parsers[self.__class__.__name__] or {},
            value,
            **kwargs,
        )

    async def parse_write_attributes(self, value: Any, **kwargs) -> Any:
        return await self.__parse(
            self.write_parsers[self.__class__.__name__] or {},
            value,
            **kwargs,
        )

    async def __parse(
        self,
        parser_mapping: Dict,
        value: Any,
        **kwargs,
    ) -> Any:
        api_operation_action = self.options.get('api_operation_action') or \
            kwargs.get('api_operation_action') or \
            OperationType.ALL

        parser = None
        parser_scope = parser_mapping.get(self.__current_scope()) or {}
        if parser_scope:
            parser = parser_scope.get(api_operation_action) or parser_scope.get(OperationType.ALL)

        if not parser:
            return value

        value_parsed = parser(self, value, **kwargs)

        if value_parsed and inspect.isawaitable(value_parsed):
            value_parsed = await value_parsed

        return value_parsed

    def __current_scope(self) -> OauthScope:
        return self.policy.current_scope()
