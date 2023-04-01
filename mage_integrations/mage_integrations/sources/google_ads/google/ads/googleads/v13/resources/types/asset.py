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

from google.ads.googleads.v13.common.types import asset_types
from google.ads.googleads.v13.common.types import custom_parameter
from google.ads.googleads.v13.common.types import policy
from google.ads.googleads.v13.enums.types import (
    asset_field_type as gage_asset_field_type,
)
from google.ads.googleads.v13.enums.types import (
    asset_source as gage_asset_source,
)
from google.ads.googleads.v13.enums.types import asset_type
from google.ads.googleads.v13.enums.types import policy_approval_status
from google.ads.googleads.v13.enums.types import policy_review_status


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"Asset", "AssetFieldTypePolicySummary", "AssetPolicySummary",},
)


class Asset(proto.Message):
    r"""Asset is a part of an ad which can be shared across multiple
    ads. It can be an image (ImageAsset), a video
    (YoutubeVideoAsset), etc. Assets are immutable and cannot be
    removed. To stop an asset from serving, remove the asset from
    the entity that is using it.

    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Immutable. The resource name of the asset. Asset resource
            names have the form:

            ``customers/{customer_id}/assets/{asset_id}``
        id (int):
            Output only. The ID of the asset.

            This field is a member of `oneof`_ ``_id``.
        name (str):
            Optional name of the asset.

            This field is a member of `oneof`_ ``_name``.
        type_ (google.ads.googleads.v13.enums.types.AssetTypeEnum.AssetType):
            Output only. Type of the asset.
        final_urls (MutableSequence[str]):
            A list of possible final URLs after all cross
            domain redirects.
        final_mobile_urls (MutableSequence[str]):
            A list of possible final mobile URLs after
            all cross domain redirects.
        tracking_url_template (str):
            URL template for constructing a tracking URL.

            This field is a member of `oneof`_ ``_tracking_url_template``.
        url_custom_parameters (MutableSequence[google.ads.googleads.v13.common.types.CustomParameter]):
            A list of mappings to be used for substituting URL custom
            parameter tags in the tracking_url_template, final_urls,
            and/or final_mobile_urls.
        final_url_suffix (str):
            URL template for appending params to landing
            page URLs served with parallel tracking.

            This field is a member of `oneof`_ ``_final_url_suffix``.
        source (google.ads.googleads.v13.enums.types.AssetSourceEnum.AssetSource):
            Output only. Source of the asset.
        policy_summary (google.ads.googleads.v13.resources.types.AssetPolicySummary):
            Output only. Policy information for the
            asset.
        field_type_policy_summaries (MutableSequence[google.ads.googleads.v13.resources.types.AssetFieldTypePolicySummary]):
            Output only. Policy information for the asset
            for each FieldType.
        youtube_video_asset (google.ads.googleads.v13.common.types.YoutubeVideoAsset):
            Immutable. A YouTube video asset.

            This field is a member of `oneof`_ ``asset_data``.
        media_bundle_asset (google.ads.googleads.v13.common.types.MediaBundleAsset):
            Immutable. A media bundle asset.

            This field is a member of `oneof`_ ``asset_data``.
        image_asset (google.ads.googleads.v13.common.types.ImageAsset):
            Output only. An image asset.

            This field is a member of `oneof`_ ``asset_data``.
        text_asset (google.ads.googleads.v13.common.types.TextAsset):
            Immutable. A text asset.

            This field is a member of `oneof`_ ``asset_data``.
        lead_form_asset (google.ads.googleads.v13.common.types.LeadFormAsset):
            A lead form asset.

            This field is a member of `oneof`_ ``asset_data``.
        book_on_google_asset (google.ads.googleads.v13.common.types.BookOnGoogleAsset):
            A book on google asset.

            This field is a member of `oneof`_ ``asset_data``.
        promotion_asset (google.ads.googleads.v13.common.types.PromotionAsset):
            A promotion asset.

            This field is a member of `oneof`_ ``asset_data``.
        callout_asset (google.ads.googleads.v13.common.types.CalloutAsset):
            A callout asset.

            This field is a member of `oneof`_ ``asset_data``.
        structured_snippet_asset (google.ads.googleads.v13.common.types.StructuredSnippetAsset):
            A structured snippet asset.

            This field is a member of `oneof`_ ``asset_data``.
        sitelink_asset (google.ads.googleads.v13.common.types.SitelinkAsset):
            A sitelink asset.

            This field is a member of `oneof`_ ``asset_data``.
        page_feed_asset (google.ads.googleads.v13.common.types.PageFeedAsset):
            A page feed asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_education_asset (google.ads.googleads.v13.common.types.DynamicEducationAsset):
            A dynamic education asset.

            This field is a member of `oneof`_ ``asset_data``.
        mobile_app_asset (google.ads.googleads.v13.common.types.MobileAppAsset):
            A mobile app asset.

            This field is a member of `oneof`_ ``asset_data``.
        hotel_callout_asset (google.ads.googleads.v13.common.types.HotelCalloutAsset):
            A hotel callout asset.

            This field is a member of `oneof`_ ``asset_data``.
        call_asset (google.ads.googleads.v13.common.types.CallAsset):
            A call asset.

            This field is a member of `oneof`_ ``asset_data``.
        price_asset (google.ads.googleads.v13.common.types.PriceAsset):
            A price asset.

            This field is a member of `oneof`_ ``asset_data``.
        call_to_action_asset (google.ads.googleads.v13.common.types.CallToActionAsset):
            Immutable. A call to action asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_real_estate_asset (google.ads.googleads.v13.common.types.DynamicRealEstateAsset):
            A dynamic real estate asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_custom_asset (google.ads.googleads.v13.common.types.DynamicCustomAsset):
            A dynamic custom asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_hotels_and_rentals_asset (google.ads.googleads.v13.common.types.DynamicHotelsAndRentalsAsset):
            A dynamic hotels and rentals asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_flights_asset (google.ads.googleads.v13.common.types.DynamicFlightsAsset):
            A dynamic flights asset.

            This field is a member of `oneof`_ ``asset_data``.
        discovery_carousel_card_asset (google.ads.googleads.v13.common.types.DiscoveryCarouselCardAsset):
            Immutable. A discovery carousel card asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_travel_asset (google.ads.googleads.v13.common.types.DynamicTravelAsset):
            A dynamic travel asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_local_asset (google.ads.googleads.v13.common.types.DynamicLocalAsset):
            A dynamic local asset.

            This field is a member of `oneof`_ ``asset_data``.
        dynamic_jobs_asset (google.ads.googleads.v13.common.types.DynamicJobsAsset):
            A dynamic jobs asset.

            This field is a member of `oneof`_ ``asset_data``.
        location_asset (google.ads.googleads.v13.common.types.LocationAsset):
            Output only. A location asset.

            This field is a member of `oneof`_ ``asset_data``.
        hotel_property_asset (google.ads.googleads.v13.common.types.HotelPropertyAsset):
            Immutable. A hotel property asset.

            This field is a member of `oneof`_ ``asset_data``.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    id: int = proto.Field(
        proto.INT64, number=11, optional=True,
    )
    name: str = proto.Field(
        proto.STRING, number=12, optional=True,
    )
    type_: asset_type.AssetTypeEnum.AssetType = proto.Field(
        proto.ENUM, number=4, enum=asset_type.AssetTypeEnum.AssetType,
    )
    final_urls: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=14,
    )
    final_mobile_urls: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=16,
    )
    tracking_url_template: str = proto.Field(
        proto.STRING, number=17, optional=True,
    )
    url_custom_parameters: MutableSequence[
        custom_parameter.CustomParameter
    ] = proto.RepeatedField(
        proto.MESSAGE, number=18, message=custom_parameter.CustomParameter,
    )
    final_url_suffix: str = proto.Field(
        proto.STRING, number=19, optional=True,
    )
    source: gage_asset_source.AssetSourceEnum.AssetSource = proto.Field(
        proto.ENUM,
        number=38,
        enum=gage_asset_source.AssetSourceEnum.AssetSource,
    )
    policy_summary: "AssetPolicySummary" = proto.Field(
        proto.MESSAGE, number=13, message="AssetPolicySummary",
    )
    field_type_policy_summaries: MutableSequence[
        "AssetFieldTypePolicySummary"
    ] = proto.RepeatedField(
        proto.MESSAGE, number=40, message="AssetFieldTypePolicySummary",
    )
    youtube_video_asset: asset_types.YoutubeVideoAsset = proto.Field(
        proto.MESSAGE,
        number=5,
        oneof="asset_data",
        message=asset_types.YoutubeVideoAsset,
    )
    media_bundle_asset: asset_types.MediaBundleAsset = proto.Field(
        proto.MESSAGE,
        number=6,
        oneof="asset_data",
        message=asset_types.MediaBundleAsset,
    )
    image_asset: asset_types.ImageAsset = proto.Field(
        proto.MESSAGE,
        number=7,
        oneof="asset_data",
        message=asset_types.ImageAsset,
    )
    text_asset: asset_types.TextAsset = proto.Field(
        proto.MESSAGE,
        number=8,
        oneof="asset_data",
        message=asset_types.TextAsset,
    )
    lead_form_asset: asset_types.LeadFormAsset = proto.Field(
        proto.MESSAGE,
        number=9,
        oneof="asset_data",
        message=asset_types.LeadFormAsset,
    )
    book_on_google_asset: asset_types.BookOnGoogleAsset = proto.Field(
        proto.MESSAGE,
        number=10,
        oneof="asset_data",
        message=asset_types.BookOnGoogleAsset,
    )
    promotion_asset: asset_types.PromotionAsset = proto.Field(
        proto.MESSAGE,
        number=15,
        oneof="asset_data",
        message=asset_types.PromotionAsset,
    )
    callout_asset: asset_types.CalloutAsset = proto.Field(
        proto.MESSAGE,
        number=20,
        oneof="asset_data",
        message=asset_types.CalloutAsset,
    )
    structured_snippet_asset: asset_types.StructuredSnippetAsset = proto.Field(
        proto.MESSAGE,
        number=21,
        oneof="asset_data",
        message=asset_types.StructuredSnippetAsset,
    )
    sitelink_asset: asset_types.SitelinkAsset = proto.Field(
        proto.MESSAGE,
        number=22,
        oneof="asset_data",
        message=asset_types.SitelinkAsset,
    )
    page_feed_asset: asset_types.PageFeedAsset = proto.Field(
        proto.MESSAGE,
        number=23,
        oneof="asset_data",
        message=asset_types.PageFeedAsset,
    )
    dynamic_education_asset: asset_types.DynamicEducationAsset = proto.Field(
        proto.MESSAGE,
        number=24,
        oneof="asset_data",
        message=asset_types.DynamicEducationAsset,
    )
    mobile_app_asset: asset_types.MobileAppAsset = proto.Field(
        proto.MESSAGE,
        number=25,
        oneof="asset_data",
        message=asset_types.MobileAppAsset,
    )
    hotel_callout_asset: asset_types.HotelCalloutAsset = proto.Field(
        proto.MESSAGE,
        number=26,
        oneof="asset_data",
        message=asset_types.HotelCalloutAsset,
    )
    call_asset: asset_types.CallAsset = proto.Field(
        proto.MESSAGE,
        number=27,
        oneof="asset_data",
        message=asset_types.CallAsset,
    )
    price_asset: asset_types.PriceAsset = proto.Field(
        proto.MESSAGE,
        number=28,
        oneof="asset_data",
        message=asset_types.PriceAsset,
    )
    call_to_action_asset: asset_types.CallToActionAsset = proto.Field(
        proto.MESSAGE,
        number=29,
        oneof="asset_data",
        message=asset_types.CallToActionAsset,
    )
    dynamic_real_estate_asset: asset_types.DynamicRealEstateAsset = proto.Field(
        proto.MESSAGE,
        number=30,
        oneof="asset_data",
        message=asset_types.DynamicRealEstateAsset,
    )
    dynamic_custom_asset: asset_types.DynamicCustomAsset = proto.Field(
        proto.MESSAGE,
        number=31,
        oneof="asset_data",
        message=asset_types.DynamicCustomAsset,
    )
    dynamic_hotels_and_rentals_asset: asset_types.DynamicHotelsAndRentalsAsset = proto.Field(
        proto.MESSAGE,
        number=32,
        oneof="asset_data",
        message=asset_types.DynamicHotelsAndRentalsAsset,
    )
    dynamic_flights_asset: asset_types.DynamicFlightsAsset = proto.Field(
        proto.MESSAGE,
        number=33,
        oneof="asset_data",
        message=asset_types.DynamicFlightsAsset,
    )
    discovery_carousel_card_asset: asset_types.DiscoveryCarouselCardAsset = proto.Field(
        proto.MESSAGE,
        number=34,
        oneof="asset_data",
        message=asset_types.DiscoveryCarouselCardAsset,
    )
    dynamic_travel_asset: asset_types.DynamicTravelAsset = proto.Field(
        proto.MESSAGE,
        number=35,
        oneof="asset_data",
        message=asset_types.DynamicTravelAsset,
    )
    dynamic_local_asset: asset_types.DynamicLocalAsset = proto.Field(
        proto.MESSAGE,
        number=36,
        oneof="asset_data",
        message=asset_types.DynamicLocalAsset,
    )
    dynamic_jobs_asset: asset_types.DynamicJobsAsset = proto.Field(
        proto.MESSAGE,
        number=37,
        oneof="asset_data",
        message=asset_types.DynamicJobsAsset,
    )
    location_asset: asset_types.LocationAsset = proto.Field(
        proto.MESSAGE,
        number=39,
        oneof="asset_data",
        message=asset_types.LocationAsset,
    )
    hotel_property_asset: asset_types.HotelPropertyAsset = proto.Field(
        proto.MESSAGE,
        number=41,
        oneof="asset_data",
        message=asset_types.HotelPropertyAsset,
    )


class AssetFieldTypePolicySummary(proto.Message):
    r"""Contains policy information for an asset under AssetFieldType
    context.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        asset_field_type (google.ads.googleads.v13.enums.types.AssetFieldTypeEnum.AssetFieldType):
            Output only. FieldType of this asset.

            This field is a member of `oneof`_ ``_asset_field_type``.
        asset_source (google.ads.googleads.v13.enums.types.AssetSourceEnum.AssetSource):
            Output only. Source of this asset.

            This field is a member of `oneof`_ ``_asset_source``.
        policy_summary_info (google.ads.googleads.v13.resources.types.AssetPolicySummary):
            Output only. Policy summary.

            This field is a member of `oneof`_ ``_policy_summary_info``.
    """

    asset_field_type: gage_asset_field_type.AssetFieldTypeEnum.AssetFieldType = proto.Field(
        proto.ENUM,
        number=1,
        optional=True,
        enum=gage_asset_field_type.AssetFieldTypeEnum.AssetFieldType,
    )
    asset_source: gage_asset_source.AssetSourceEnum.AssetSource = proto.Field(
        proto.ENUM,
        number=2,
        optional=True,
        enum=gage_asset_source.AssetSourceEnum.AssetSource,
    )
    policy_summary_info: "AssetPolicySummary" = proto.Field(
        proto.MESSAGE, number=3, optional=True, message="AssetPolicySummary",
    )


class AssetPolicySummary(proto.Message):
    r"""Contains policy information for an asset.
    Attributes:
        policy_topic_entries (MutableSequence[google.ads.googleads.v13.common.types.PolicyTopicEntry]):
            Output only. The list of policy findings for
            this asset.
        review_status (google.ads.googleads.v13.enums.types.PolicyReviewStatusEnum.PolicyReviewStatus):
            Output only. Where in the review process this
            asset is.
        approval_status (google.ads.googleads.v13.enums.types.PolicyApprovalStatusEnum.PolicyApprovalStatus):
            Output only. The overall approval status of
            this asset, calculated based on the status of
            its individual policy topic entries.
    """

    policy_topic_entries: MutableSequence[
        policy.PolicyTopicEntry
    ] = proto.RepeatedField(
        proto.MESSAGE, number=1, message=policy.PolicyTopicEntry,
    )
    review_status: policy_review_status.PolicyReviewStatusEnum.PolicyReviewStatus = proto.Field(
        proto.ENUM,
        number=2,
        enum=policy_review_status.PolicyReviewStatusEnum.PolicyReviewStatus,
    )
    approval_status: policy_approval_status.PolicyApprovalStatusEnum.PolicyApprovalStatus = proto.Field(
        proto.ENUM,
        number=3,
        enum=policy_approval_status.PolicyApprovalStatusEnum.PolicyApprovalStatus,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
