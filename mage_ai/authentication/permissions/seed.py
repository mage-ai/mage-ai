import asyncio
import importlib
import inspect
import logging
import os

from mage_ai.api import policies
from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.presenters.UserPresenter import UserPresenter
from mage_ai.authentication.permissions.constants import (
    EntityName,
    PermissionAccess,
    PermissionCondition,
)
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, Role, RolePermission, User

KEY_ADMIN = 'admin'
KEY_EDITOR = 'editor'
KEY_EDITOR_NOTEBOOK = 'editor_notebook'
KEY_EDITOR_PIPELINE = 'editor_pipeline'
KEY_NO_CONDITION = 'no_condition'
KEY_OWNER = 'owner'
KEY_VIEWER = 'viewer'

ROLE_NAME_TO_KEY = {
    KEY_ADMIN: 'Admin default permissions',
    KEY_EDITOR: 'Editor default permissions',
    KEY_EDITOR_NOTEBOOK: 'Editor with notebook edit access',
    KEY_EDITOR_PIPELINE: 'Editor with pipeline edit access',
    KEY_OWNER: 'Owner default permissions',
    KEY_VIEWER: 'Viewer default permissions',
}


logger = logging.getLogger(__name__)


async def evaluate_condition(condition):
    if condition and inspect.isawaitable(condition):
        condition = await condition
    return condition


async def condition_is_for_owner(policy_class, condition):
    policy_f = policy_class(None, User(_owner=False))
    policy_t = policy_class(None, User(_owner=True))

    return all([
        await evaluate_condition(condition(policy_f)) is policy_f.is_owner(),
        await evaluate_condition(condition(policy_t)) is policy_t.is_owner(),
    ])


async def condition_is_for_admin(policy_class, condition):
    policy_f = policy_class(None, User(roles=0))
    policy_t = policy_class(None, User(roles=1))

    return all([
        await evaluate_condition(condition(policy_f)) is policy_f.has_at_least_admin_role(),
        await evaluate_condition(condition(policy_t)) is policy_t.has_at_least_admin_role(),
    ])


async def condition_is_for_viewer(policy_class, condition):
    policy_f = policy_class(None, User(roles=0))
    policy_t = policy_class(None, User(roles=4))

    return all([
        await evaluate_condition(condition(policy_f)) is policy_f.has_at_least_viewer_role(),
        await evaluate_condition(condition(policy_t)) is policy_t.has_at_least_viewer_role(),
    ])


async def condition_is_for_editor(policy_class, condition):
    policy_f = policy_class(None, User(roles=0))
    policy_t = policy_class(None, User(roles=2))

    return all([
        await evaluate_condition(condition(policy_f)) is policy_f.has_at_least_editor_role(),
        await evaluate_condition(condition(policy_t)) is policy_t.has_at_least_editor_role(),
    ])


async def condition_is_for_editor_notebook_edit_access(policy_class, condition):
    policy_f = policy_class(None, User(roles=2))
    policy_f.disable_notebook_edit_access_override = 1
    policy_t = policy_class(None, User(roles=2))
    policy_t.disable_notebook_edit_access_override = 2

    return all([
        await evaluate_condition(
            condition(policy_f),
        ) is policy_f.has_at_least_editor_role_and_notebook_edit_access(),
        await evaluate_condition(
            condition(policy_t),
        ) is policy_t.has_at_least_editor_role_and_notebook_edit_access(),
        await evaluate_condition(
            condition(policy_f),
        ) is policy_f.has_at_least_editor_role_and_pipeline_edit_access(),
        await evaluate_condition(
            condition(policy_t),
        ) is not policy_t.has_at_least_editor_role_and_pipeline_edit_access(),
    ])


