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
    package="google.ads.googleads.v11.enums",
    marshal="google.ads.googleads.v11",
    manifest={"ReachPlanAdLengthEnum",},
)


class ReachPlanAdLengthEnum(proto.Message):
    r"""Message describing length of a plannable video ad.
    """

    class ReachPlanAdLength(proto.Enum):
        r"""Possible ad length values."""
        UNSPECIFIED = 0
        UNKNOWN = 1
        SIX_SECONDS = 2
        FIFTEEN_OR_TWENTY_SECONDS = 3
        TWENTY_SECONDS_OR_MORE = 4


__all__ = tuple(sorted(__protobuf__.manifest))
