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

from google.ads.googleads.v13.enums.types import age_range_type
from google.ads.googleads.v13.enums.types import app_payment_model_type
from google.ads.googleads.v13.enums.types import content_label_type
from google.ads.googleads.v13.enums.types import day_of_week as gage_day_of_week
from google.ads.googleads.v13.enums.types import device
from google.ads.googleads.v13.enums.types import gender_type
from google.ads.googleads.v13.enums.types import hotel_date_selection_type
from google.ads.googleads.v13.enums.types import income_range_type
from google.ads.googleads.v13.enums.types import interaction_type
from google.ads.googleads.v13.enums.types import keyword_match_type
from google.ads.googleads.v13.enums.types import listing_group_type
from google.ads.googleads.v13.enums.types import location_group_radius_units
from google.ads.googleads.v13.enums.types import minute_of_hour
from google.ads.googleads.v13.enums.types import parental_status_type
from google.ads.googleads.v13.enums.types import product_bidding_category_level
from google.ads.googleads.v13.enums.types import (
    product_channel as gage_product_channel,
)
from google.ads.googleads.v13.enums.types import (
    product_channel_exclusivity as gage_product_channel_exclusivity,
)
from google.ads.googleads.v13.enums.types import (
    product_condition as gage_product_condition,
)
from google.ads.googleads.v13.enums.types import product_custom_attribute_index
from google.ads.googleads.v13.enums.types import product_type_level
from google.ads.googleads.v13.enums.types import proximity_radius_units
from google.ads.googleads.v13.enums.types import webpage_condition_operand
from google.ads.googleads.v13.enums.types import webpage_condition_operator


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.common",
    marshal="google.ads.googleads.v13",
    manifest={
        "KeywordInfo",
        "PlacementInfo",
        "MobileAppCategoryInfo",
        "MobileApplicationInfo",
        "LocationInfo",
        "DeviceInfo",
        "ListingGroupInfo",
        "ListingScopeInfo",
        "ListingDimensionInfo",
        "HotelIdInfo",
        "HotelClassInfo",
        "HotelCountryRegionInfo",
        "HotelStateInfo",
        "HotelCityInfo",
        "ProductBiddingCategoryInfo",
        "ProductBrandInfo",
        "ProductChannelInfo",
        "ProductChannelExclusivityInfo",
        "ProductConditionInfo",
        "ProductCustomAttributeInfo",
        "ProductItemIdInfo",
        "ProductTypeInfo",
        "ProductGroupingInfo",
        "ProductLabelsInfo",
        "ProductLegacyConditionInfo",
        "ProductTypeFullInfo",
        "UnknownListingDimensionInfo",
        "HotelDateSelectionTypeInfo",
        "HotelAdvanceBookingWindowInfo",
        "HotelLengthOfStayInfo",
        "HotelCheckInDateRangeInfo",
        "HotelCheckInDayInfo",
        "ActivityIdInfo",
        "ActivityRatingInfo",
        "ActivityCountryInfo",
        "InteractionTypeInfo",
        "AdScheduleInfo",
        "AgeRangeInfo",
        "GenderInfo",
        "IncomeRangeInfo",
        "ParentalStatusInfo",
        "YouTubeVideoInfo",
        "YouTubeChannelInfo",
        "UserListInfo",
        "ProximityInfo",
        "GeoPointInfo",
        "AddressInfo",
        "TopicInfo",
        "LanguageInfo",
        "IpBlockInfo",
        "ContentLabelInfo",
        "CarrierInfo",
        "UserInterestInfo",
        "WebpageInfo",
        "WebpageConditionInfo",
        "WebpageSampleInfo",
        "OperatingSystemVersionInfo",
        "AppPaymentModelInfo",
        "MobileDeviceInfo",
        "CustomAffinityInfo",
        "CustomIntentInfo",
        "LocationGroupInfo",
        "CustomAudienceInfo",
        "CombinedAudienceInfo",
        "AudienceInfo",
        "KeywordThemeInfo",
        "LocalServiceIdInfo",
    },
)


class KeywordInfo(proto.Message):
    r"""A keyword criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        text (str):
            The text of the keyword (at most 80
            characters and 10 words).

            This field is a member of `oneof`_ ``_text``.
        match_type (google.ads.googleads.v13.enums.types.KeywordMatchTypeEnum.KeywordMatchType):
            The match type of the keyword.
    """

    text: str = proto.Field(
        proto.STRING, number=3, optional=True,
    )
    match_type: keyword_match_type.KeywordMatchTypeEnum.KeywordMatchType = proto.Field(
        proto.ENUM,
        number=2,
        enum=keyword_match_type.KeywordMatchTypeEnum.KeywordMatchType,
    )


class PlacementInfo(proto.Message):
    r"""A placement criterion. This can be used to modify bids for
    sites when targeting the content network.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        url (str):
            URL of the placement.
            For example, "http://www.domain.com".

            This field is a member of `oneof`_ ``_url``.
    """

    url: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class MobileAppCategoryInfo(proto.Message):
    r"""A mobile app category criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        mobile_app_category_constant (str):
            The mobile app category constant resource
            name.

            This field is a member of `oneof`_ ``_mobile_app_category_constant``.
    """

    mobile_app_category_constant: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class MobileApplicationInfo(proto.Message):
    r"""A mobile application criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        app_id (str):
            A string that uniquely identifies a mobile application to
            Google Ads API. The format of this string is
            "{platform}-{platform_native_id}", where platform is "1" for
            iOS apps and "2" for Android apps, and where
            platform_native_id is the mobile application identifier
            native to the corresponding platform. For iOS, this native
            identifier is the 9 digit string that appears at the end of
            an App Store URL (for example, "476943146" for "Flood-It! 2"
            whose App Store link is
            "http://itunes.apple.com/us/app/flood-it!-2/id476943146").
            For Android, this native identifier is the application's
            package name (for example, "com.labpixies.colordrips" for
            "Color Drips" given Google Play link
            "https://play.google.com/store/apps/details?id=com.labpixies.colordrips").
            A well formed app id for Google Ads API would thus be
            "1-476943146" for iOS and "2-com.labpixies.colordrips" for
            Android. This field is required and must be set in CREATE
            operations.

            This field is a member of `oneof`_ ``_app_id``.
        name (str):
            Name of this mobile application.

            This field is a member of `oneof`_ ``_name``.
    """

    app_id: str = proto.Field(
        proto.STRING, number=4, optional=True,
    )
    name: str = proto.Field(
        proto.STRING, number=5, optional=True,
    )