async def condition_is_for_editor_pipeline_edit_access(policy_class, condition):
    policy_f = policy_class(None, User(roles=2))
    policy_f.disable_notebook_edit_access_override = 2
    policy_t = policy_class(None, User(roles=2))
    policy_t.disable_notebook_edit_access_override = 0

    return all([
        await evaluate_condition(
            condition(policy_f),
        ) is policy_f.has_at_least_editor_role_and_pipeline_edit_access(),
        await evaluate_condition(
            condition(policy_t),
        ) is policy_t.has_at_least_editor_role_and_pipeline_edit_access(),
        await evaluate_condition(
            condition(policy_f),
        ) is not policy_f.has_at_least_editor_role_and_notebook_edit_access(),
        await evaluate_condition(
            condition(policy_t),
        ) is policy_t.has_at_least_editor_role_and_notebook_edit_access(),
    ])


async def get_key(policy_class, condition):
    key = KEY_NO_CONDITION

    if condition:
        admin = await condition_is_for_admin(policy_class, condition)
        editor = await condition_is_for_editor(policy_class, condition)
        editor_notebook = await condition_is_for_editor_notebook_edit_access(
            policy_class,
            condition,
        )
        editor_pipeline = await condition_is_for_editor_pipeline_edit_access(
            policy_class,
            condition,
        )
        owner = await condition_is_for_owner(policy_class, condition)
        viewer = await condition_is_for_viewer(policy_class, condition)

        if viewer:
            key = KEY_VIEWER
        elif editor and not editor_notebook and not editor_pipeline:
            key = KEY_EDITOR
        elif editor and editor_notebook and not editor_pipeline:
            key = KEY_EDITOR_NOTEBOOK
        elif editor and not editor_notebook and editor_pipeline:
            key = KEY_EDITOR_PIPELINE
        elif admin:
            key = KEY_ADMIN
        elif owner:
            key = KEY_OWNER

    return key


async def action_rules(policy_class):
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

            if not isinstance(config2, list):
                config2 = [config2]

            for c in config2:
                condition = c.get('condition')
                key = await get_key(policy_class, condition)

                if key not in operations_mapping[scope]:
                    operations_mapping[scope][key] = []

                operations_mapping[scope][key].append(operation)

    return operations_mapping


async def attribute_rules(policy_class, rules):
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

                if not isinstance(config2, list):
                    config2 = [config2]

                for c in config2:
                    condition = c.get('condition')
                    key = await get_key(policy_class, condition)

                    if key not in mapping[scope]:
                        mapping[scope][key] = {}

                    if operation not in mapping[scope][key]:
                        mapping[scope][key][operation] = []

                    mapping[scope][key][operation].append(attribute)

    return mapping


def bootstrap_permissions_sync(policy_names: str = None):
    loop = asyncio.get_event_loop()
    if loop is not None:
        loop.create_task(bootstrap_permissions(policy_names))
    else:
        asyncio.run(bootstrap_permissions(policy_names))


