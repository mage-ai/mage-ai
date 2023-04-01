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
    manifest={"SmartCampaignStatusEnum",},
)


class SmartCampaignStatusEnum(proto.Message):
    r"""A container for an enum that describes Smart campaign
    statuses.

    """

    class SmartCampaignStatus(proto.Enum):
        r"""Smart campaign statuses."""
        UNSPECIFIED = 0
        UNKNOWN = 1
        PAUSED = 2
        NOT_ELIGIBLE = 3
        PENDING = 4
        ELIGIBLE = 5
        REMOVED = 6
        ENDED = 7


__all__ = tuple(sorted(__protobuf__.manifest))
