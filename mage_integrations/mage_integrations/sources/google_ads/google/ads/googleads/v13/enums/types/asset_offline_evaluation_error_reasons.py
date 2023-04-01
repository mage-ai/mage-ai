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
    manifest={"AssetOfflineEvaluationErrorReasonsEnum",},
)


class AssetOfflineEvaluationErrorReasonsEnum(proto.Message):
    r"""Provides the quality evaluation disapproval reason of an
    asset.

    """

    class AssetOfflineEvaluationErrorReasons(proto.Enum):
        r"""Enum describing the quality evaluation disapproval reason of
        an asset.
        """
        UNSPECIFIED = 0
        UNKNOWN = 1
        PRICE_ASSET_DESCRIPTION_REPEATS_ROW_HEADER = 2
        PRICE_ASSET_REPETITIVE_HEADERS = 3
        PRICE_ASSET_HEADER_INCOMPATIBLE_WITH_PRICE_TYPE = 4
        PRICE_ASSET_DESCRIPTION_INCOMPATIBLE_WITH_ITEM_HEADER = 5
        PRICE_ASSET_DESCRIPTION_HAS_PRICE_QUALIFIER = 6
        PRICE_ASSET_UNSUPPORTED_LANGUAGE = 7
        PRICE_ASSET_OTHER_ERROR = 8


__all__ = tuple(sorted(__protobuf__.manifest))