class LocationInfo(proto.Message):
    r"""A location criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        geo_target_constant (str):
            The geo target constant resource name.

            This field is a member of `oneof`_ ``_geo_target_constant``.
    """

    geo_target_constant: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class DeviceInfo(proto.Message):
    r"""A device criterion.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.DeviceEnum.Device):
            Type of the device.
    """

    type_: device.DeviceEnum.Device = proto.Field(
        proto.ENUM, number=1, enum=device.DeviceEnum.Device,
    )


class ListingGroupInfo(proto.Message):
    r"""A listing group criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        type_ (google.ads.googleads.v13.enums.types.ListingGroupTypeEnum.ListingGroupType):
            Type of the listing group.
        case_value (google.ads.googleads.v13.common.types.ListingDimensionInfo):
            Dimension value with which this listing group
            is refining its parent. Undefined for the root
            group.
        parent_ad_group_criterion (str):
            Resource name of ad group criterion which is
            the parent listing group subdivision. Null for
            the root group.

            This field is a member of `oneof`_ ``_parent_ad_group_criterion``.
    """

    type_: listing_group_type.ListingGroupTypeEnum.ListingGroupType = proto.Field(
        proto.ENUM,
        number=1,
        enum=listing_group_type.ListingGroupTypeEnum.ListingGroupType,
    )
    case_value: "ListingDimensionInfo" = proto.Field(
        proto.MESSAGE, number=2, message="ListingDimensionInfo",
    )
    parent_ad_group_criterion: str = proto.Field(
        proto.STRING, number=4, optional=True,
    )


class ListingScopeInfo(proto.Message):
    r"""A listing scope criterion.
    Attributes:
        dimensions (MutableSequence[google.ads.googleads.v13.common.types.ListingDimensionInfo]):
            Scope of the campaign criterion.
    """

    dimensions: MutableSequence["ListingDimensionInfo"] = proto.RepeatedField(
        proto.MESSAGE, number=2, message="ListingDimensionInfo",
    )


