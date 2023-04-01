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

from google.ads.googleads.v13.enums.types import keyword_match_type


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"KeywordPlanCampaignKeyword",},
)


class KeywordPlanCampaignKeyword(proto.Message):
    r"""A Keyword Plan Campaign keyword.
    Only negative keywords are supported for Campaign Keyword.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Immutable. The resource name of the Keyword Plan Campaign
            keyword. KeywordPlanCampaignKeyword resource names have the
            form:

            ``customers/{customer_id}/keywordPlanCampaignKeywords/{kp_campaign_keyword_id}``
        keyword_plan_campaign (str):
            The Keyword Plan campaign to which this
            negative keyword belongs.

            This field is a member of `oneof`_ ``_keyword_plan_campaign``.
        id (int):
            Output only. The ID of the Keyword Plan
            negative keyword.

            This field is a member of `oneof`_ ``_id``.
        text (str):
            The keyword text.

            This field is a member of `oneof`_ ``_text``.
        match_type (google.ads.googleads.v13.enums.types.KeywordMatchTypeEnum.KeywordMatchType):
            The keyword match type.
        negative (bool):
            Immutable. If true, the keyword is negative.
            Must be set to true. Only negative campaign
            keywords are supported.

            This field is a member of `oneof`_ ``_negative``.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    keyword_plan_campaign: str = proto.Field(
        proto.STRING, number=8, optional=True,
    )
    id: int = proto.Field(
        proto.INT64, number=9, optional=True,
    )
    text: str = proto.Field(
        proto.STRING, number=10, optional=True,
    )
    match_type: keyword_match_type.KeywordMatchTypeEnum.KeywordMatchType = proto.Field(
        proto.ENUM,
        number=5,
        enum=keyword_match_type.KeywordMatchTypeEnum.KeywordMatchType,
    )
    negative: bool = proto.Field(
        proto.BOOL, number=11, optional=True,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
