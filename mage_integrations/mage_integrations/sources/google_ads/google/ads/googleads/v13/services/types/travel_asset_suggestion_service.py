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

from google.ads.googleads.v13.enums.types import (
    asset_field_type as gage_asset_field_type,
)
from google.ads.googleads.v13.enums.types import call_to_action_type
from google.ads.googleads.v13.enums.types import hotel_asset_suggestion_status


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.services",
    marshal="google.ads.googleads.v13",
    manifest={
        "SuggestTravelAssetsRequest",
        "SuggestTravelAssetsResponse",
        "HotelAssetSuggestion",
        "HotelTextAsset",
        "HotelImageAsset",
    },
)


class SuggestTravelAssetsRequest(proto.Message):
    r"""Request message for
    [TravelSuggestAssetsService.SuggestTravelAssets][].

    Attributes:
        customer_id (str):
            Required. The ID of the customer.
        language_option (str):
            Required. The language specifications in BCP
            47 format (for example, en-US, zh-CN, etc.) for
            the asset suggestions. Text will be in this
            language. Usually matches one of the campaign
            target languages.
        place_id (MutableSequence[str]):
            The Google Maps Place IDs of hotels for which
            assets are requested. See
            https://developers.google.com/places/web-service/place-id
            for more information.
    """

    customer_id: str = proto.Field(
        proto.STRING, number=1,
    )
    language_option: str = proto.Field(
        proto.STRING, number=2,
    )
    place_id: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=3,
    )


class SuggestTravelAssetsResponse(proto.Message):
    r"""Response message for
    [TravelSuggestAssetsService.SuggestTravelAssets][].

    Attributes:
        hotel_asset_suggestions (MutableSequence[google.ads.googleads.v13.services.types.HotelAssetSuggestion]):
            Asset suggestions for each place ID submitted
            in the request.
    """

    hotel_asset_suggestions: MutableSequence[
        "HotelAssetSuggestion"
    ] = proto.RepeatedField(
        proto.MESSAGE, number=1, message="HotelAssetSuggestion",
    )


class HotelAssetSuggestion(proto.Message):
    r"""Message containing the asset suggestions for a hotel.
    Attributes:
        place_id (str):
            Google Places ID of the hotel.
        final_url (str):
            Suggested final URL for an AssetGroup.
        hotel_name (str):
            Hotel name in requested language.
        call_to_action (google.ads.googleads.v13.enums.types.CallToActionTypeEnum.CallToActionType):
            Call to action type.
        text_assets (MutableSequence[google.ads.googleads.v13.services.types.HotelTextAsset]):
            Text assets such as headline, description,
            etc.
        image_assets (MutableSequence[google.ads.googleads.v13.services.types.HotelImageAsset]):
            Image assets such as
            landscape/portrait/square, etc.
        status (google.ads.googleads.v13.enums.types.HotelAssetSuggestionStatusEnum.HotelAssetSuggestionStatus):
            The status of the hotel asset suggestion.
    """

    place_id: str = proto.Field(
        proto.STRING, number=1,
    )
    final_url: str = proto.Field(
        proto.STRING, number=2,
    )
    hotel_name: str = proto.Field(
        proto.STRING, number=3,
    )
    call_to_action: call_to_action_type.CallToActionTypeEnum.CallToActionType = proto.Field(
        proto.ENUM,
        number=4,
        enum=call_to_action_type.CallToActionTypeEnum.CallToActionType,
    )
    text_assets: MutableSequence["HotelTextAsset"] = proto.RepeatedField(
        proto.MESSAGE, number=5, message="HotelTextAsset",
    )
    image_assets: MutableSequence["HotelImageAsset"] = proto.RepeatedField(
        proto.MESSAGE, number=6, message="HotelImageAsset",
    )
    status: hotel_asset_suggestion_status.HotelAssetSuggestionStatusEnum.HotelAssetSuggestionStatus = proto.Field(
        proto.ENUM,
        number=7,
        enum=hotel_asset_suggestion_status.HotelAssetSuggestionStatusEnum.HotelAssetSuggestionStatus,
    )


class HotelTextAsset(proto.Message):
    r"""A single text asset suggestion for a hotel.
    Attributes:
        text (str):
            Asset text in requested language.
        asset_field_type (google.ads.googleads.v13.enums.types.AssetFieldTypeEnum.AssetFieldType):
            The text asset type. For example, HEADLINE,
            DESCRIPTION, etc.
    """

    text: str = proto.Field(
        proto.STRING, number=1,
    )
    asset_field_type: gage_asset_field_type.AssetFieldTypeEnum.AssetFieldType = proto.Field(
        proto.ENUM,
        number=2,
        enum=gage_asset_field_type.AssetFieldTypeEnum.AssetFieldType,
    )


class HotelImageAsset(proto.Message):
    r"""A single image asset suggestion for a hotel.
    Attributes:
        uri (str):
            URI for the image.
        asset_field_type (google.ads.googleads.v13.enums.types.AssetFieldTypeEnum.AssetFieldType):
            The Image asset type. For example, MARKETING_IMAGE,
            PORTRAIT_MARKETING_IMAGE, etc.
    """

    uri: str = proto.Field(
        proto.STRING, number=1,
    )
    asset_field_type: gage_asset_field_type.AssetFieldTypeEnum.AssetFieldType = proto.Field(
        proto.ENUM,
        number=2,
        enum=gage_asset_field_type.AssetFieldTypeEnum.AssetFieldType,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