class ListingDimensionInfo(proto.Message):
    r"""Listing dimensions for listing group criterion.
    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        hotel_id (google.ads.googleads.v13.common.types.HotelIdInfo):
            Advertiser-specific hotel ID.

            This field is a member of `oneof`_ ``dimension``.
        hotel_class (google.ads.googleads.v13.common.types.HotelClassInfo):
            Class of the hotel as a number of stars 1 to
            5.

            This field is a member of `oneof`_ ``dimension``.
        hotel_country_region (google.ads.googleads.v13.common.types.HotelCountryRegionInfo):
            Country or Region the hotel is located in.

            This field is a member of `oneof`_ ``dimension``.
        hotel_state (google.ads.googleads.v13.common.types.HotelStateInfo):
            State the hotel is located in.

            This field is a member of `oneof`_ ``dimension``.
        hotel_city (google.ads.googleads.v13.common.types.HotelCityInfo):
            City the hotel is located in.

            This field is a member of `oneof`_ ``dimension``.
        product_bidding_category (google.ads.googleads.v13.common.types.ProductBiddingCategoryInfo):
            Bidding category of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_brand (google.ads.googleads.v13.common.types.ProductBrandInfo):
            Brand of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_channel (google.ads.googleads.v13.common.types.ProductChannelInfo):
            Locality of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_channel_exclusivity (google.ads.googleads.v13.common.types.ProductChannelExclusivityInfo):
            Availability of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_condition (google.ads.googleads.v13.common.types.ProductConditionInfo):
            Condition of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_custom_attribute (google.ads.googleads.v13.common.types.ProductCustomAttributeInfo):
            Custom attribute of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_item_id (google.ads.googleads.v13.common.types.ProductItemIdInfo):
            Item id of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_type (google.ads.googleads.v13.common.types.ProductTypeInfo):
            Type of a product offer.

            This field is a member of `oneof`_ ``dimension``.
        product_grouping (google.ads.googleads.v13.common.types.ProductGroupingInfo):
            Grouping of a product offer. This listing
            dimension is deprecated and it is supported only
            in Display campaigns.

            This field is a member of `oneof`_ ``dimension``.
        product_labels (google.ads.googleads.v13.common.types.ProductLabelsInfo):
            Labels of a product offer. This listing
            dimension is deprecated and it is supported only
            in Display campaigns.

            This field is a member of `oneof`_ ``dimension``.
        product_legacy_condition (google.ads.googleads.v13.common.types.ProductLegacyConditionInfo):
            Legacy condition of a product offer. This
            listing dimension is deprecated and it is
            supported only in Display campaigns.

            This field is a member of `oneof`_ ``dimension``.
        product_type_full (google.ads.googleads.v13.common.types.ProductTypeFullInfo):
            Full type of a product offer. This listing
            dimension is deprecated and it is supported only
            in Display campaigns.

            This field is a member of `oneof`_ ``dimension``.
        activity_id (google.ads.googleads.v13.common.types.ActivityIdInfo):
            Advertiser-specific activity ID.

            This field is a member of `oneof`_ ``dimension``.
        activity_rating (google.ads.googleads.v13.common.types.ActivityRatingInfo):
            Rating of the activity as a number 1 to 5,
            where 5 is the best.

            This field is a member of `oneof`_ ``dimension``.
        activity_country (google.ads.googleads.v13.common.types.ActivityCountryInfo):
            Country the activity is in.

            This field is a member of `oneof`_ ``dimension``.
        unknown_listing_dimension (google.ads.googleads.v13.common.types.UnknownListingDimensionInfo):
            Unknown dimension. Set when no other listing
            dimension is set.

            This field is a member of `oneof`_ ``dimension``.
    """

    hotel_id: "HotelIdInfo" = proto.Field(
        proto.MESSAGE, number=2, oneof="dimension", message="HotelIdInfo",
    )
    hotel_class: "HotelClassInfo" = proto.Field(
        proto.MESSAGE, number=3, oneof="dimension", message="HotelClassInfo",
    )
    hotel_country_region: "HotelCountryRegionInfo" = proto.Field(
        proto.MESSAGE,
        number=4,
        oneof="dimension",
        message="HotelCountryRegionInfo",
    )
    hotel_state: "HotelStateInfo" = proto.Field(
        proto.MESSAGE, number=5, oneof="dimension", message="HotelStateInfo",
    )
    hotel_city: "HotelCityInfo" = proto.Field(
        proto.MESSAGE, number=6, oneof="dimension", message="HotelCityInfo",
    )
    product_bidding_category: "ProductBiddingCategoryInfo" = proto.Field(
        proto.MESSAGE,
        number=13,
        oneof="dimension",
        message="ProductBiddingCategoryInfo",
    )
    product_brand: "ProductBrandInfo" = proto.Field(
        proto.MESSAGE, number=15, oneof="dimension", message="ProductBrandInfo",
    )
    product_channel: "ProductChannelInfo" = proto.Field(
        proto.MESSAGE,
        number=8,
        oneof="dimension",
        message="ProductChannelInfo",
    )
    product_channel_exclusivity: "ProductChannelExclusivityInfo" = proto.Field(
        proto.MESSAGE,
        number=9,
        oneof="dimension",
        message="ProductChannelExclusivityInfo",
    )
    product_condition: "ProductConditionInfo" = proto.Field(
        proto.MESSAGE,
        number=10,
        oneof="dimension",
        message="ProductConditionInfo",
    )
    product_custom_attribute: "ProductCustomAttributeInfo" = proto.Field(
        proto.MESSAGE,
        number=16,
        oneof="dimension",
        message="ProductCustomAttributeInfo",
    )
    product_item_id: "ProductItemIdInfo" = proto.Field(
        proto.MESSAGE,
        number=11,
        oneof="dimension",
        message="ProductItemIdInfo",
    )
    product_type: "ProductTypeInfo" = proto.Field(
        proto.MESSAGE, number=12, oneof="dimension", message="ProductTypeInfo",
    )
    product_grouping: "ProductGroupingInfo" = proto.Field(
        proto.MESSAGE,
        number=17,
        oneof="dimension",
        message="ProductGroupingInfo",
    )
    product_labels: "ProductLabelsInfo" = proto.Field(
        proto.MESSAGE,
        number=18,
        oneof="dimension",
        message="ProductLabelsInfo",
    )
    product_legacy_condition: "ProductLegacyConditionInfo" = proto.Field(
        proto.MESSAGE,
        number=19,
        oneof="dimension",
        message="ProductLegacyConditionInfo",
    )
    product_type_full: "ProductTypeFullInfo" = proto.Field(
        proto.MESSAGE,
        number=20,
        oneof="dimension",
        message="ProductTypeFullInfo",
    )
    activity_id: "ActivityIdInfo" = proto.Field(
        proto.MESSAGE, number=21, oneof="dimension", message="ActivityIdInfo",
    )
    activity_rating: "ActivityRatingInfo" = proto.Field(
        proto.MESSAGE,
        number=22,
        oneof="dimension",
        message="ActivityRatingInfo",
    )
    activity_country: "ActivityCountryInfo" = proto.Field(
        proto.MESSAGE,
        number=23,
        oneof="dimension",
        message="ActivityCountryInfo",
    )
    unknown_listing_dimension: "UnknownListingDimensionInfo" = proto.Field(
        proto.MESSAGE,
        number=14,
        oneof="dimension",
        message="UnknownListingDimensionInfo",
    )


