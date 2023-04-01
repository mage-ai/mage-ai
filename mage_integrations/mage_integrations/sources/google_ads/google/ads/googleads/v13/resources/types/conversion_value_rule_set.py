# -*- coding: utf-8 -*-
# Copyright 2022 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from typing import MutableSequence

import proto  # type: ignore

from google.ads.googleads.v13.enums.types import conversion_action_category
from google.ads.googleads.v13.enums.types import (
    conversion_value_rule_set_status,
)
from google.ads.googleads.v13.enums.types import value_rule_set_attachment_type
from google.ads.googleads.v13.enums.types import value_rule_set_dimension


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"ConversionValueRuleSet",},
)


class ConversionValueRuleSet(proto.Message):
    r"""A conversion value rule set
    Attributes:
        resource_name (str):
            Immutable. The resource name of the conversion value rule
            set. Conversion value rule set resource names have the form:

            ``customers/{customer_id}/conversionValueRuleSets/{conversion_value_rule_set_id}``
        id (int):
            Output only. The ID of the conversion value
            rule set.
        conversion_value_rules (MutableSequence[str]):
            Resource names of rules within the rule set.
        dimensions (MutableSequence[google.ads.googleads.v13.enums.types.ValueRuleSetDimensionEnum.ValueRuleSetDimension]):
            Defines dimensions for Value Rule conditions.
            The condition types of value rules within this
            value rule set must be of these dimensions. The
            first entry in this list is the primary
            dimension of the included value rules. When
            using value rule primary dimension segmentation,
            conversion values will be segmented into the
            values adjusted by value rules and the original
            values, if some value rules apply.
        owner_customer (str):
            Output only. The resource name of the conversion value rule
            set's owner customer. When the value rule set is inherited
            from a manager customer, owner_customer will be the resource
            name of the manager whereas the customer in the
            resource_name will be of the requesting serving customer.
            \*\* Read-only \*\*
        attachment_type (google.ads.googleads.v13.enums.types.ValueRuleSetAttachmentTypeEnum.ValueRuleSetAttachmentType):
            Immutable. Defines the scope where the
            conversion value rule set is attached.
        campaign (str):
            The resource name of the campaign when the
            conversion value rule set is attached to a
            campaign.
        status (google.ads.googleads.v13.enums.types.ConversionValueRuleSetStatusEnum.ConversionValueRuleSetStatus):
            Output only. The status of the conversion value rule set.
            \*\* Read-only \*\*
        conversion_action_categories (MutableSequence[google.ads.googleads.v13.enums.types.ConversionActionCategoryEnum.ConversionActionCategory]):
            Immutable. The conversion action categories
            of the conversion value rule set.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    id: int = proto.Field(
        proto.INT64, number=2,
    )
    conversion_value_rules: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=3,
    )
    dimensions: MutableSequence[
        value_rule_set_dimension.ValueRuleSetDimensionEnum.ValueRuleSetDimension
    ] = proto.RepeatedField(
        proto.ENUM,
        number=4,
        enum=value_rule_set_dimension.ValueRuleSetDimensionEnum.ValueRuleSetDimension,
    )
    owner_customer: str = proto.Field(
        proto.STRING, number=5,
    )
    attachment_type: value_rule_set_attachment_type.ValueRuleSetAttachmentTypeEnum.ValueRuleSetAttachmentType = proto.Field(
        proto.ENUM,
        number=6,
        enum=value_rule_set_attachment_type.ValueRuleSetAttachmentTypeEnum.ValueRuleSetAttachmentType,
    )
    campaign: str = proto.Field(
        proto.STRING, number=7,
    )
    status: conversion_value_rule_set_status.ConversionValueRuleSetStatusEnum.ConversionValueRuleSetStatus = proto.Field(
        proto.ENUM,
        number=8,
        enum=conversion_value_rule_set_status.ConversionValueRuleSetStatusEnum.ConversionValueRuleSetStatus,
    )
    conversion_action_categories: MutableSequence[
        conversion_action_category.ConversionActionCategoryEnum.ConversionActionCategory
    ] = proto.RepeatedField(
        proto.ENUM,
        number=9,
        enum=conversion_action_category.ConversionActionCategoryEnum.ConversionActionCategory,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
