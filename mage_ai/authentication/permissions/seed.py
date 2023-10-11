import importlib
import json
import os

from mage_ai.api import policies
from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.orchestration.db.models.oauth import User


def condition_is_for_owner(policy_class, condition):
    policy_f = policy_class(None, User(_owner=False))
    policy_t = policy_class(None, User(_owner=True))

    return condition(policy_f) is policy_f.is_owner() and \
        condition(policy_t) is policy_t.is_owner()


def condition_is_for_admin(policy_class, condition):
    policy_f = policy_class(None, User(roles=0))
    policy_t = policy_class(None, User(roles=1))

    return condition(policy_f) is policy_f.has_at_least_admin_role() and \
        condition(policy_t) is policy_t.has_at_least_admin_role()


def condition_is_for_viewer(policy_class, condition):
    policy_f = policy_class(None, User(roles=0))
    policy_t = policy_class(None, User(roles=4))

    return condition(policy_f) is policy_f.has_at_least_viewer_role() and \
        condition(policy_t) is policy_t.has_at_least_viewer_role()


def condition_is_for_editor(policy_class, condition):
    policy_f = policy_class(None, User(roles=0))
    policy_t = policy_class(None, User(roles=2))

    return condition(policy_f) is policy_f.has_at_least_editor_role() and \
        condition(policy_t) is policy_t.has_at_least_editor_role()


def condition_is_for_editor_notebook_edit_access(policy_class, condition):
    policy_f = policy_class(None, User(roles=2))
    policy_f.disable_notebook_edit_access_override = 1
    policy_t = policy_class(None, User(roles=2))
    policy_t.disable_notebook_edit_access_override = 2

    return condition(policy_f) is policy_f.has_at_least_editor_role_and_notebook_edit_access() and \
        condition(policy_t) is policy_t.has_at_least_editor_role_and_notebook_edit_access() and \
        condition(policy_f) is policy_f.has_at_least_editor_role_and_pipeline_edit_access() and \
        condition(policy_t) is not policy_t.has_at_least_editor_role_and_pipeline_edit_access()


def condition_is_for_editor_pipeline_edit_access(policy_class, condition):
    policy_f = policy_class(None, User(roles=2))
    policy_f.disable_notebook_edit_access_override = 2
    policy_t = policy_class(None, User(roles=2))
    policy_t.disable_notebook_edit_access_override = 0

    return condition(policy_f) is policy_f.has_at_least_editor_role_and_pipeline_edit_access() and \
        condition(policy_t) is policy_t.has_at_least_editor_role_and_pipeline_edit_access() and \
        condition(policy_f) is not \
        policy_f.has_at_least_editor_role_and_notebook_edit_access() and \
        condition(policy_t) is policy_t.has_at_least_editor_role_and_notebook_edit_access()


def get_key(policy_class, condition):
    key = 'no_condition'

    if condition:
        admin = condition_is_for_admin(policy_class, condition)
        editor = condition_is_for_editor(policy_class, condition)
        editor_notebook = condition_is_for_editor_notebook_edit_access(
            policy_class,
            condition,
        )
        editor_pipeline = condition_is_for_editor_pipeline_edit_access(
            policy_class,
            condition,
        )
        owner = condition_is_for_owner(policy_class, condition)
        viewer = condition_is_for_viewer(policy_class, condition)

        if viewer:
            key = 'viewer'
        elif editor and not editor_notebook and not editor_pipeline:
            key = 'editor'
        elif editor and editor_notebook and not editor_pipeline:
            key = 'editor_notebook'
        elif editor and not editor_notebook and editor_pipeline:
            key = 'editor_pipeline'
        elif admin:
            key = 'admin'
        elif owner:
            key = 'owner'

    return key


def action_rules(policy_class):
    operations_mapping = {}

    for operation in OperationType:
        config = policy_class.action_rules[policy_class.__name__].get(operation)
        if not config:
            continue

        for scope in OauthScopeType:
            config2 = config.get(scope)
            if config2 is None:
                continue

            if scope not in operations_mapping:
                operations_mapping[scope] = {}

            condition = config2.get('condition')
            key = get_key(policy_class, condition)

            if key not in operations_mapping[scope]:
                operations_mapping[scope][key] = []

            operations_mapping[scope][key].append(operation)

    return operations_mapping


def attribute_rules(policy_class, rules):
    mapping = {}

    rules_by_attribute = rules.get(policy_class.__name__) or {}

    for attribute, rule in rules_by_attribute.items():
        for scope in OauthScopeType:
            config = rule.get(scope)
            if config is None:
                continue

            if scope not in mapping:
                mapping[scope] = {}

            for operation in OperationType:
                config2 = config.get(operation)

                if config2 is None:
                    continue

                condition = config2.get('condition') if config2 else None
                key = get_key(policy_class, condition)

                if key not in mapping[scope]:
                    mapping[scope][key] = {}

                if operation not in mapping[scope][key]:
                    mapping[scope][key][operation] = []

                mapping[scope][key][operation].append(attribute)

    return mapping


if __name__ == '__main__':
    action_rules_mapping = {}
    query_rules_mapping = {}
    read_rules_mapping = {}
    write_rules_mapping = {}

    policy_names = []
    for n in os.listdir(policies.__path__[0]):
        if not n.startswith('BasePolicy.py') and \
                not n.startswith('UserPolicy.py') and \
                n.endswith('Policy.py'):

            policy_names.append(n.replace('Policy.py', ''))

    for policy_name in policy_names:
        policy_class = getattr(
            importlib.import_module(f'mage_ai.api.policies.{policy_name}Policy'),
            f'{policy_name}Policy',
        )

        model_name = policy_class.model_name()
        action_rules_mapping[model_name] = action_rules(policy_class)
        query_rules_mapping[model_name] = attribute_rules(
            policy_class,
            policy_class.query_rules,
        )
        read_rules_mapping[model_name] = attribute_rules(
            policy_class,
            policy_class.read_rules,
        )
        write_rules_mapping[model_name] = attribute_rules(
            policy_class,
            policy_class.write_rules,
        )

    for filename, mapping in [
        ('operations', action_rules_mapping),
        ('query', query_rules_mapping),
        ('read', read_rules_mapping),
        ('write', write_rules_mapping),
    ]:
        with open(f'seed_{filename}.json', 'w') as f:
            f.write(json.dumps(mapping, indent=2))