class HotelIdInfo(proto.Message):
    r"""Advertiser-specific hotel ID.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the hotel ID.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class HotelClassInfo(proto.Message):
    r"""Class of the hotel as a number of stars 1 to 5.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (int):
            Long value of the hotel class.

            This field is a member of `oneof`_ ``_value``.
    """

    value: int = proto.Field(
        proto.INT64, number=2, optional=True,
    )


class HotelCountryRegionInfo(proto.Message):
    r"""Country or Region the hotel is located in.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        country_region_criterion (str):
            The Geo Target Constant resource name.

            This field is a member of `oneof`_ ``_country_region_criterion``.
    """

    country_region_criterion: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class HotelStateInfo(proto.Message):
    r"""State the hotel is located in.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        state_criterion (str):
            The Geo Target Constant resource name.

            This field is a member of `oneof`_ ``_state_criterion``.
    """

    state_criterion: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class HotelCityInfo(proto.Message):
    r"""City the hotel is located in.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        city_criterion (str):
            The Geo Target Constant resource name.

            This field is a member of `oneof`_ ``_city_criterion``.
    """

    city_criterion: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class ProductBiddingCategoryInfo(proto.Message):
    r"""Bidding category of a product offer.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        id (int):
            ID of the product bidding category.

            This ID is equivalent to the google_product_category ID as
            described in this article:
            https://support.google.com/merchants/answer/6324436

            This field is a member of `oneof`_ ``_id``.
        level (google.ads.googleads.v13.enums.types.ProductBiddingCategoryLevelEnum.ProductBiddingCategoryLevel):
            Level of the product bidding category.
    """

    id: int = proto.Field(
        proto.INT64, number=4, optional=True,
    )
    level: product_bidding_category_level.ProductBiddingCategoryLevelEnum.ProductBiddingCategoryLevel = proto.Field(
        proto.ENUM,
        number=3,
        enum=product_bidding_category_level.ProductBiddingCategoryLevelEnum.ProductBiddingCategoryLevel,
    )


class ProductBrandInfo(proto.Message):
    r"""Brand of the product.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the product brand.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class ProductChannelInfo(proto.Message):
    r"""Locality of a product offer.
    Attributes:
        channel (google.ads.googleads.v13.enums.types.ProductChannelEnum.ProductChannel):
            Value of the locality.
    """

    channel: gage_product_channel.ProductChannelEnum.ProductChannel = proto.Field(
        proto.ENUM,
        number=1,
        enum=gage_product_channel.ProductChannelEnum.ProductChannel,
    )


class ProductChannelExclusivityInfo(proto.Message):
    r"""Availability of a product offer.
    Attributes:
        channel_exclusivity (google.ads.googleads.v13.enums.types.ProductChannelExclusivityEnum.ProductChannelExclusivity):
            Value of the availability.
    """

    channel_exclusivity: gage_product_channel_exclusivity.ProductChannelExclusivityEnum.ProductChannelExclusivity = proto.Field(
        proto.ENUM,
        number=1,
        enum=gage_product_channel_exclusivity.ProductChannelExclusivityEnum.ProductChannelExclusivity,
    )


class ProductConditionInfo(proto.Message):
    r"""Condition of a product offer.
    Attributes:
        condition (google.ads.googleads.v13.enums.types.ProductConditionEnum.ProductCondition):
            Value of the condition.
    """

    condition: gage_product_condition.ProductConditionEnum.ProductCondition = proto.Field(
        proto.ENUM,
        number=1,
        enum=gage_product_condition.ProductConditionEnum.ProductCondition,
    )


class ProductCustomAttributeInfo(proto.Message):
    r"""Custom attribute of a product offer.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the product custom attribute.

            This field is a member of `oneof`_ ``_value``.
        index (google.ads.googleads.v13.enums.types.ProductCustomAttributeIndexEnum.ProductCustomAttributeIndex):
            Indicates the index of the custom attribute.
    """

    value: str = proto.Field(
        proto.STRING, number=3, optional=True,
    )
    index: product_custom_attribute_index.ProductCustomAttributeIndexEnum.ProductCustomAttributeIndex = proto.Field(
        proto.ENUM,
        number=2,
        enum=product_custom_attribute_index.ProductCustomAttributeIndexEnum.ProductCustomAttributeIndex,
    )


class ProductItemIdInfo(proto.Message):
    r"""Item id of a product offer.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            Value of the id.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class ProductTypeInfo(proto.Message):
    r"""Type of a product offer.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            Value of the type.

            This field is a member of `oneof`_ ``_value``.
        level (google.ads.googleads.v13.enums.types.ProductTypeLevelEnum.ProductTypeLevel):
            Level of the type.
    """

    value: str = proto.Field(
        proto.STRING, number=3, optional=True,
    )
    level: product_type_level.ProductTypeLevelEnum.ProductTypeLevel = proto.Field(
        proto.ENUM,
        number=2,
        enum=product_type_level.ProductTypeLevelEnum.ProductTypeLevel,
    )


class ProductGroupingInfo(proto.Message):
    r"""Grouping of a product offer. This listing dimension is
    deprecated and it is supported only in Display campaigns.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the product grouping.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class ProductLabelsInfo(proto.Message):
    r"""Labels of a product offer. This listing dimension is
    deprecated and it is supported only in Display campaigns.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the product labels.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class ProductLegacyConditionInfo(proto.Message):
    r"""Legacy condition of a product offer. This listing dimension
    is deprecated and it is supported only in Display campaigns.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the product legacy condition.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class ProductTypeFullInfo(proto.Message):
    r"""Full type of a product offer. This listing dimension is
    deprecated and it is supported only in Display campaigns.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the product full type.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class UnknownListingDimensionInfo(proto.Message):
    r"""Unknown listing dimension.
    """


class HotelDateSelectionTypeInfo(proto.Message):
    r"""Criterion for hotel date selection (default dates versus user
    selected).

    Attributes:
        type_ (google.ads.googleads.v13.enums.types.HotelDateSelectionTypeEnum.HotelDateSelectionType):
            Type of the hotel date selection
    """

    type_: hotel_date_selection_type.HotelDateSelectionTypeEnum.HotelDateSelectionType = proto.Field(
        proto.ENUM,
        number=1,
        enum=hotel_date_selection_type.HotelDateSelectionTypeEnum.HotelDateSelectionType,
    )


class HotelAdvanceBookingWindowInfo(proto.Message):
    r"""Criterion for number of days prior to the stay the booking is
    being made.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        min_days (int):
            Low end of the number of days prior to the
            stay.

            This field is a member of `oneof`_ ``_min_days``.
        max_days (int):
            High end of the number of days prior to the
            stay.

            This field is a member of `oneof`_ ``_max_days``.
    """

    min_days: int = proto.Field(
        proto.INT64, number=3, optional=True,
    )
    max_days: int = proto.Field(
        proto.INT64, number=4, optional=True,
    )


class HotelLengthOfStayInfo(proto.Message):
    r"""Criterion for length of hotel stay in nights.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        min_nights (int):
            Low end of the number of nights in the stay.

            This field is a member of `oneof`_ ``_min_nights``.
        max_nights (int):
            High end of the number of nights in the stay.

            This field is a member of `oneof`_ ``_max_nights``.
    """

    min_nights: int = proto.Field(
        proto.INT64, number=3, optional=True,
    )
    max_nights: int = proto.Field(
        proto.INT64, number=4, optional=True,
    )


class HotelCheckInDateRangeInfo(proto.Message):
    r"""Criterion for a check-in date range.
    Attributes:
        start_date (str):
            Start date in the YYYY-MM-DD format.
        end_date (str):
            End date in the YYYY-MM-DD format.
    """

    start_date: str = proto.Field(
        proto.STRING, number=1,
    )
    end_date: str = proto.Field(
        proto.STRING, number=2,
    )


class HotelCheckInDayInfo(proto.Message):
    r"""Criterion for day of the week the booking is for.
    Attributes:
        day_of_week (google.ads.googleads.v13.enums.types.DayOfWeekEnum.DayOfWeek):
            The day of the week.
    """

    day_of_week: gage_day_of_week.DayOfWeekEnum.DayOfWeek = proto.Field(
        proto.ENUM, number=1, enum=gage_day_of_week.DayOfWeekEnum.DayOfWeek,
    )


class ActivityIdInfo(proto.Message):
    r"""Advertiser-specific activity ID.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the activity ID.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class ActivityRatingInfo(proto.Message):
    r"""Rating of the activity as a number 1 to 5, where 5 is the
    best.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (int):
            Long value of the activity rating.

            This field is a member of `oneof`_ ``_value``.
    """

    value: int = proto.Field(
        proto.INT64, number=1, optional=True,
    )


