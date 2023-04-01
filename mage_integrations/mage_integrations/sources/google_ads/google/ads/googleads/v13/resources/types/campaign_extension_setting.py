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

from google.ads.googleads.v13.enums.types import extension_setting_device
from google.ads.googleads.v13.enums.types import (
    extension_type as gage_extension_type,
)


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"CampaignExtensionSetting",},
)


class CampaignExtensionSetting(proto.Message):
    r"""A campaign extension setting.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Immutable. The resource name of the campaign extension
            setting. CampaignExtensionSetting resource names have the
            form:

            ``customers/{customer_id}/campaignExtensionSettings/{campaign_id}~{extension_type}``
        extension_type (google.ads.googleads.v13.enums.types.ExtensionTypeEnum.ExtensionType):
            Immutable. The extension type of the customer
            extension setting.
        campaign (str):
            Immutable. The resource name of the campaign. The linked
            extension feed items will serve under this campaign.
            Campaign resource names have the form:

            ``customers/{customer_id}/campaigns/{campaign_id}``

            This field is a member of `oneof`_ ``_campaign``.
        extension_feed_items (MutableSequence[str]):
            The resource names of the extension feed items to serve
            under the campaign. ExtensionFeedItem resource names have
            the form:

            ``customers/{customer_id}/extensionFeedItems/{feed_item_id}``
        device (google.ads.googleads.v13.enums.types.ExtensionSettingDeviceEnum.ExtensionSettingDevice):
            The device for which the extensions will
            serve. Optional.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    extension_type: gage_extension_type.ExtensionTypeEnum.ExtensionType = proto.Field(
        proto.ENUM,
        number=2,
        enum=gage_extension_type.ExtensionTypeEnum.ExtensionType,
    )
    campaign: str = proto.Field(
        proto.STRING, number=6, optional=True,
    )
    extension_feed_items: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=7,
    )
    device: extension_setting_device.ExtensionSettingDeviceEnum.ExtensionSettingDevice = proto.Field(
        proto.ENUM,
        number=5,
        enum=extension_setting_device.ExtensionSettingDeviceEnum.ExtensionSettingDevice,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
