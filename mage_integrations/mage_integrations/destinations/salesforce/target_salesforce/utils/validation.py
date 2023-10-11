"""Currently Validates the following:
    1. Field exists in the SF Object (excluding _sdc metadata)
    2. If the config action is update, that the field can be updated
    3. If the config action is insert, that the field can be created
    4. If the config action is upsert, that the field can be created and updated"""


from collections import namedtuple
from typing import Dict

from mage_integrations.destinations.salesforce.target_salesforce.utils.exceptions import (
    InvalidStreamSchema,
)

ObjectField = namedtuple("ObjectField", "type createable updateable")


def validate_schema_field(
    field: Dict, object_fields: Dict[str, ObjectField], action: str, stream_name: str
):
    """Currently only validates that all incomming fields exist in the SF Object"""
    field_name, field_type = field
    sf_field: ObjectField = object_fields.get(field_name)

    if field_name.startswith("_sdc_"):
        return

    if field_name == "Id":
        if action == "insert":
            raise InvalidStreamSchema(
                f"Id is not createable and should not be included on insert"
            )
        else:
            return

    if not sf_field:
        raise InvalidStreamSchema(f"{field_name} does not exist in your {stream_name} Object")

    if action in ["update", "upsert"]:
        if not sf_field.updateable:
            raise InvalidStreamSchema(
                f"{field_name} is not updatable for your {stream_name} Object, invalid for {action} action"
            )

    if action in ["insert", "upsert"]:
        if not sf_field.createable:
            raise InvalidStreamSchema(
                f"{field_name} is not creatable for your {stream_name} Object, invalid for {action} action"
            )

    if action in ["delete", "hard_delete"]:
        raise InvalidStreamSchema(
            f"Schema for the {action} action should only include Id"
        )