class ActivityCountryInfo(proto.Message):
    r"""Country the activity is in.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        value (str):
            String value of the activity country. The Geo
            Target Constant resource name.

            This field is a member of `oneof`_ ``_value``.
    """

    value: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class InteractionTypeInfo(proto.Message):
    r"""Criterion for Interaction Type.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.InteractionTypeEnum.InteractionType):
            The interaction type.
    """

    type_: interaction_type.InteractionTypeEnum.InteractionType = proto.Field(
        proto.ENUM,
        number=1,
        enum=interaction_type.InteractionTypeEnum.InteractionType,
    )


class AdScheduleInfo(proto.Message):
    r"""Represents an AdSchedule criterion.
    AdSchedule is specified as the day of the week and a time
    interval within which ads will be shown.

    No more than six AdSchedules can be added for the same day.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        start_minute (google.ads.googleads.v13.enums.types.MinuteOfHourEnum.MinuteOfHour):
            Minutes after the start hour at which this
            schedule starts.
            This field is required for CREATE operations and
            is prohibited on UPDATE operations.
        end_minute (google.ads.googleads.v13.enums.types.MinuteOfHourEnum.MinuteOfHour):
            Minutes after the end hour at which this
            schedule ends. The schedule is exclusive of the
            end minute.
            This field is required for CREATE operations and
            is prohibited on UPDATE operations.
        start_hour (int):
            Starting hour in 24 hour time.
            This field must be between 0 and 23, inclusive.
            This field is required for CREATE operations and
            is prohibited on UPDATE operations.

            This field is a member of `oneof`_ ``_start_hour``.
        end_hour (int):
            Ending hour in 24 hour time; 24 signifies end
            of the day. This field must be between 0 and 24,
            inclusive.
            This field is required for CREATE operations and
            is prohibited on UPDATE operations.

            This field is a member of `oneof`_ ``_end_hour``.
        day_of_week (google.ads.googleads.v13.enums.types.DayOfWeekEnum.DayOfWeek):
            Day of the week the schedule applies to.
            This field is required for CREATE operations and
            is prohibited on UPDATE operations.
    """

    start_minute: minute_of_hour.MinuteOfHourEnum.MinuteOfHour = proto.Field(
        proto.ENUM, number=1, enum=minute_of_hour.MinuteOfHourEnum.MinuteOfHour,
    )
    end_minute: minute_of_hour.MinuteOfHourEnum.MinuteOfHour = proto.Field(
        proto.ENUM, number=2, enum=minute_of_hour.MinuteOfHourEnum.MinuteOfHour,
    )
    start_hour: int = proto.Field(
        proto.INT32, number=6, optional=True,
    )
    end_hour: int = proto.Field(
        proto.INT32, number=7, optional=True,
    )
    day_of_week: gage_day_of_week.DayOfWeekEnum.DayOfWeek = proto.Field(
        proto.ENUM, number=5, enum=gage_day_of_week.DayOfWeekEnum.DayOfWeek,
    )


class AgeRangeInfo(proto.Message):
    r"""An age range criterion.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.AgeRangeTypeEnum.AgeRangeType):
            Type of the age range.
    """

    type_: age_range_type.AgeRangeTypeEnum.AgeRangeType = proto.Field(
        proto.ENUM, number=1, enum=age_range_type.AgeRangeTypeEnum.AgeRangeType,
    )


class GenderInfo(proto.Message):
    r"""A gender criterion.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.GenderTypeEnum.GenderType):
            Type of the gender.
    """

    type_: gender_type.GenderTypeEnum.GenderType = proto.Field(
        proto.ENUM, number=1, enum=gender_type.GenderTypeEnum.GenderType,
    )


