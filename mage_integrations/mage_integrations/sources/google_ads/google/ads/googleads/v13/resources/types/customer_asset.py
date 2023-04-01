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

from google.ads.googleads.v13.common.types import asset_policy
from google.ads.googleads.v13.enums.types import asset_field_type
from google.ads.googleads.v13.enums.types import asset_link_primary_status
from google.ads.googleads.v13.enums.types import (
    asset_link_primary_status_reason,
)
from google.ads.googleads.v13.enums.types import asset_link_status
from google.ads.googleads.v13.enums.types import asset_source


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"CustomerAsset",},
)


class CustomerAsset(proto.Message):
    r"""A link between a customer and an asset.
    Attributes:
        resource_name (str):
            Immutable. The resource name of the customer asset.
            CustomerAsset resource names have the form:

            ``customers/{customer_id}/customerAssets/{asset_id}~{field_type}``
        asset (str):
            Required. Immutable. The asset which is
            linked to the customer.
        field_type (google.ads.googleads.v13.enums.types.AssetFieldTypeEnum.AssetFieldType):
            Required. Immutable. Role that the asset
            takes for the customer link.
        source (google.ads.googleads.v13.enums.types.AssetSourceEnum.AssetSource):
            Output only. Source of the customer asset
            link.
        status (google.ads.googleads.v13.enums.types.AssetLinkStatusEnum.AssetLinkStatus):
            Status of the customer asset.
        primary_status (google.ads.googleads.v13.enums.types.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus):
            Output only. Provides the PrimaryStatus of
            this asset link. Primary status is meant
            essentially to differentiate between the plain
            "status" field, which has advertiser set values
            of enabled, paused, or removed.  The primary
            status takes into account other signals (for
            assets its mainly policy and quality approvals)
            to come up with a more comprehensive status to
            indicate its serving state.
        primary_status_details (MutableSequence[google.ads.googleads.v13.common.types.AssetLinkPrimaryStatusDetails]):
            Output only. Provides the details of the
            primary status and its associated reasons.
        primary_status_reasons (MutableSequence[google.ads.googleads.v13.enums.types.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason]):
            Output only. Provides a list of reasons for
            why an asset is not serving or not serving at
            full capacity.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    asset: str = proto.Field(
        proto.STRING, number=2,
    )
    field_type: asset_field_type.AssetFieldTypeEnum.AssetFieldType = proto.Field(
        proto.ENUM,
        number=3,
        enum=asset_field_type.AssetFieldTypeEnum.AssetFieldType,
    )
    source: asset_source.AssetSourceEnum.AssetSource = proto.Field(
        proto.ENUM, number=5, enum=asset_source.AssetSourceEnum.AssetSource,
    )
    status: asset_link_status.AssetLinkStatusEnum.AssetLinkStatus = proto.Field(
        proto.ENUM,
        number=4,
        enum=asset_link_status.AssetLinkStatusEnum.AssetLinkStatus,
    )
    primary_status: asset_link_primary_status.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus = proto.Field(
        proto.ENUM,
        number=6,
        enum=asset_link_primary_status.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus,
    )
    primary_status_details: MutableSequence[
        asset_policy.AssetLinkPrimaryStatusDetails
    ] = proto.RepeatedField(
        proto.MESSAGE,
        number=7,
        message=asset_policy.AssetLinkPrimaryStatusDetails,
    )
    primary_status_reasons: MutableSequence[
        asset_link_primary_status_reason.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason
    ] = proto.RepeatedField(
        proto.ENUM,
        number=8,
        enum=asset_link_primary_status_reason.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
