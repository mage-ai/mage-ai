from collections.abc import Iterable
from mage_ai import settings
from mage_ai.api.errors import ApiError
from mage_ai.api.oauth_scope import OauthScope
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION
from mage_ai.services.tracking.metrics import increment
from mage_ai.shared.environments import is_test
from mage_ai.shared.hash import extract
import importlib
import inflection

ALL_ACTIONS = 'all'


class BasePolicy():
    action_rules = {}
    query_rules = {}
    read_rules = {}
    write_rules = {}

    def __init__(self, resource, current_user, **kwargs):
        self.current_user = current_user
        self.options = kwargs
        self.resource = resource
        self.parent_model_attr = None
        self.parent_resource_attr = None
        if isinstance(resource, Iterable):
            self.resources = resource
        else:
            self.resources = [resource]

    @classmethod
    def action_rule(self, action):
        if not self.action_rules.get(self.__name__):
            self.action_rules[self.__name__] = {}
        return self.action_rules[self.__name__].get(action)

    @classmethod
    def query_rule(self, query):
        if not self.query_rules.get(self.__name__):
            self.query_rules[self.__name__] = {}
        return self.query_rules[self.__name__].get(query)

    @classmethod
    def read_rule(self, read):
        if not self.read_rules.get(self.__name__):
            self.read_rules[self.__name__] = {}
        return self.read_rules[self.__name__].get(read)

    @classmethod
    def write_rule(self, write):
        if not self.write_rules.get(self.__name__):
            self.write_rules[self.__name__] = {}
        return self.write_rules[self.__name__].get(write)

    @classmethod
    def allow_actions(self, array, **kwargs):
        if not self.action_rules.get(self.__name__):
            self.action_rules[self.__name__] = {}
        for key in array:
            if not self.action_rules[self.__name__].get(key):
                self.action_rules[self.__name__][key] = {}
            for scope in kwargs.get('scopes', []):
                self.action_rules[self.__name__][key][scope] = extract(kwargs, [
                                                                       'condition'])

    @classmethod
    def allow_query(self, array, **kwargs):
        if not self.query_rules.get(self.__name__):
            self.query_rules[self.__name__] = {}
        for key in array:
            if not self.query_rules[self.__name__].get(key):
                self.query_rules[self.__name__][key] = {}
            for scope in kwargs.get('scopes', []):
                self.query_rules[self.__name__][key][scope] = extract(kwargs, [
                                                                      'condition'])

    @classmethod
    def allow_read(self, array, **kwargs):
        if not self.read_rules.get(self.__name__):
            self.read_rules[self.__name__] = {}
        for key in array:
            if not self.read_rules[self.__name__].get(key):
                self.read_rules[self.__name__][key] = {}
            actions = kwargs.get('on_action', [ALL_ACTIONS])
            actions = actions if isinstance(actions, list) else [actions]
            for scope in kwargs.get('scopes', []):
                if not self.read_rules[self.__name__][key].get(scope):
                    self.read_rules[self.__name__][key][scope] = {}
                for action in actions:
                    self.read_rules[self.__name__][key][scope][action] = extract(kwargs, [
                                                                                 'condition'])

    @classmethod
    def allow_write(self, array, **kwargs):
        if not self.write_rules.get(self.__name__):
            self.write_rules[self.__name__] = {}
        for key in array:
            if not self.write_rules[self.__name__].get(key):
                self.write_rules[self.__name__][key] = {}
            actions = kwargs.get('on_action', [ALL_ACTIONS])
            actions = actions if isinstance(actions, list) else [actions]
            for scope in kwargs.get('scopes', []):
                if not self.write_rules[self.__name__][key].get(scope):
                    self.write_rules[self.__name__][key][scope] = {}
                for action in actions:
                    self.write_rules[self.__name__][key][scope][action] = extract(kwargs, [
                                                                                  'condition'])

    @classmethod
    def resource_name(self):
        return inflection.pluralize(self.resource_name_singular())

    @classmethod
    def resource_name_singular(self):
        return inflection.underscore(
            self.__name__.replace(
                'Policy', '')).lower()

    def is_admin(self):
        return (self.current_user and self.current_user.owner) or \
            (not REQUIRE_USER_AUTHENTICATION and not is_test())

    def authorize_action(self, action):
        if self.is_admin():
            return True

        config = self.__class__.action_rule(action)
        if config:
            self.__validate_scopes(action, config.keys())
            if config.get(self.__current_scope(), {}).get('condition'):
                self.__validate_condition(
                    action, config[self.__current_scope()]['condition'])
        else:
            error = ApiError.UNAUTHORIZED_ACCESS
            error.update({'message': 'The {} action is disabled for {}.'.format(
                action, self.resource_name()), })
            raise ApiError(error)

    def authorize_attribute(self, read_or_write, attrb, **kwargs):
        if self.is_admin():
            return True

        api_operation_action = self.options.get(
            'api_operation_action',
            kwargs.get('api_operation_action', ALL_ACTIONS),
        )
        if 'read' == read_or_write:
            orig_config = self.__class__.read_rule(attrb)
        else:
            orig_config = self.__class__.write_rule(attrb)

        config = None
        if orig_config:
            self.__validate_scopes(attrb, orig_config.keys())
            config_scope = orig_config.get(self.__current_scope(), {})
            config = config_scope.get(api_operation_action)

            if config is None:
                config = config_scope.get(ALL_ACTIONS)

        if config is None:
            error = ApiError.UNAUTHORIZED_ACCESS
            error.update({
                'message': '{} of {} on {} is disabled for {}.'.format(
                    read_or_write,
                    attrb,
                    api_operation_action,
                    self.__class__.resource_name(),
                ),
            })
            raise ApiError(error)
        cond = config.get('condition')
        if cond:
            self.__validate_condition(attrb, cond, **kwargs)

    def authorize_attributes(self, read_or_write, attrbs, **kwargs):
        if self.is_admin():
            return True
        for attrb in attrbs:
            self.authorize_attribute(read_or_write, attrb, **kwargs)

    def authorize_query(self, query):
        if not query:
            return

        for key, value in query.items():
            if key != settings.QUERY_API_KEY:
                error_message = 'Query parameter {} of value {} is not permitted.'.format(
                    key, value)
                config = self.__class__.query_rule(key)

                if not config:
                    error = ApiError.UNAUTHORIZED_ACCESS
                    error.update({
                        'message': error_message,
                    })
                    raise ApiError(error)
                elif config.get(self.__current_scope(), {}).get('condition'):
                    self.__validate_condition(
                        key,
                        config[self.__current_scope()]['condition'],
                        message=error_message,
                    )

    def parent_model(self):
        if not self.parent_model_attr:
            self.parent_model_attr = self.options.get('parent_model', None)
        return self.parent_model_attr

    def parent_resource(self):
        if not self.parent_resource_attr and self.parent_model():
            parent_model_class = inflection.singularize(
                self.parent_model().__class__.__name__,
            )
            self.parent_resource_attr = getattr(
                importlib.import_module(
                    'mage_ai.api.resources.{}Resource'.format(parent_model_class)),
                '{}Resource'.format(parent_model_class),
            )(self.parent_model(), self.current_user, **self.options)
        return self.parent_resource_attr

    def __current_scope(self):
        if self.current_user:
            return OauthScope.CLIENT_PRIVATE
        else:
            return OauthScope.CLIENT_PUBLIC

    def __validate_condition(self, action, cond, **kwargs):
        if cond and not cond(self):
            error = ApiError.UNAUTHORIZED_ACCESS
            error.update({
                'message': kwargs.get(
                    'message',
                    'Unauthorized access for {}, failed condition.'.format(action),
                ),
            })
            increment(
                'api_error.unauthorized_access',
                tags={
                    'action': action,
                    'policy_class_name': self.__class__.__name__,
                    'id': self.resource.id if hasattr(
                        self.resource,
                        'id') else None,
                })
            if settings.DEBUG:
                error['debug'] = {
                    'action': action,
                }
            raise ApiError(error)

    def __validate_scopes(self, val, scopes):
        error = ApiError.UNAUTHORIZED_ACCESS
        if OauthScope.CLIENT_ALL in scopes:
            return
        elif not self.current_user and OauthScope.CLIENT_PUBLIC not in scopes:
            error.update({
                'message': 'Private access for {} only, invalid scope.'.format(val),
            })
            if settings.DEBUG:
                error['debug'] = {
                    'class': self.__class__.__name__,
                    'scopes': scopes,
                }
            raise ApiError(error)
        elif self.current_user and OauthScope.CLIENT_PRIVATE not in scopes:
            error.update({
                'message': 'Public access for {} only, invalid scope.'.format(val),
            })
            if settings.DEBUG:
                error['debug'] = {
                    'scopes': scopes,
                }
            raise ApiError(error)