class IncomeRangeInfo(proto.Message):
    r"""An income range criterion.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.IncomeRangeTypeEnum.IncomeRangeType):
            Type of the income range.
    """

    type_: income_range_type.IncomeRangeTypeEnum.IncomeRangeType = proto.Field(
        proto.ENUM,
        number=1,
        enum=income_range_type.IncomeRangeTypeEnum.IncomeRangeType,
    )


class ParentalStatusInfo(proto.Message):
    r"""A parental status criterion.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.ParentalStatusTypeEnum.ParentalStatusType):
            Type of the parental status.
    """

    type_: parental_status_type.ParentalStatusTypeEnum.ParentalStatusType = proto.Field(
        proto.ENUM,
        number=1,
        enum=parental_status_type.ParentalStatusTypeEnum.ParentalStatusType,
    )


class YouTubeVideoInfo(proto.Message):
    r"""A YouTube Video criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        video_id (str):
            YouTube video id as it appears on the YouTube
            watch page.

            This field is a member of `oneof`_ ``_video_id``.
    """

    video_id: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class YouTubeChannelInfo(proto.Message):
    r"""A YouTube Channel criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        channel_id (str):
            The YouTube uploader channel id or the
            channel code of a YouTube channel.

            This field is a member of `oneof`_ ``_channel_id``.
    """

    channel_id: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class UserListInfo(proto.Message):
    r"""A User List criterion. Represents a user list that is defined
    by the advertiser to be targeted.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        user_list (str):
            The User List resource name.

            This field is a member of `oneof`_ ``_user_list``.
    """

    user_list: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class ProximityInfo(proto.Message):
    r"""A Proximity criterion. The geo point and radius determine
    what geographical area is included. The address is a description
    of the geo point that does not affect ad serving.

    There are two ways to create a proximity. First, by setting an
    address and radius. The geo point will be automatically
    computed. Second, by setting a geo point and radius. The address
    is an optional label that won't be validated.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        geo_point (google.ads.googleads.v13.common.types.GeoPointInfo):
            Latitude and longitude.
        radius (float):
            The radius of the proximity.

            This field is a member of `oneof`_ ``_radius``.
        radius_units (google.ads.googleads.v13.enums.types.ProximityRadiusUnitsEnum.ProximityRadiusUnits):
            The unit of measurement of the radius.
            Default is KILOMETERS.
        address (google.ads.googleads.v13.common.types.AddressInfo):
            Full address.
    """

    geo_point: "GeoPointInfo" = proto.Field(
        proto.MESSAGE, number=1, message="GeoPointInfo",
    )
    radius: float = proto.Field(
        proto.DOUBLE, number=5, optional=True,
    )
    radius_units: proximity_radius_units.ProximityRadiusUnitsEnum.ProximityRadiusUnits = proto.Field(
        proto.ENUM,
        number=3,
        enum=proximity_radius_units.ProximityRadiusUnitsEnum.ProximityRadiusUnits,
    )
    address: "AddressInfo" = proto.Field(
        proto.MESSAGE, number=4, message="AddressInfo",
    )


class GeoPointInfo(proto.Message):
    r"""Geo point for proximity criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        longitude_in_micro_degrees (int):
            Micro degrees for the longitude.

            This field is a member of `oneof`_ ``_longitude_in_micro_degrees``.
        latitude_in_micro_degrees (int):
            Micro degrees for the latitude.

            This field is a member of `oneof`_ ``_latitude_in_micro_degrees``.
    """

    longitude_in_micro_degrees: int = proto.Field(
        proto.INT32, number=3, optional=True,
    )
    latitude_in_micro_degrees: int = proto.Field(
        proto.INT32, number=4, optional=True,
    )


class AddressInfo(proto.Message):
    r"""Address for proximity criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        postal_code (str):
            Postal code.

            This field is a member of `oneof`_ ``_postal_code``.
        province_code (str):
            Province or state code.

            This field is a member of `oneof`_ ``_province_code``.
        country_code (str):
            Country code.

            This field is a member of `oneof`_ ``_country_code``.
        province_name (str):
            Province or state name.

            This field is a member of `oneof`_ ``_province_name``.
        street_address (str):
            Street address line 1.

            This field is a member of `oneof`_ ``_street_address``.
        street_address2 (str):
            Street address line 2. This field is write-only. It is only
            used for calculating the longitude and latitude of an
            address when geo_point is empty.

            This field is a member of `oneof`_ ``_street_address2``.
        city_name (str):
            Name of the city.

            This field is a member of `oneof`_ ``_city_name``.
    """

    postal_code: str = proto.Field(
        proto.STRING, number=8, optional=True,
    )
    province_code: str = proto.Field(
        proto.STRING, number=9, optional=True,
    )
    country_code: str = proto.Field(
        proto.STRING, number=10, optional=True,
    )
    province_name: str = proto.Field(
        proto.STRING, number=11, optional=True,
    )
    street_address: str = proto.Field(
        proto.STRING, number=12, optional=True,
    )
    street_address2: str = proto.Field(
        proto.STRING, number=13, optional=True,
    )
    city_name: str = proto.Field(
        proto.STRING, number=14, optional=True,
    )


