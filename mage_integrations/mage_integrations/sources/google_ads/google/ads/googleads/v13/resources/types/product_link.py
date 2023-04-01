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

from google.ads.googleads.v13.enums.types import linked_product_type


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"ProductLink", "DataPartnerIdentifier", "GoogleAdsIdentifier",},
)


class ProductLink(proto.Message):
    r"""Represents the data sharing connection between  a Google
    Ads customer and another product.

    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Immutable. Resource name of the product link. ProductLink
            resource names have the form:

            ``customers/{customer_id}/productLinks/{product_link_id}``
        product_link_id (int):
            Output only. The ID of the link.
            This field is read only.

            This field is a member of `oneof`_ ``_product_link_id``.
        type_ (google.ads.googleads.v13.enums.types.LinkedProductTypeEnum.LinkedProductType):
            Output only. The type of the linked product.
        data_partner (google.ads.googleads.v13.resources.types.DataPartnerIdentifier):
            Immutable. Data partner link.

            This field is a member of `oneof`_ ``linked_product``.
        google_ads (google.ads.googleads.v13.resources.types.GoogleAdsIdentifier):
            Immutable. Google Ads link.

            This field is a member of `oneof`_ ``linked_product``.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    product_link_id: int = proto.Field(
        proto.INT64, number=2, optional=True,
    )
    type_: linked_product_type.LinkedProductTypeEnum.LinkedProductType = proto.Field(
        proto.ENUM,
        number=3,
        enum=linked_product_type.LinkedProductTypeEnum.LinkedProductType,
    )
    data_partner: "DataPartnerIdentifier" = proto.Field(
        proto.MESSAGE,
        number=4,
        oneof="linked_product",
        message="DataPartnerIdentifier",
    )
    google_ads: "GoogleAdsIdentifier" = proto.Field(
        proto.MESSAGE,
        number=5,
        oneof="linked_product",
        message="GoogleAdsIdentifier",
    )


class DataPartnerIdentifier(proto.Message):
    r"""The identifier for Data Partner account.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        data_partner_id (int):
            Immutable. The customer ID of the Data
            partner account. This field is required and
            should not be empty when creating a new data
            partner link. It is unable to be modified after
            the creation of the link.

            This field is a member of `oneof`_ ``_data_partner_id``.
    """

    data_partner_id: int = proto.Field(
        proto.INT64, number=1, optional=True,
    )


class GoogleAdsIdentifier(proto.Message):
    r"""The identifier for Google Ads account.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        customer (str):
            Immutable. The resource name of the Google
            Ads account. This field is required and should
            not be empty when creating a new Google Ads
            link. It is unable to be modified after the
            creation of the link.

            This field is a member of `oneof`_ ``_customer``.
    """

    customer: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
