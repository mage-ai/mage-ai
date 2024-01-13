import urllib.parse
from typing import Dict, List

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.FilePolicy import FilePolicy
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    InteractionType,
    ItemType,
    RenderLocationType,
    ValidationType,
)
from mage_ai.presenters.interactions.constants import InteractionInputType
from mage_ai.shared.hash import combine_into, merge_dict
from mage_ai.shared.models import BaseDataClass


def get_values(
    model: BaseDataClass = None,
    model_class=None,
    item_dict: Dict = None,
) -> Dict:
    class_name = None
    if model:
        class_name = model.__class__.__name__
    elif model_class:
        class_name = model_class.__name__

    item_type = None
    if item_dict:
        item_type = item_dict.get('item_type')

    object_type = None
    if item_dict:
        object_type = item_dict.get('object_type')

    action_uuid = '_'.join([s for s in [
        item_type,
        object_type,
        class_name,
        'action',
    ] if s])
    application_uuid = '_'.join([s for s in [
        item_type,
        object_type,
        class_name,
        'application',
    ] if s])

    uuid = '_'.join([s for s in [
        item_type,
        object_type,
        class_name,
        *[(item_dict or {}).get(key) for key in [
            'title',
            'subtitle',
            'description',
        ]],
    ] if s])
    if model:
        if hasattr(model, 'uuid'):
            uuid += '_' + model.uuid
        elif hasattr(model, 'id'):
            uuid += '_' + model.id
        elif hasattr(model, 'name'):
            uuid += '_' + model.name

    return dict(
        action_uuid=action_uuid,
        application_uuid=application_uuid,
        item_type=item_type,
        object_type=object_type,
        operation={
            ItemType.CREATE: OperationType.CREATE,
            ItemType.DELETE: OperationType.DELETE,
            ItemType.DETAIL: OperationType.DETAIL,
            ItemType.LIST: OperationType.LIST,
            ItemType.UPDATE: OperationType.UPDATE,
        }.get(item_type) or None,
        uuid=uuid,
    )


def build_request(
    resource_id: str = None,
    resource_parent_id: str = None,
    **kwargs,
) -> Dict:
    return dict(
        resource_id=urllib.parse.quote_plus(
            resource_id,
        ) if resource_id else None,
        resource_parent_id=urllib.parse.quote_plus(
            resource_parent_id,
        ) if resource_parent_id else None,
    ) | (kwargs or {})