@safe_db_query
async def bootstrap_permissions(policy_names: str = None):
    action_rules_mapping = {}
    query_rules_mapping = {}
    read_rules_mapping = {}
    write_rules_mapping = {}

    if policy_names is None:
        policy_names = []
        for n in os.listdir(policies.__path__[0]):
            if n.endswith('Policy.py') and n not in [
                'AsyncBasePolicy.py',
                'BasePolicy.py',
                'SeedPolicy.py',
                'UserPolicy.py',
            ]:
                policy_names.append(n.replace('Policy.py', ''))

    for policy_name in policy_names:
        policy_class = getattr(
            importlib.import_module(f'mage_ai.api.policies.{policy_name}Policy'),
            f'{policy_name}Policy',
        )

        model_name = policy_class.model_name()
        logger.info(f'Processing {model_name}...')
        action_rules_mapping[model_name] = await action_rules(policy_class)
        query_rules_mapping[model_name] = await attribute_rules(
            policy_class,
            policy_class.query_rules,
        )
        read_rules_mapping[model_name] = await attribute_rules(
            policy_class,
            policy_class.read_rules,
        )
        write_rules_mapping[model_name] = await attribute_rules(
            policy_class,
            policy_class.write_rules,
        )

    # for filename, mapping in [
    #     ('operations', action_rules_mapping),
    #     ('query', query_rules_mapping),
    #     ('read', read_rules_mapping),
    #     ('write', write_rules_mapping),
    # ]:
    #     with open(f'seed_{filename}.json', 'w') as f:
    #         f.write(json.dumps(mapping, indent=2))

    permissions_mapping = {
        KEY_ADMIN: [
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.DETAIL,
                    PermissionAccess.LIST,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.READ,
                    PermissionAccess.OPERATION_ALL,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    read_attributes=UserPresenter.default_attributes,
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.READ,
                    PermissionAccess.DETAIL,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    read_attributes=UserPresenter.default_attributes + [
                        'permissions',
                        'token',
                    ],
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.WRITE,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    write_attributes=[
                        'avatar',
                        'email',
                        'first_name',
                        'last_name',
                        'password',
                        'password_confirmation',
                        'password_current',
                        'username',
                    ],
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.WRITE,
                    PermissionAccess.DELETE,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    write_attributes=[
                        'role_ids',
                        'roles',
                        'roles_new',
                    ],
                ),
            ),
        ],
        KEY_EDITOR: [],
        KEY_EDITOR_NOTEBOOK: [],
        KEY_EDITOR_PIPELINE: [],
        KEY_NO_CONDITION: [],
        KEY_OWNER: [
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.CREATE,
                    PermissionAccess.DELETE,
                ]),
                entity_name=EntityName.User,
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.READ,
                    PermissionAccess.CREATE,
                    PermissionAccess.DELETE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    read_attributes=UserPresenter.default_attributes + [
                        'permissions',
                        'token',
                    ],
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.WRITE,
                    PermissionAccess.CREATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    write_attributes=[
                        'avatar',
                        'email',
                        'first_name',
                        'last_name',
                        'password',
                        'password_confirmation',
                        'role_ids',
                        'roles',
                        'roles_new',
                        'username',
                    ],
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.WRITE,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    write_attributes=[
                        'owner',
                    ],
                ),
            ),
        ],
        KEY_VIEWER: [
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.DETAIL,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    conditions=[
                        PermissionCondition.USER_OWNS_ENTITY,
                    ],
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.READ,
                    PermissionAccess.OPERATION_ALL,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    conditions=[
                        PermissionCondition.USER_OWNS_ENTITY,
                    ],
                    read_attributes=UserPresenter.default_attributes,
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.READ,
                    PermissionAccess.DETAIL,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    conditions=[
                        PermissionCondition.USER_OWNS_ENTITY,
                    ],
                    read_attributes=UserPresenter.default_attributes + [
                        'permissions',
                        'token',
                    ],
                ),
            ),
            dict(
                access=Permission.add_accesses([
                    PermissionAccess.WRITE,
                    PermissionAccess.UPDATE,
                ]),
                entity_name=EntityName.User,
                options=dict(
                    conditions=[
                        PermissionCondition.USER_OWNS_ENTITY,
                    ],
                    write_attributes=[
                        'avatar',
                        'email',
                        'first_name',
                        'last_name',
                        'password',
                        'password_confirmation',
                        'password_current',
                        'username',
                    ],
                ),
            ),
        ],
    }

    for entity_name, rules_by_scope in action_rules_mapping.items():
        rules = rules_by_scope.get(OauthScopeType.CLIENT_PRIVATE)
        if rules is None:
            continue

        for key, operations in rules.items():
            for operation in operations:
                access = 0

                if OperationType.ALL == operation:
                    access = PermissionAccess.OPERATION_ALL
                elif OperationType.CREATE == operation:
                    access = PermissionAccess.CREATE
                elif OperationType.DELETE == operation:
                    access = PermissionAccess.DELETE
                elif OperationType.DETAIL == operation:
                    access = PermissionAccess.DETAIL
                elif OperationType.LIST == operation:
                    access = PermissionAccess.LIST
                elif OperationType.UPDATE == operation:
                    access = PermissionAccess.UPDATE

                permission = dict(
                    access=access,
                    entity_name=entity_name,
                )
                permissions_mapping[key].append(permission)

    for mapping, access_attribute_operation, options_key in [
        (
            query_rules_mapping,
            PermissionAccess.QUERY,
            'query_attributes',
        ),
        (
            read_rules_mapping,
            PermissionAccess.READ,
            'read_attributes',
        ),
        (
            write_rules_mapping,
            PermissionAccess.WRITE,
            'write_attributes',
        ),
    ]:
        for entity_name, rules_by_scope in mapping.items():
            rules = rules_by_scope.get(OauthScopeType.CLIENT_PRIVATE)
            if rules is None:
                continue

            for key, attributes_by_operation in rules.items():
                for operation, attributes in attributes_by_operation.items():
                    access = 0

                    if OperationType.ALL == operation:
                        access = PermissionAccess.OPERATION_ALL
                    elif OperationType.CREATE == operation:
                        access = PermissionAccess.CREATE
                    elif OperationType.DELETE == operation:
                        access = PermissionAccess.DELETE
                    elif OperationType.DETAIL == operation:
                        access = PermissionAccess.DETAIL
                    elif OperationType.LIST == operation:
                        access = PermissionAccess.LIST
                    elif OperationType.UPDATE == operation:
                        access = PermissionAccess.UPDATE

                    permission = dict(
                        access=Permission.add_accesses([
                            access,
                            access_attribute_operation,
                        ]),
                        entity_name=entity_name,
                        options={
                            options_key: attributes,
                        }
                    )
                    permissions_mapping[key].append(permission)

    # print(json.dumps(permissions_mapping, indent=2))

    for key, role_name in ROLE_NAME_TO_KEY.items():
        permissions_existing = []
        permissions_new = []

        permissions_dicts = permissions_mapping[key]
        for permission_dict in permissions_dicts:
            arr = Permission.query.filter(
                Permission.access == permission_dict['access'],
                Permission.entity_name == permission_dict['entity_name'],
            ).all()

            permission = None

            options = permission_dict.get('options') or {}
            if KEY_EDITOR_NOTEBOOK == key:
                options['conditions'] = [PermissionCondition.HAS_NOTEBOOK_EDIT_ACCESS]
            elif KEY_EDITOR_PIPELINE == key:
                options['conditions'] = [PermissionCondition.HAS_PIPELINE_EDIT_ACCESS]

            if arr and len(arr) >= 1:
                if options:
                    arr = list(filter(
                        lambda x: x.options and x.options == options,
                        arr,
                    ))
                    if arr and len(arr) >= 1:
                        permission = arr[0]
                else:
                    permission = arr[0]

            if permission:
                permissions_existing.append(permission)
            else:
                permission = Permission(
                    access=permission_dict['access'],
                    entity_name=permission_dict['entity_name'],
                    options=options,
                )
                permissions_new.append(permission)

        roles = Role.query.filter(Role.name == role_name).all()
        if roles:
            role = roles[0]
            print(f'Role {role.name} ({role.id}) found.')
        else:
            role = Role(name=role_name)
            role.save()
            print(f'Role {role.name} ({role.id}) created.')

        print(f'{len(permissions_existing)} permissions exist.')
        db_connection.session.bulk_save_objects(
            permissions_new,
            return_defaults=True,
        )
        print(f'{len(permissions_new)} permissions created for {role.name}.')

        role_permissions_existing = RolePermission.query.filter(
            RolePermission.role_id == role.id,
            RolePermission.permission_id.in_([p.id for p in permissions_existing]),
        ).all()
        print(f'{len(role_permissions_existing)} role permissions exist for role {role.name}.')
        permissions_ids_to_skip = [rp.permission_id for rp in role_permissions_existing]

        permission_ids = [p.id for p in permissions_new] + \
            [p.id for p in permissions_existing if p.id not in permissions_ids_to_skip]

        role_permissions_to_create = [RolePermission(
            permission_id=permission_id,
            role_id=role.id,
        ) for permission_id in permission_ids]
        db_connection.session.bulk_save_objects(
            role_permissions_to_create,
            return_defaults=True,
        )
        print(f'{len(role_permissions_to_create)} role permissions created for {role.name}.')

        try:
            db_connection.session.commit()
        except Exception as err:
            db_connection.session.rollback()
            raise err
