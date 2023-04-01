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
    manifest={"AdGroupAsset",},
)


class AdGroupAsset(proto.Message):
    r"""A link between an ad group and an asset.
    Attributes:
        resource_name (str):
            Immutable. The resource name of the ad group asset.
            AdGroupAsset resource names have the form:

            ``customers/{customer_id}/adGroupAssets/{ad_group_id}~{asset_id}~{field_type}``
        ad_group (str):
            Required. Immutable. The ad group to which
            the asset is linked.
        asset (str):
            Required. Immutable. The asset which is
            linked to the ad group.
        field_type (google.ads.googleads.v13.enums.types.AssetFieldTypeEnum.AssetFieldType):
            Required. Immutable. Role that the asset
            takes under the linked ad group.
        source (google.ads.googleads.v13.enums.types.AssetSourceEnum.AssetSource):
            Output only. Source of the adgroup asset
            link.
        status (google.ads.googleads.v13.enums.types.AssetLinkStatusEnum.AssetLinkStatus):
            Status of the ad group asset.
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
    ad_group: str = proto.Field(
        proto.STRING, number=2,
    )
    asset: str = proto.Field(
        proto.STRING, number=3,
    )
    field_type: asset_field_type.AssetFieldTypeEnum.AssetFieldType = proto.Field(
        proto.ENUM,
        number=4,
        enum=asset_field_type.AssetFieldTypeEnum.AssetFieldType,
    )
    source: asset_source.AssetSourceEnum.AssetSource = proto.Field(
        proto.ENUM, number=6, enum=asset_source.AssetSourceEnum.AssetSource,
    )
    status: asset_link_status.AssetLinkStatusEnum.AssetLinkStatus = proto.Field(
        proto.ENUM,
        number=5,
        enum=asset_link_status.AssetLinkStatusEnum.AssetLinkStatus,
    )
    primary_status: asset_link_primary_status.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus = proto.Field(
        proto.ENUM,
        number=7,
        enum=asset_link_primary_status.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus,
    )
    primary_status_details: MutableSequence[
        asset_policy.AssetLinkPrimaryStatusDetails
    ] = proto.RepeatedField(
        proto.MESSAGE,
        number=8,
        message=asset_policy.AssetLinkPrimaryStatusDetails,
    )
    primary_status_reasons: MutableSequence[
        asset_link_primary_status_reason.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason
    ] = proto.RepeatedField(
        proto.ENUM,
        number=9,
        enum=asset_link_primary_status_reason.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