def build_input(
    item_dict: Dict = None,
    model: BaseDataClass = None,
    model_class=None,
    **kwargs,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    base = dict(
        type=InteractionInputType.TEXT_FIELD if 'type' not in kwargs else kwargs.get('type'),
        required=True,
        action_uuid=values['action_uuid'],
    )
    combine_into(kwargs, base)
    return base


def build_application_detail(
    item_dict: Dict = None,
    model: BaseDataClass = None,
    model_class=None,
    **kwargs,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    return dict(
        uuid=values['application_uuid'],
        application_type=ApplicationType.DETAIL,
        **kwargs,
    )


def build_application_expansion(
    item_dict: Dict = None,
    model: BaseDataClass = None,
    model_class=None,
    **kwargs,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    return dict(
        uuid=values['application_uuid'],
        application_type=ApplicationType.EXPANSION,
        **kwargs,
    )


def build_application_detail_list(
    item_dict: Dict = None,
    model: BaseDataClass = None,
    model_class=None,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    return dict(
        uuid=values['application_uuid'],
        application_type=ApplicationType.DETAIL_LIST,
    )


def build_application_list(
    item_dict: Dict = None,
    model: BaseDataClass = None,
    model_class=None,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    return dict(
        uuid=values['application_uuid'],
        application_type=ApplicationType.LIST,
    )


def build_application_form(
    button_label: str = None,
    item_dict: Dict = None,
    model: BaseDataClass = None,
    model_class=None,
    settings: List[Dict] = None,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    arr = []
    if settings:
        for opts in settings:
            arr.append(build_input(
                item_dict=item_dict,
                model=model,
                model_class=model_class,
                **opts,
            ))

    return dict(
        uuid=values['application_uuid'],
        application_type=ApplicationType.FORM,
        buttons=[
            dict(
                label='Cancel',
                tooltip='Discard changes and go back.',
                keyboard_shortcuts=[['metaKey', 27]],
                action_types=[
                    ButtonActionType.RESET_FORM,
                    ButtonActionType.CLOSE_APPLICATION,
                ],
            ),
            dict(
                label=button_label or 'Save changes',
                tooltip='Save changes.',
                keyboard_shortcuts=[['metaKey', 13]],
                action_types=[
                    ButtonActionType.EXECUTE,
                    ButtonActionType.RESET_FORM,
                    ButtonActionType.CLOSE_APPLICATION,
                ],
            ),
        ],
        settings=arr,
    )


def build_action_generic(
    model: BaseDataClass = None,
    model_class=None,
    item_dict: Dict = None,
    request: Dict = None,
    **kwargs,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    return merge_dict(dict(
        request=merge_dict(dict(operation=values['operation']), request),
        uuid=values['action_uuid'],
    ), kwargs)


def build_action_fetch_items(
    mapping: Dict,
    model: BaseDataClass = None,
    model_class=None,
    item_dict: Dict = None,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    return dict(
        interaction=dict(
            item=dict(
                uuid=values['uuid'],
            ),
            type=InteractionType.FETCH_ITEMS,
        ),
        upstream_action_value_key_mapping={
            values['action_uuid']: mapping,
        },
        uuid=InteractionType.FETCH_ITEMS,
    )


def build_generic(
    item_dict: Dict = None,
    mapping: Dict = None,
    model: BaseDataClass = None,
    model_class=None,
    request: Dict = None,
    settings: List[Dict] = None,
    **kwargs,
) -> Dict:
    values = get_values(
        model=model,
        model_class=model_class,
        item_dict=item_dict,
    )

    actions = []
    if request:
        actions.append(build_action_generic(
            model=model,
            model_class=model_class,
            item_dict=item_dict,
            render_options=dict(location=RenderLocationType.ITEMS_CONTAINER_AFTER),
            request=request,
        ))
    if mapping:
        actions.append(build_action_fetch_items(
            model=model,
            model_class=model_class,
            item_dict=item_dict,
            mapping=mapping,
        ))

    applications = []
    if settings:
        applications.append(build_application_form(
            item_dict=item_dict,
            model=model,
            model_class=model_class,
            settings=settings,
            **kwargs,
        ))

    base = dict(
        item_type=values['item_type'],
        uuid=values['uuid'],
        actions=actions,
        display_settings_by_attribute=dict(
            description=dict(
                text_styles=dict(
                    monospace=True,
                    small=True,
                ),
            ),
        ),
        applications=applications,
    )

    combine_into(item_dict, base)

    return base


def build_update(model: BaseDataClass, item_dict: Dict = None, **kwargs) -> Dict:
    item_dict = merge_dict(dict(
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
        item_type=ItemType.UPDATE,
    ), item_dict)

    item_dict = build_generic(
        item_dict=item_dict,
        model=model,
        **kwargs,
    )

    return item_dict


def build_delete(
    model: BaseDataClass,
    item_dict: Dict = None,
    request: Dict = None,
    **kwargs,
) -> Dict:
    item_dict = merge_dict(dict(
        condition=lambda opts: FilePolicy(
            None,
            opts.get('user'),
        ).has_at_least_editor_role(),
        item_type=ItemType.DELETE,
        display_settings_by_attribute=dict(
            icon=dict(
                color_uuid='accent.negative',
                icon_uuid='Trash',
            ),
            subtitle=dict(
                text_styles=dict(monospace=True),
            ),
        ),
    ), item_dict)
    item_dict = build_generic(
        item_dict=item_dict,
        model=model,
        request=request,
        **kwargs,
    )
    item_dict['actions'][0]['validations'] = [ValidationType.CONFIRMATION]
    item_dict['actions'].extend([
        dict(
            interaction=dict(
                type=InteractionType.CLOSE_APPLICATION,
            ),
            uuid='close_application',
        ),
    ])

    return item_dict
