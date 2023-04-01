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

from google.ads.googleads.v13.common.types import policy
from google.ads.googleads.v13.enums.types import asset_link_primary_status
from google.ads.googleads.v13.enums.types import (
    asset_link_primary_status_reason,
)
from google.ads.googleads.v13.enums.types import (
    asset_offline_evaluation_error_reasons,
)
from google.ads.googleads.v13.enums.types import policy_approval_status
from google.ads.googleads.v13.enums.types import policy_review_status


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.common",
    marshal="google.ads.googleads.v13",
    manifest={
        "AdAssetPolicySummary",
        "AssetLinkPrimaryStatusDetails",
        "AssetDisapproved",
    },
)


class AdAssetPolicySummary(proto.Message):
    r"""Contains policy information for an asset inside an ad.
    Attributes:
        policy_topic_entries (MutableSequence[google.ads.googleads.v13.common.types.PolicyTopicEntry]):
            The list of policy findings for this asset.
        review_status (google.ads.googleads.v13.enums.types.PolicyReviewStatusEnum.PolicyReviewStatus):
            Where in the review process this asset.
        approval_status (google.ads.googleads.v13.enums.types.PolicyApprovalStatusEnum.PolicyApprovalStatus):
            The overall approval status of this asset,
            which is calculated based on the status of its
            individual policy topic entries.
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


class AssetLinkPrimaryStatusDetails(proto.Message):
    r"""Provides the detail of a PrimaryStatus. Each asset link has a
    PrimaryStatus value (e.g. NOT_ELIGIBLE, meaning not serving), and
    list of corroborating PrimaryStatusReasons (e.g.
    [ASSET_DISAPPROVED]). Each reason may have some additional details
    annotated with it. For instance, when the reason is
    ASSET_DISAPPROVED, the details field will contain additional
    information about the offline evaluation errors which led to the
    asset being disapproved. Next Id: 4

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        reason (google.ads.googleads.v13.enums.types.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason):
            Provides the reason of this PrimaryStatus.

            This field is a member of `oneof`_ ``_reason``.
        status (google.ads.googleads.v13.enums.types.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus):
            Provides the PrimaryStatus of this status
            detail.

            This field is a member of `oneof`_ ``_status``.
        asset_disapproved (google.ads.googleads.v13.common.types.AssetDisapproved):
            Provides the details for
            AssetLinkPrimaryStatusReason.ASSET_DISAPPROVED

            This field is a member of `oneof`_ ``details``.
    """

    reason: asset_link_primary_status_reason.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason = proto.Field(
        proto.ENUM,
        number=1,
        optional=True,
        enum=asset_link_primary_status_reason.AssetLinkPrimaryStatusReasonEnum.AssetLinkPrimaryStatusReason,
    )
    status: asset_link_primary_status.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus = proto.Field(
        proto.ENUM,
        number=2,
        optional=True,
        enum=asset_link_primary_status.AssetLinkPrimaryStatusEnum.AssetLinkPrimaryStatus,
    )
    asset_disapproved: "AssetDisapproved" = proto.Field(
        proto.MESSAGE, number=3, oneof="details", message="AssetDisapproved",
    )


class AssetDisapproved(proto.Message):
    r"""Details related to AssetLinkPrimaryStatusReasonPB.ASSET_DISAPPROVED
    Next Id: 2

    Attributes:
        offline_evaluation_error_reasons (MutableSequence[google.ads.googleads.v13.enums.types.AssetOfflineEvaluationErrorReasonsEnum.AssetOfflineEvaluationErrorReasons]):
            Provides the quality evaluation disapproval
            reason of an asset.
    """

    offline_evaluation_error_reasons: MutableSequence[
        asset_offline_evaluation_error_reasons.AssetOfflineEvaluationErrorReasonsEnum.AssetOfflineEvaluationErrorReasons
    ] = proto.RepeatedField(
        proto.ENUM,
        number=1,
        enum=asset_offline_evaluation_error_reasons.AssetOfflineEvaluationErrorReasonsEnum.AssetOfflineEvaluationErrorReasons,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