class TopicInfo(proto.Message):
    r"""A topic criterion. Use topics to target or exclude placements
    in the Google Display Network based on the category into which
    the placement falls (for example, "Pets & Animals/Pets/Dogs").

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        topic_constant (str):
            The Topic Constant resource name.

            This field is a member of `oneof`_ ``_topic_constant``.
        path (MutableSequence[str]):
            The category to target or exclude. Each
            subsequent element in the array describes a more
            specific sub-category. For example, "Pets &
            Animals", "Pets", "Dogs" represents the "Pets &
            Animals/Pets/Dogs" category.
    """

    topic_constant: str = proto.Field(
        proto.STRING, number=3, optional=True,
    )
    path: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=4,
    )


class LanguageInfo(proto.Message):
    r"""A language criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        language_constant (str):
            The language constant resource name.

            This field is a member of `oneof`_ ``_language_constant``.
    """

    language_constant: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class IpBlockInfo(proto.Message):
    r"""An IpBlock criterion used for IP exclusions. We allow:
    - IPv4 and IPv6 addresses
     - individual addresses (192.168.0.1)
     - masks for individual addresses (192.168.0.1/32)
     - masks for Class C networks (192.168.0.1/24)

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        ip_address (str):
            The IP address of this IP block.

            This field is a member of `oneof`_ ``_ip_address``.
    """

    ip_address: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class ContentLabelInfo(proto.Message):
    r"""Content Label for category exclusion.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.ContentLabelTypeEnum.ContentLabelType):
            Content label type, required for CREATE
            operations.
    """

    type_: content_label_type.ContentLabelTypeEnum.ContentLabelType = proto.Field(
        proto.ENUM,
        number=1,
        enum=content_label_type.ContentLabelTypeEnum.ContentLabelType,
    )


class CarrierInfo(proto.Message):
    r"""Represents a Carrier Criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        carrier_constant (str):
            The Carrier constant resource name.

            This field is a member of `oneof`_ ``_carrier_constant``.
    """

    carrier_constant: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class UserInterestInfo(proto.Message):
    r"""Represents a particular interest-based topic to be targeted.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        user_interest_category (str):
            The UserInterest resource name.

            This field is a member of `oneof`_ ``_user_interest_category``.
    """

    user_interest_category: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class WebpageInfo(proto.Message):
    r"""Represents a criterion for targeting webpages of an
    advertiser's website.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        criterion_name (str):
            The name of the criterion that is defined by
            this parameter. The name value will be used for
            identifying, sorting and filtering criteria with
            this type of parameters.

            This field is required for CREATE operations and
            is prohibited on UPDATE operations.

            This field is a member of `oneof`_ ``_criterion_name``.
        conditions (MutableSequence[google.ads.googleads.v13.common.types.WebpageConditionInfo]):
            Conditions, or logical expressions, for
            webpage targeting. The list of webpage targeting
            conditions are and-ed together when evaluated
            for targeting. An empty list of conditions
            indicates all pages of the campaign's website
            are targeted.

            This field is required for CREATE operations and
            is prohibited on UPDATE operations.
        coverage_percentage (float):
            Website criteria coverage percentage. This is
            the computed percentage of website coverage
            based on the website target, negative website
            target and negative keywords in the ad group and
            campaign. For instance, when coverage returns as
            1, it indicates it has 100% coverage. This field
            is read-only.
        sample (google.ads.googleads.v13.common.types.WebpageSampleInfo):
            List of sample urls that match the website
            target. This field is read-only.
    """

    criterion_name: str = proto.Field(
        proto.STRING, number=3, optional=True,
    )
    conditions: MutableSequence["WebpageConditionInfo"] = proto.RepeatedField(
        proto.MESSAGE, number=2, message="WebpageConditionInfo",
    )
    coverage_percentage: float = proto.Field(
        proto.DOUBLE, number=4,
    )
    sample: "WebpageSampleInfo" = proto.Field(
        proto.MESSAGE, number=5, message="WebpageSampleInfo",
    )


class WebpageConditionInfo(proto.Message):
    r"""Logical expression for targeting webpages of an advertiser's
    website.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        operand (google.ads.googleads.v13.enums.types.WebpageConditionOperandEnum.WebpageConditionOperand):
            Operand of webpage targeting condition.
        operator (google.ads.googleads.v13.enums.types.WebpageConditionOperatorEnum.WebpageConditionOperator):
            Operator of webpage targeting condition.
        argument (str):
            Argument of webpage targeting condition.

            This field is a member of `oneof`_ ``_argument``.
    """

    operand: webpage_condition_operand.WebpageConditionOperandEnum.WebpageConditionOperand = proto.Field(
        proto.ENUM,
        number=1,
        enum=webpage_condition_operand.WebpageConditionOperandEnum.WebpageConditionOperand,
    )
    operator: webpage_condition_operator.WebpageConditionOperatorEnum.WebpageConditionOperator = proto.Field(
        proto.ENUM,
        number=2,
        enum=webpage_condition_operator.WebpageConditionOperatorEnum.WebpageConditionOperator,
    )
    argument: str = proto.Field(
        proto.STRING, number=4, optional=True,
    )


class WebpageSampleInfo(proto.Message):
    r"""List of sample urls that match the website target
    Attributes:
        sample_urls (MutableSequence[str]):
            Webpage sample urls
    """

    sample_urls: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=1,
    )


class OperatingSystemVersionInfo(proto.Message):
    r"""Represents an operating system version to be targeted.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        operating_system_version_constant (str):
            The operating system version constant
            resource name.

            This field is a member of `oneof`_ ``_operating_system_version_constant``.
    """

    operating_system_version_constant: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class AppPaymentModelInfo(proto.Message):
    r"""An app payment model criterion.
    Attributes:
        type_ (google.ads.googleads.v13.enums.types.AppPaymentModelTypeEnum.AppPaymentModelType):
            Type of the app payment model.
    """

    type_: app_payment_model_type.AppPaymentModelTypeEnum.AppPaymentModelType = proto.Field(
        proto.ENUM,
        number=1,
        enum=app_payment_model_type.AppPaymentModelTypeEnum.AppPaymentModelType,
    )


