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

from google.ads.googleads.v13.enums.types import conversion_value_rule_status
from google.ads.googleads.v13.enums.types import value_rule_device_type
from google.ads.googleads.v13.enums.types import (
    value_rule_geo_location_match_type,
)
from google.ads.googleads.v13.enums.types import value_rule_operation


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"ConversionValueRule",},
)


class ConversionValueRule(proto.Message):
    r"""A conversion value rule
    Attributes:
        resource_name (str):
            Immutable. The resource name of the conversion value rule.
            Conversion value rule resource names have the form:

            ``customers/{customer_id}/conversionValueRules/{conversion_value_rule_id}``
        id (int):
            Output only. The ID of the conversion value
            rule.
        action (google.ads.googleads.v13.resources.types.ConversionValueRule.ValueRuleAction):
            Action applied when the rule is triggered.
        geo_location_condition (google.ads.googleads.v13.resources.types.ConversionValueRule.ValueRuleGeoLocationCondition):
            Condition for Geo location that must be
            satisfied for the value rule to apply.
        device_condition (google.ads.googleads.v13.resources.types.ConversionValueRule.ValueRuleDeviceCondition):
            Condition for device type that must be
            satisfied for the value rule to apply.
        audience_condition (google.ads.googleads.v13.resources.types.ConversionValueRule.ValueRuleAudienceCondition):
            Condition for audience that must be satisfied
            for the value rule to apply.
        owner_customer (str):
            Output only. The resource name of the conversion value
            rule's owner customer. When the value rule is inherited from
            a manager customer, owner_customer will be the resource name
            of the manager whereas the customer in the resource_name
            will be of the requesting serving customer. \*\* Read-only
            \*\*
        status (google.ads.googleads.v13.enums.types.ConversionValueRuleStatusEnum.ConversionValueRuleStatus):
            The status of the conversion value rule.
    """

    class ValueRuleAction(proto.Message):
        r"""Action applied when rule is applied.
        Attributes:
            operation (google.ads.googleads.v13.enums.types.ValueRuleOperationEnum.ValueRuleOperation):
                Specifies applied operation.
            value (float):
                Specifies applied value.
        """

        operation: value_rule_operation.ValueRuleOperationEnum.ValueRuleOperation = proto.Field(
            proto.ENUM,
            number=1,
            enum=value_rule_operation.ValueRuleOperationEnum.ValueRuleOperation,
        )
        value: float = proto.Field(
            proto.DOUBLE, number=2,
        )

    class ValueRuleGeoLocationCondition(proto.Message):
        r"""Condition on Geo dimension.
        Attributes:
            excluded_geo_target_constants (MutableSequence[str]):
                Geo locations that advertisers want to
                exclude.
            excluded_geo_match_type (google.ads.googleads.v13.enums.types.ValueRuleGeoLocationMatchTypeEnum.ValueRuleGeoLocationMatchType):
                Excluded Geo location match type.
            geo_target_constants (MutableSequence[str]):
                Geo locations that advertisers want to
                include.
            geo_match_type (google.ads.googleads.v13.enums.types.ValueRuleGeoLocationMatchTypeEnum.ValueRuleGeoLocationMatchType):
                Included Geo location match type.
        """

        excluded_geo_target_constants: MutableSequence[
            str
        ] = proto.RepeatedField(
            proto.STRING, number=1,
        )
        excluded_geo_match_type: value_rule_geo_location_match_type.ValueRuleGeoLocationMatchTypeEnum.ValueRuleGeoLocationMatchType = proto.Field(
            proto.ENUM,
            number=2,
            enum=value_rule_geo_location_match_type.ValueRuleGeoLocationMatchTypeEnum.ValueRuleGeoLocationMatchType,
        )
        geo_target_constants: MutableSequence[str] = proto.RepeatedField(
            proto.STRING, number=3,
        )
        geo_match_type: value_rule_geo_location_match_type.ValueRuleGeoLocationMatchTypeEnum.ValueRuleGeoLocationMatchType = proto.Field(
            proto.ENUM,
            number=4,
            enum=value_rule_geo_location_match_type.ValueRuleGeoLocationMatchTypeEnum.ValueRuleGeoLocationMatchType,
        )

    class ValueRuleDeviceCondition(proto.Message):
        r"""Condition on Device dimension.
        Attributes:
            device_types (MutableSequence[google.ads.googleads.v13.enums.types.ValueRuleDeviceTypeEnum.ValueRuleDeviceType]):
                Value for device type condition.
        """

        device_types: MutableSequence[
            value_rule_device_type.ValueRuleDeviceTypeEnum.ValueRuleDeviceType
        ] = proto.RepeatedField(
            proto.ENUM,
            number=1,
            enum=value_rule_device_type.ValueRuleDeviceTypeEnum.ValueRuleDeviceType,
        )

    class ValueRuleAudienceCondition(proto.Message):
        r"""Condition on Audience dimension.
        Attributes:
            user_lists (MutableSequence[str]):
                User Lists.
                The Similar Audiences sunset starts May 2023.
                Refer to
                https://ads-developers.googleblog.com/2022/11/announcing-deprecation-and-sunset-of.html
                for other options.
            user_interests (MutableSequence[str]):
                User Interests.
        """

        user_lists: MutableSequence[str] = proto.RepeatedField(
            proto.STRING, number=1,
        )
        user_interests: MutableSequence[str] = proto.RepeatedField(
            proto.STRING, number=2,
        )

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    id: int = proto.Field(
        proto.INT64, number=2,
    )
    action: ValueRuleAction = proto.Field(
        proto.MESSAGE, number=3, message=ValueRuleAction,
    )
    geo_location_condition: ValueRuleGeoLocationCondition = proto.Field(
        proto.MESSAGE, number=4, message=ValueRuleGeoLocationCondition,
    )
    device_condition: ValueRuleDeviceCondition = proto.Field(
        proto.MESSAGE, number=5, message=ValueRuleDeviceCondition,
    )
    audience_condition: ValueRuleAudienceCondition = proto.Field(
        proto.MESSAGE, number=6, message=ValueRuleAudienceCondition,
    )
    owner_customer: str = proto.Field(
        proto.STRING, number=7,
    )
    status: conversion_value_rule_status.ConversionValueRuleStatusEnum.ConversionValueRuleStatus = proto.Field(
        proto.ENUM,
        number=8,
        enum=conversion_value_rule_status.ConversionValueRuleStatusEnum.ConversionValueRuleStatus,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
