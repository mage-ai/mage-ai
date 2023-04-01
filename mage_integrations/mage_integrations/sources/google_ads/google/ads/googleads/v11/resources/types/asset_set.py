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

from google.ads.googleads.v11.enums.types import asset_set_status
from google.ads.googleads.v11.enums.types import asset_set_type


__protobuf__ = proto.module(
    package="google.ads.googleads.v11.resources",
    marshal="google.ads.googleads.v11",
    manifest={"AssetSet",},
)


class AssetSet(proto.Message):
    r"""An asset set representing a collection of assets.
    Use AssetSetAsset to link an asset to the asset set.

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
        type_ (google.ads.googleads.v11.enums.types.AssetSetTypeEnum.AssetSetType):
            Required. Immutable. The type of the asset
            set. Required.
        status (google.ads.googleads.v11.enums.types.AssetSetStatusEnum.AssetSetStatus):
            Output only. The status of the asset set.
            Read-only.
        merchant_center_feed (google.ads.googleads.v11.resources.types.AssetSet.MerchantCenterFeed):
            Merchant ID and Feed Label from Google
            Merchant Center.
    """

    class MerchantCenterFeed(proto.Message):
        r"""Merchant ID and Feed Label from Google Merchant Center.

        Attributes:
            merchant_id (int):
                Required. Merchant ID from Google Merchant
                Center
            feed_label (str):
                Optional. Feed Label from Google Merchant
                Center.

                This field is a member of `oneof`_ ``_feed_label``.
        """

        merchant_id = proto.Field(proto.INT64, number=1,)
        feed_label = proto.Field(proto.STRING, number=2, optional=True,)

    id = proto.Field(proto.INT64, number=6,)
    resource_name = proto.Field(proto.STRING, number=1,)
    name = proto.Field(proto.STRING, number=2,)
    type_ = proto.Field(
        proto.ENUM, number=3, enum=asset_set_type.AssetSetTypeEnum.AssetSetType,
    )
    status = proto.Field(
        proto.ENUM,
        number=4,
        enum=asset_set_status.AssetSetStatusEnum.AssetSetStatus,
    )
    merchant_center_feed = proto.Field(
        proto.MESSAGE, number=5, message=MerchantCenterFeed,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