class MobileDeviceInfo(proto.Message):
    r"""A mobile device criterion.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        mobile_device_constant (str):
            The mobile device constant resource name.

            This field is a member of `oneof`_ ``_mobile_device_constant``.
    """

    mobile_device_constant: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class CustomAffinityInfo(proto.Message):
    r"""A custom affinity criterion.
    A criterion of this type is only targetable.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        custom_affinity (str):
            The CustomInterest resource name.

            This field is a member of `oneof`_ ``_custom_affinity``.
    """

    custom_affinity: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class CustomIntentInfo(proto.Message):
    r"""A custom intent criterion.
    A criterion of this type is only targetable.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        custom_intent (str):
            The CustomInterest resource name.

            This field is a member of `oneof`_ ``_custom_intent``.
    """

    custom_intent: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class LocationGroupInfo(proto.Message):
    r"""A radius around a list of locations specified through a feed
    or assetSet.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        feed (str):
            Feed specifying locations for targeting.
            Cannot be set with AssetSet fields. This is
            required and must be set in CREATE operations.

            This field is a member of `oneof`_ ``_feed``.
        geo_target_constants (MutableSequence[str]):
            Geo target constant(s) restricting the scope
            of the geographic area within the feed.
            Currently only one geo target constant is
            allowed. Cannot be set with AssetSet fields.
        radius (int):
            Distance in units specifying the radius
            around targeted locations. This is required and
            must be set in CREATE operations.

            This field is a member of `oneof`_ ``_radius``.
        radius_units (google.ads.googleads.v13.enums.types.LocationGroupRadiusUnitsEnum.LocationGroupRadiusUnits):
            Unit of the radius. Miles and meters are
            supported for geo target constants. Milli miles
            and meters are supported for feed item sets and
            asset sets. This is required and must be set in
            CREATE operations.
        feed_item_sets (MutableSequence[str]):
            FeedItemSets whose FeedItems are targeted. If multiple IDs
            are specified, then all items that appear in at least one
            set are targeted. This field cannot be used with
            geo_target_constants. This is optional and can only be set
            in CREATE operations. Cannot be set with AssetSet fields.
        enable_customer_level_location_asset_set (bool):
            Denotes that the latest customer level asset set is used for
            targeting. Used with radius and radius_units. Cannot be used
            with feed, geo target constants or feed item sets. When
            using asset sets, either this field or
            location_group_asset_sets should be specified. Both cannot
            be used at the same time. This can only be set in CREATE
            operations.

            This field is a member of `oneof`_ ``_enable_customer_level_location_asset_set``.
        location_group_asset_sets (MutableSequence[str]):
            AssetSets whose Assets are targeted. If multiple IDs are
            specified, then all items that appear in at least one set
            are targeted. This field cannot be used with feed, geo
            target constants or feed item sets. When using asset sets,
            either this field or
            enable_customer_level_location_asset_set should be
            specified. Both cannot be used at the same time. This can
            only be set in CREATE operations.
    """

    feed: str = proto.Field(
        proto.STRING, number=5, optional=True,
    )
    geo_target_constants: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=6,
    )
    radius: int = proto.Field(
        proto.INT64, number=7, optional=True,
    )
    radius_units: location_group_radius_units.LocationGroupRadiusUnitsEnum.LocationGroupRadiusUnits = proto.Field(
        proto.ENUM,
        number=4,
        enum=location_group_radius_units.LocationGroupRadiusUnitsEnum.LocationGroupRadiusUnits,
    )
    feed_item_sets: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=8,
    )
    enable_customer_level_location_asset_set: bool = proto.Field(
        proto.BOOL, number=9, optional=True,
    )
    location_group_asset_sets: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=10,
    )


class CustomAudienceInfo(proto.Message):
    r"""A custom audience criterion.
    Attributes:
        custom_audience (str):
            The CustomAudience resource name.
    """

    custom_audience: str = proto.Field(
        proto.STRING, number=1,
    )


class CombinedAudienceInfo(proto.Message):
    r"""A combined audience criterion.
    Attributes:
        combined_audience (str):
            The CombinedAudience resource name.
    """

    combined_audience: str = proto.Field(
        proto.STRING, number=1,
    )


class AudienceInfo(proto.Message):
    r"""An audience criterion.
    Attributes:
        audience (str):
            The Audience resource name.
    """

    audience: str = proto.Field(
        proto.STRING, number=1,
    )


class KeywordThemeInfo(proto.Message):
    r"""A Smart Campaign keyword theme.
    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        keyword_theme_constant (str):
            The resource name of a Smart Campaign keyword theme
            constant.
            ``keywordThemeConstants/{keyword_theme_id}~{sub_keyword_theme_id}``

            This field is a member of `oneof`_ ``keyword_theme``.
        free_form_keyword_theme (str):
            Free-form text to be matched to a Smart
            Campaign keyword theme constant on a best-effort
            basis.

            This field is a member of `oneof`_ ``keyword_theme``.
    """

    keyword_theme_constant: str = proto.Field(
        proto.STRING, number=1, oneof="keyword_theme",
    )
    free_form_keyword_theme: str = proto.Field(
        proto.STRING, number=2, oneof="keyword_theme",
    )


class LocalServiceIdInfo(proto.Message):
    r"""A Local Services Ads service ID. Represents a service type (such as
    install_faucet) that a Local Services Campaign can target.

    Attributes:
        service_id (str):
            The criterion resource name.
    """

    service_id: str = proto.Field(
        proto.STRING, number=1,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
