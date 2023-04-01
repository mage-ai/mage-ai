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

import proto  # type: ignore

from google.ads.googleads.v13.common.types import asset_set_types
from google.ads.googleads.v13.enums.types import asset_set_status
from google.ads.googleads.v13.enums.types import asset_set_type


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"AssetSet",},
)


class AssetSet(proto.Message):
    r"""An asset set representing a collection of assets.
    Use AssetSetAsset to link an asset to the asset set.

    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        id (int):
            Output only. The ID of the asset set.
        resource_name (str):
            Immutable. The resource name of the asset set. Asset set
            resource names have the form:

            ``customers/{customer_id}/assetSets/{asset_set_id}``
        name (str):
            Required. Name of the asset set. Required. It
            must have a minimum length of 1 and maximum
            length of 128.
        type_ (google.ads.googleads.v13.enums.types.AssetSetTypeEnum.AssetSetType):
            Required. Immutable. The type of the asset
            set. Required.
        status (google.ads.googleads.v13.enums.types.AssetSetStatusEnum.AssetSetStatus):
            Output only. The status of the asset set.
            Read-only.
        merchant_center_feed (google.ads.googleads.v13.resources.types.AssetSet.MerchantCenterFeed):
            Merchant ID and Feed Label from Google
            Merchant Center.
        location_group_parent_asset_set_id (int):
            Immutable. Parent asset set id for the asset
            set where the elements of this asset set come
            from. For example: the sync level location
            AssetSet id where the the elements in
            LocationGroup AssetSet come from. This field is
            required and only applicable for Location Group
            typed AssetSet.
        hotel_property_data (google.ads.googleads.v13.resources.types.AssetSet.HotelPropertyData):
            Output only. For Performance Max for travel
            goals campaigns with a Hotel Center account
            link. Read-only.
        location_set (google.ads.googleads.v13.common.types.LocationSet):
            Location asset set data. This will be used for sync level
            location set. This can only be set if AssetSet's type is
            LOCATION_SYNC.

            This field is a member of `oneof`_ ``asset_set_source``.
        business_profile_location_group (google.ads.googleads.v13.common.types.BusinessProfileLocationGroup):
            Business Profile location group asset set
            data.

            This field is a member of `oneof`_ ``asset_set_source``.
        chain_location_group (google.ads.googleads.v13.common.types.ChainLocationGroup):
            Represents information about a Chain dynamic location group.
            Only applicable if the sync level AssetSet's type is
            LOCATION_SYNC and sync source is chain.

            This field is a member of `oneof`_ ``asset_set_source``.
    """

    class MerchantCenterFeed(proto.Message):
        r"""Merchant ID and Feed Label from Google Merchant Center.
        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            merchant_id (int):
                Required. Merchant ID from Google Merchant
                Center
            feed_label (str):
                Optional. Feed Label from Google Merchant
                Center.

                This field is a member of `oneof`_ ``_feed_label``.
        """

        merchant_id: int = proto.Field(
            proto.INT64, number=1,
        )
        feed_label: str = proto.Field(
            proto.STRING, number=2, optional=True,
        )

    class HotelPropertyData(proto.Message):
        r"""For Performance Max for travel goals campaigns with a Hotel
        Center account link. Read-only.

        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            hotel_center_id (int):
                Output only. The hotel center ID of the
                partner.

                This field is a member of `oneof`_ ``_hotel_center_id``.
            partner_name (str):
                Output only. Name of the hotel partner.

                This field is a member of `oneof`_ ``_partner_name``.
        """

        hotel_center_id: int = proto.Field(
            proto.INT64, number=1, optional=True,
        )
        partner_name: str = proto.Field(
            proto.STRING, number=2, optional=True,
        )

    id: int = proto.Field(
        proto.INT64, number=6,
    )
    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    name: str = proto.Field(
        proto.STRING, number=2,
    )
    type_: asset_set_type.AssetSetTypeEnum.AssetSetType = proto.Field(
        proto.ENUM, number=3, enum=asset_set_type.AssetSetTypeEnum.AssetSetType,
    )
    status: asset_set_status.AssetSetStatusEnum.AssetSetStatus = proto.Field(
        proto.ENUM,
        number=4,
        enum=asset_set_status.AssetSetStatusEnum.AssetSetStatus,
    )
    merchant_center_feed: MerchantCenterFeed = proto.Field(
        proto.MESSAGE, number=5, message=MerchantCenterFeed,
    )
    location_group_parent_asset_set_id: int = proto.Field(
        proto.INT64, number=10,
    )
    hotel_property_data: HotelPropertyData = proto.Field(
        proto.MESSAGE, number=11, message=HotelPropertyData,
    )
    location_set: asset_set_types.LocationSet = proto.Field(
        proto.MESSAGE,
        number=7,
        oneof="asset_set_source",
        message=asset_set_types.LocationSet,
    )
    business_profile_location_group: asset_set_types.BusinessProfileLocationGroup = proto.Field(
        proto.MESSAGE,
        number=8,
        oneof="asset_set_source",
        message=asset_set_types.BusinessProfileLocationGroup,
    )
    chain_location_group: asset_set_types.ChainLocationGroup = proto.Field(
        proto.MESSAGE,
        number=9,
        oneof="asset_set_source",
        message=asset_set_types.ChainLocationGroup,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
