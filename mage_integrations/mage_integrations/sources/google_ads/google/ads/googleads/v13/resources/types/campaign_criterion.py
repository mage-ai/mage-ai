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

from google.ads.googleads.v13.common.types import criteria
from google.ads.googleads.v13.enums.types import campaign_criterion_status
from google.ads.googleads.v13.enums.types import criterion_type


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"CampaignCriterion",},
)


class CampaignCriterion(proto.Message):
    r"""A campaign criterion.
    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Immutable. The resource name of the campaign criterion.
            Campaign criterion resource names have the form:

            ``customers/{customer_id}/campaignCriteria/{campaign_id}~{criterion_id}``
        campaign (str):
            Immutable. The campaign to which the
            criterion belongs.

            This field is a member of `oneof`_ ``_campaign``.
        criterion_id (int):
            Output only. The ID of the criterion.
            This field is ignored during mutate.

            This field is a member of `oneof`_ ``_criterion_id``.
        display_name (str):
            Output only. The display name of the
            criterion.
            This field is ignored for mutates.
        bid_modifier (float):
            The modifier for the bids when the criterion
            matches. The modifier must be in the range: 0.1
            - 10.0. Most targetable criteria types support
            modifiers. Use 0 to opt out of a Device type.

            This field is a member of `oneof`_ ``_bid_modifier``.
        negative (bool):
            Immutable. Whether to target (``false``) or exclude
            (``true``) the criterion.

            This field is a member of `oneof`_ ``_negative``.
        type_ (google.ads.googleads.v13.enums.types.CriterionTypeEnum.CriterionType):
            Output only. The type of the criterion.
        status (google.ads.googleads.v13.enums.types.CampaignCriterionStatusEnum.CampaignCriterionStatus):
            The status of the criterion.
        keyword (google.ads.googleads.v13.common.types.KeywordInfo):
            Immutable. Keyword.

            This field is a member of `oneof`_ ``criterion``.
        placement (google.ads.googleads.v13.common.types.PlacementInfo):
            Immutable. Placement.

            This field is a member of `oneof`_ ``criterion``.
        mobile_app_category (google.ads.googleads.v13.common.types.MobileAppCategoryInfo):
            Immutable. Mobile app category.

            This field is a member of `oneof`_ ``criterion``.
        mobile_application (google.ads.googleads.v13.common.types.MobileApplicationInfo):
            Immutable. Mobile application.

            This field is a member of `oneof`_ ``criterion``.
        location (google.ads.googleads.v13.common.types.LocationInfo):
            Immutable. Location.

            This field is a member of `oneof`_ ``criterion``.
        device (google.ads.googleads.v13.common.types.DeviceInfo):
            Immutable. Device.

            This field is a member of `oneof`_ ``criterion``.
        ad_schedule (google.ads.googleads.v13.common.types.AdScheduleInfo):
            Immutable. Ad Schedule.

            This field is a member of `oneof`_ ``criterion``.
        age_range (google.ads.googleads.v13.common.types.AgeRangeInfo):
            Immutable. Age range.

            This field is a member of `oneof`_ ``criterion``.
        gender (google.ads.googleads.v13.common.types.GenderInfo):
            Immutable. Gender.

            This field is a member of `oneof`_ ``criterion``.
        income_range (google.ads.googleads.v13.common.types.IncomeRangeInfo):
            Immutable. Income range.

            This field is a member of `oneof`_ ``criterion``.
        parental_status (google.ads.googleads.v13.common.types.ParentalStatusInfo):
            Immutable. Parental status.

            This field is a member of `oneof`_ ``criterion``.
        user_list (google.ads.googleads.v13.common.types.UserListInfo):
            Immutable. User List.
            The Similar Audiences sunset starts May 2023.
            Refer to
            https://ads-developers.googleblog.com/2022/11/announcing-deprecation-and-sunset-of.html
            for other options.

            This field is a member of `oneof`_ ``criterion``.
        youtube_video (google.ads.googleads.v13.common.types.YouTubeVideoInfo):
            Immutable. YouTube Video.

            This field is a member of `oneof`_ ``criterion``.
        youtube_channel (google.ads.googleads.v13.common.types.YouTubeChannelInfo):
            Immutable. YouTube Channel.

            This field is a member of `oneof`_ ``criterion``.
        proximity (google.ads.googleads.v13.common.types.ProximityInfo):
            Immutable. Proximity.

            This field is a member of `oneof`_ ``criterion``.
        topic (google.ads.googleads.v13.common.types.TopicInfo):
            Immutable. Topic.

            This field is a member of `oneof`_ ``criterion``.
        listing_scope (google.ads.googleads.v13.common.types.ListingScopeInfo):
            Immutable. Listing scope.

            This field is a member of `oneof`_ ``criterion``.
        language (google.ads.googleads.v13.common.types.LanguageInfo):
            Immutable. Language.

            This field is a member of `oneof`_ ``criterion``.
        ip_block (google.ads.googleads.v13.common.types.IpBlockInfo):
            Immutable. IpBlock.

            This field is a member of `oneof`_ ``criterion``.
        content_label (google.ads.googleads.v13.common.types.ContentLabelInfo):
            Immutable. ContentLabel.

            This field is a member of `oneof`_ ``criterion``.
        carrier (google.ads.googleads.v13.common.types.CarrierInfo):
            Immutable. Carrier.

            This field is a member of `oneof`_ ``criterion``.
        user_interest (google.ads.googleads.v13.common.types.UserInterestInfo):
            Immutable. User Interest.

            This field is a member of `oneof`_ ``criterion``.
        webpage (google.ads.googleads.v13.common.types.WebpageInfo):
            Immutable. Webpage.

            This field is a member of `oneof`_ ``criterion``.
        operating_system_version (google.ads.googleads.v13.common.types.OperatingSystemVersionInfo):
            Immutable. Operating system version.

            This field is a member of `oneof`_ ``criterion``.
        mobile_device (google.ads.googleads.v13.common.types.MobileDeviceInfo):
            Immutable. Mobile Device.

            This field is a member of `oneof`_ ``criterion``.
        location_group (google.ads.googleads.v13.common.types.LocationGroupInfo):
            Immutable. Location Group

            This field is a member of `oneof`_ ``criterion``.
        custom_affinity (google.ads.googleads.v13.common.types.CustomAffinityInfo):
            Immutable. Custom Affinity.

            This field is a member of `oneof`_ ``criterion``.
        custom_audience (google.ads.googleads.v13.common.types.CustomAudienceInfo):
            Immutable. Custom Audience

            This field is a member of `oneof`_ ``criterion``.
        combined_audience (google.ads.googleads.v13.common.types.CombinedAudienceInfo):
            Immutable. Combined Audience.

            This field is a member of `oneof`_ ``criterion``.
        keyword_theme (google.ads.googleads.v13.common.types.KeywordThemeInfo):
            Immutable. Smart Campaign Keyword Theme.

            This field is a member of `oneof`_ ``criterion``.
        local_service_id (google.ads.googleads.v13.common.types.LocalServiceIdInfo):
            Immutable. GLS service campaign criterion.

            This field is a member of `oneof`_ ``criterion``.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    campaign: str = proto.Field(
        proto.STRING, number=37, optional=True,
    )
    criterion_id: int = proto.Field(
        proto.INT64, number=38, optional=True,
    )
    display_name: str = proto.Field(
        proto.STRING, number=43,
    )
    bid_modifier: float = proto.Field(
        proto.FLOAT, number=39, optional=True,
    )
    negative: bool = proto.Field(
        proto.BOOL, number=40, optional=True,
    )
    type_: criterion_type.CriterionTypeEnum.CriterionType = proto.Field(
        proto.ENUM,
        number=6,
        enum=criterion_type.CriterionTypeEnum.CriterionType,
    )
    status: campaign_criterion_status.CampaignCriterionStatusEnum.CampaignCriterionStatus = proto.Field(
        proto.ENUM,
        number=35,
        enum=campaign_criterion_status.CampaignCriterionStatusEnum.CampaignCriterionStatus,
    )
    keyword: criteria.KeywordInfo = proto.Field(
        proto.MESSAGE,
        number=8,
        oneof="criterion",
        message=criteria.KeywordInfo,
    )
    placement: criteria.PlacementInfo = proto.Field(
        proto.MESSAGE,
        number=9,
        oneof="criterion",
        message=criteria.PlacementInfo,
    )
    mobile_app_category: criteria.MobileAppCategoryInfo = proto.Field(
        proto.MESSAGE,
        number=10,
        oneof="criterion",
        message=criteria.MobileAppCategoryInfo,
    )
    mobile_application: criteria.MobileApplicationInfo = proto.Field(
        proto.MESSAGE,
        number=11,
        oneof="criterion",
        message=criteria.MobileApplicationInfo,
    )
    location: criteria.LocationInfo = proto.Field(
        proto.MESSAGE,
        number=12,
        oneof="criterion",
        message=criteria.LocationInfo,
    )
    device: criteria.DeviceInfo = proto.Field(
        proto.MESSAGE,
        number=13,
        oneof="criterion",
        message=criteria.DeviceInfo,
    )
    ad_schedule: criteria.AdScheduleInfo = proto.Field(
        proto.MESSAGE,
        number=15,
        oneof="criterion",
        message=criteria.AdScheduleInfo,
    )
    age_range: criteria.AgeRangeInfo = proto.Field(
        proto.MESSAGE,
        number=16,
        oneof="criterion",
        message=criteria.AgeRangeInfo,
    )
    gender: criteria.GenderInfo = proto.Field(
        proto.MESSAGE,
        number=17,
        oneof="criterion",
        message=criteria.GenderInfo,
    )
    income_range: criteria.IncomeRangeInfo = proto.Field(
        proto.MESSAGE,
        number=18,
        oneof="criterion",
        message=criteria.IncomeRangeInfo,
    )
    parental_status: criteria.ParentalStatusInfo = proto.Field(
        proto.MESSAGE,
        number=19,
        oneof="criterion",
        message=criteria.ParentalStatusInfo,
    )
    user_list: criteria.UserListInfo = proto.Field(
        proto.MESSAGE,
        number=22,
        oneof="criterion",
        message=criteria.UserListInfo,
    )
    youtube_video: criteria.YouTubeVideoInfo = proto.Field(
        proto.MESSAGE,
        number=20,
        oneof="criterion",
        message=criteria.YouTubeVideoInfo,
    )
    youtube_channel: criteria.YouTubeChannelInfo = proto.Field(
        proto.MESSAGE,
        number=21,
        oneof="criterion",
        message=criteria.YouTubeChannelInfo,
    )
    proximity: criteria.ProximityInfo = proto.Field(
        proto.MESSAGE,
        number=23,
        oneof="criterion",
        message=criteria.ProximityInfo,
    )
    topic: criteria.TopicInfo = proto.Field(
        proto.MESSAGE, number=24, oneof="criterion", message=criteria.TopicInfo,
    )
    listing_scope: criteria.ListingScopeInfo = proto.Field(
        proto.MESSAGE,
        number=25,
        oneof="criterion",
        message=criteria.ListingScopeInfo,
    )
    language: criteria.LanguageInfo = proto.Field(
        proto.MESSAGE,
        number=26,
        oneof="criterion",
        message=criteria.LanguageInfo,
    )
    ip_block: criteria.IpBlockInfo = proto.Field(
        proto.MESSAGE,
        number=27,
        oneof="criterion",
        message=criteria.IpBlockInfo,
    )
    content_label: criteria.ContentLabelInfo = proto.Field(
        proto.MESSAGE,
        number=28,
        oneof="criterion",
        message=criteria.ContentLabelInfo,
    )
    carrier: criteria.CarrierInfo = proto.Field(
        proto.MESSAGE,
        number=29,
        oneof="criterion",
        message=criteria.CarrierInfo,
    )
    user_interest: criteria.UserInterestInfo = proto.Field(
        proto.MESSAGE,
        number=30,
        oneof="criterion",
        message=criteria.UserInterestInfo,
    )
    webpage: criteria.WebpageInfo = proto.Field(
        proto.MESSAGE,
        number=31,
        oneof="criterion",
        message=criteria.WebpageInfo,
    )
    operating_system_version: criteria.OperatingSystemVersionInfo = proto.Field(
        proto.MESSAGE,
        number=32,
        oneof="criterion",
        message=criteria.OperatingSystemVersionInfo,
    )
    mobile_device: criteria.MobileDeviceInfo = proto.Field(
        proto.MESSAGE,
        number=33,
        oneof="criterion",
        message=criteria.MobileDeviceInfo,
    )
    location_group: criteria.LocationGroupInfo = proto.Field(
        proto.MESSAGE,
        number=34,
        oneof="criterion",
        message=criteria.LocationGroupInfo,
    )
    custom_affinity: criteria.CustomAffinityInfo = proto.Field(
        proto.MESSAGE,
        number=36,
        oneof="criterion",
        message=criteria.CustomAffinityInfo,
    )
    custom_audience: criteria.CustomAudienceInfo = proto.Field(
        proto.MESSAGE,
        number=41,
        oneof="criterion",
        message=criteria.CustomAudienceInfo,
    )
    combined_audience: criteria.CombinedAudienceInfo = proto.Field(
        proto.MESSAGE,
        number=42,
        oneof="criterion",
        message=criteria.CombinedAudienceInfo,
    )
    keyword_theme: criteria.KeywordThemeInfo = proto.Field(
        proto.MESSAGE,
        number=45,
        oneof="criterion",
        message=criteria.KeywordThemeInfo,
    )
    local_service_id: criteria.LocalServiceIdInfo = proto.Field(
        proto.MESSAGE,
        number=46,
        oneof="criterion",
        message=criteria.LocalServiceIdInfo,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
