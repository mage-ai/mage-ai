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
    response_content_type as gage_response_content_type,
)
from google.ads.googleads.v13.enums.types import (
    smart_campaign_not_eligible_reason,
)
from google.ads.googleads.v13.enums.types import (
    smart_campaign_status as gage_smart_campaign_status,
)
from google.ads.googleads.v13.resources.types import (
    smart_campaign_setting as gagr_smart_campaign_setting,
)
from google.protobuf import field_mask_pb2  # type: ignore
from google.rpc import status_pb2  # type: ignore


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.services",
    marshal="google.ads.googleads.v13",
    manifest={
        "GetSmartCampaignStatusRequest",
        "SmartCampaignNotEligibleDetails",
        "SmartCampaignEligibleDetails",
        "SmartCampaignPausedDetails",
        "SmartCampaignRemovedDetails",
        "SmartCampaignEndedDetails",
        "GetSmartCampaignStatusResponse",
        "MutateSmartCampaignSettingsRequest",
        "SmartCampaignSettingOperation",
        "MutateSmartCampaignSettingsResponse",
        "MutateSmartCampaignSettingResult",
    },
)


class GetSmartCampaignStatusRequest(proto.Message):
    r"""Request message for
    [SmartCampaignSettingService.GetSmartCampaignStatus][google.ads.googleads.v13.services.SmartCampaignSettingService.GetSmartCampaignStatus].

    Attributes:
        resource_name (str):
            Required. The resource name of the Smart
            campaign setting belonging to the Smart campaign
            to fetch the status of.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )


class SmartCampaignNotEligibleDetails(proto.Message):
    r"""Details related to Smart campaigns that are not eligible to
    serve.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        not_eligible_reason (google.ads.googleads.v13.enums.types.SmartCampaignNotEligibleReasonEnum.SmartCampaignNotEligibleReason):
            The reason why the Smart campaign is not
            eligible to serve.

            This field is a member of `oneof`_ ``_not_eligible_reason``.
    """

    not_eligible_reason: smart_campaign_not_eligible_reason.SmartCampaignNotEligibleReasonEnum.SmartCampaignNotEligibleReason = proto.Field(
        proto.ENUM,
        number=1,
        optional=True,
        enum=smart_campaign_not_eligible_reason.SmartCampaignNotEligibleReasonEnum.SmartCampaignNotEligibleReason,
    )


class SmartCampaignEligibleDetails(proto.Message):
    r"""Details related to Smart campaigns that are eligible to
    serve.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        last_impression_date_time (str):
            The timestamp of the last impression observed
            in the last 8 hours for this campaign.
            The timestamp is in the customer’s timezone and
            in “yyyy-MM-dd HH:mm:ss” format.

            This field is a member of `oneof`_ ``_last_impression_date_time``.
        end_date_time (str):
            The timestamp of when the campaign will end,
            if applicable. The timestamp is in the
            customer’s timezone and in “yyyy-MM-dd HH:mm:ss”
            format.

            This field is a member of `oneof`_ ``_end_date_time``.
    """

    last_impression_date_time: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )
    end_date_time: str = proto.Field(
        proto.STRING, number=2, optional=True,
    )


class SmartCampaignPausedDetails(proto.Message):
    r"""Details related to paused Smart campaigns.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        paused_date_time (str):
            The timestamp of when the campaign was last
            paused. The timestamp is in the customer’s
            timezone and in “yyyy-MM-dd HH:mm:ss” format.

            This field is a member of `oneof`_ ``_paused_date_time``.
    """

    paused_date_time: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class SmartCampaignRemovedDetails(proto.Message):
    r"""Details related to removed Smart campaigns.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        removed_date_time (str):
            The timestamp of when the campaign was
            removed. The timestamp is in the customer’s
            timezone and in “yyyy-MM-dd HH:mm:ss” format.

            This field is a member of `oneof`_ ``_removed_date_time``.
    """

    removed_date_time: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class SmartCampaignEndedDetails(proto.Message):
    r"""Details related to Smart campaigns that have ended.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        end_date_time (str):
            The timestamp of when the campaign ended.
            The timestamp is in the customer’s timezone and
            in “yyyy-MM-dd HH:mm:ss” format.

            This field is a member of `oneof`_ ``_end_date_time``.
    """

    end_date_time: str = proto.Field(
        proto.STRING, number=1, optional=True,
    )


class GetSmartCampaignStatusResponse(proto.Message):
    r"""Response message for
    [SmartCampaignSettingService.GetSmartCampaignStatus][google.ads.googleads.v13.services.SmartCampaignSettingService.GetSmartCampaignStatus].

    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        smart_campaign_status (google.ads.googleads.v13.enums.types.SmartCampaignStatusEnum.SmartCampaignStatus):
            The status of this Smart campaign.
        not_eligible_details (google.ads.googleads.v13.services.types.SmartCampaignNotEligibleDetails):
            Details related to Smart campaigns that are
            ineligible to serve.

            This field is a member of `oneof`_ ``smart_campaign_status_details``.
        eligible_details (google.ads.googleads.v13.services.types.SmartCampaignEligibleDetails):
            Details related to Smart campaigns that are
            eligible to serve.

            This field is a member of `oneof`_ ``smart_campaign_status_details``.
        paused_details (google.ads.googleads.v13.services.types.SmartCampaignPausedDetails):
            Details relaed to paused Smart campaigns.

            This field is a member of `oneof`_ ``smart_campaign_status_details``.
        removed_details (google.ads.googleads.v13.services.types.SmartCampaignRemovedDetails):
            Details related to removed Smart campaigns.

            This field is a member of `oneof`_ ``smart_campaign_status_details``.
        ended_details (google.ads.googleads.v13.services.types.SmartCampaignEndedDetails):
            Details related to Smart campaigns that have
            ended.

            This field is a member of `oneof`_ ``smart_campaign_status_details``.
    """

    smart_campaign_status: gage_smart_campaign_status.SmartCampaignStatusEnum.SmartCampaignStatus = proto.Field(
        proto.ENUM,
        number=1,
        enum=gage_smart_campaign_status.SmartCampaignStatusEnum.SmartCampaignStatus,
    )
    not_eligible_details: "SmartCampaignNotEligibleDetails" = proto.Field(
        proto.MESSAGE,
        number=2,
        oneof="smart_campaign_status_details",
        message="SmartCampaignNotEligibleDetails",
    )
    eligible_details: "SmartCampaignEligibleDetails" = proto.Field(
        proto.MESSAGE,
        number=3,
        oneof="smart_campaign_status_details",
        message="SmartCampaignEligibleDetails",
    )
    paused_details: "SmartCampaignPausedDetails" = proto.Field(
        proto.MESSAGE,
        number=4,
        oneof="smart_campaign_status_details",
        message="SmartCampaignPausedDetails",
    )
    removed_details: "SmartCampaignRemovedDetails" = proto.Field(
        proto.MESSAGE,
        number=5,
        oneof="smart_campaign_status_details",
        message="SmartCampaignRemovedDetails",
    )
    ended_details: "SmartCampaignEndedDetails" = proto.Field(
        proto.MESSAGE,
        number=6,
        oneof="smart_campaign_status_details",
        message="SmartCampaignEndedDetails",
    )


class MutateSmartCampaignSettingsRequest(proto.Message):
    r"""Request message for
    [SmartCampaignSettingService.MutateSmartCampaignSetting][].

    Attributes:
        customer_id (str):
            Required. The ID of the customer whose Smart
            campaign settings are being modified.
        operations (MutableSequence[google.ads.googleads.v13.services.types.SmartCampaignSettingOperation]):
            Required. The list of operations to perform
            on individual Smart campaign settings.
        partial_failure (bool):
            If true, successful operations will be
            carried out and invalid operations will return
            errors. If false, all operations will be carried
            out in one transaction if and only if they are
            all valid. Default is false.
        validate_only (bool):
            If true, the request is validated but not
            executed. Only errors are returned, not results.
        response_content_type (google.ads.googleads.v13.enums.types.ResponseContentTypeEnum.ResponseContentType):
            The response content type setting. Determines
            whether the mutable resource or just the
            resource name should be returned post mutation.
    """

    customer_id: str = proto.Field(
        proto.STRING, number=1,
    )
    operations: MutableSequence[
        "SmartCampaignSettingOperation"
    ] = proto.RepeatedField(
        proto.MESSAGE, number=2, message="SmartCampaignSettingOperation",
    )
    partial_failure: bool = proto.Field(
        proto.BOOL, number=3,
    )
    validate_only: bool = proto.Field(
        proto.BOOL, number=4,
    )
    response_content_type: gage_response_content_type.ResponseContentTypeEnum.ResponseContentType = proto.Field(
        proto.ENUM,
        number=5,
        enum=gage_response_content_type.ResponseContentTypeEnum.ResponseContentType,
    )


class SmartCampaignSettingOperation(proto.Message):
    r"""A single operation to update Smart campaign settings for a
    campaign.

    Attributes:
        update (google.ads.googleads.v13.resources.types.SmartCampaignSetting):
            Update operation: The Smart campaign setting
            must specify a valid resource name.
        update_mask (google.protobuf.field_mask_pb2.FieldMask):
            FieldMask that determines which resource
            fields are modified in an update.
    """

    update: gagr_smart_campaign_setting.SmartCampaignSetting = proto.Field(
        proto.MESSAGE,
        number=1,
        message=gagr_smart_campaign_setting.SmartCampaignSetting,
    )
    update_mask: field_mask_pb2.FieldMask = proto.Field(
        proto.MESSAGE, number=2, message=field_mask_pb2.FieldMask,
    )


class MutateSmartCampaignSettingsResponse(proto.Message):
    r"""Response message for campaign mutate.
    Attributes:
        partial_failure_error (google.rpc.status_pb2.Status):
            Errors that pertain to operation failures in the partial
            failure mode. Returned only when partial_failure = true and
            all errors occur inside the operations. If any errors occur
            outside the operations (for example, auth errors), we return
            an RPC level error.
        results (MutableSequence[google.ads.googleads.v13.services.types.MutateSmartCampaignSettingResult]):
            All results for the mutate.
    """

    partial_failure_error: status_pb2.Status = proto.Field(
        proto.MESSAGE, number=1, message=status_pb2.Status,
    )
    results: MutableSequence[
        "MutateSmartCampaignSettingResult"
    ] = proto.RepeatedField(
        proto.MESSAGE, number=2, message="MutateSmartCampaignSettingResult",
    )


class MutateSmartCampaignSettingResult(proto.Message):
    r"""The result for the Smart campaign setting mutate.
    Attributes:
        resource_name (str):
            Returned for successful operations.
        smart_campaign_setting (google.ads.googleads.v13.resources.types.SmartCampaignSetting):
            The mutated Smart campaign setting with only mutable fields
            after mutate. The field will only be returned when
            response_content_type is set to "MUTABLE_RESOURCE".
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    smart_campaign_setting: gagr_smart_campaign_setting.SmartCampaignSetting = proto.Field(
        proto.MESSAGE,
        number=2,
        message=gagr_smart_campaign_setting.SmartCampaignSetting,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
