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


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.enums",
    marshal="google.ads.googleads.v13",
    manifest={"AssetLinkPrimaryStatusReasonEnum",},
)


class AssetLinkPrimaryStatusReasonEnum(proto.Message):
    r"""Provides the reason of a primary status.
    For example: a sitelink may be paused for a particular campaign.

    """

    class AssetLinkPrimaryStatusReason(proto.Enum):
        r"""Enum Provides insight into why an asset is not serving or not
        serving at full capacity for a particular link level. These
        reasons are aggregated to determine a final PrimaryStatus.
        For example, a sitelink might be paused by the user, but also
        limited in serving due to violation of an alcohol policy. In
        this case, the PrimaryStatus will be returned as PAUSED, since
        the asset's effective status is determined by its paused state.
        """
        UNSPECIFIED = 0
        UNKNOWN = 1
        ASSET_LINK_PAUSED = 2
        ASSET_LINK_REMOVED = 3
        ASSET_DISAPPROVED = 4
        ASSET_UNDER_REVIEW = 5
        ASSET_APPROVED_LABELED = 6


__all__ = tuple(sorted(__protobuf__.manifest))
