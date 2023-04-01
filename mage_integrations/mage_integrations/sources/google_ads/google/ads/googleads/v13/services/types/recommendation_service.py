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

from google.ads.googleads.v13.common.types import extensions
from google.ads.googleads.v13.enums.types import keyword_match_type
from google.ads.googleads.v13.resources.types import ad as gagr_ad
from google.ads.googleads.v13.resources.types import asset
from google.rpc import status_pb2  # type: ignore


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.services",
    marshal="google.ads.googleads.v13",
    manifest={
        "ApplyRecommendationRequest",
        "ApplyRecommendationOperation",
        "ApplyRecommendationResponse",
        "ApplyRecommendationResult",
        "DismissRecommendationRequest",
        "DismissRecommendationResponse",
    },
)


class ApplyRecommendationRequest(proto.Message):
    r"""Request message for
    [RecommendationService.ApplyRecommendation][google.ads.googleads.v13.services.RecommendationService.ApplyRecommendation].

    Attributes:
        customer_id (str):
            Required. The ID of the customer with the
            recommendation.
        operations (MutableSequence[google.ads.googleads.v13.services.types.ApplyRecommendationOperation]):
            Required. The list of operations to apply recommendations.
            If partial_failure=false all recommendations should be of
            the same type There is a limit of 100 operations per
            request.
        partial_failure (bool):
            If true, successful operations will be
            carried out and invalid operations will return
            errors. If false, operations will be carried out
            as a transaction if and only if they are all
            valid. Default is false.
    """

    customer_id: str = proto.Field(
        proto.STRING, number=1,
    )
    operations: MutableSequence[
        "ApplyRecommendationOperation"
    ] = proto.RepeatedField(
        proto.MESSAGE, number=2, message="ApplyRecommendationOperation",
    )
    partial_failure: bool = proto.Field(
        proto.BOOL, number=3,
    )


class ApplyRecommendationOperation(proto.Message):
    r"""Information about the operation to apply a recommendation and
    any parameters to customize it.

    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            The resource name of the recommendation to
            apply.
        campaign_budget (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.CampaignBudgetParameters):
            Optional parameters to use when applying a
            campaign budget recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        text_ad (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.TextAdParameters):
            Optional parameters to use when applying a
            text ad recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        keyword (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.KeywordParameters):
            Optional parameters to use when applying
            keyword recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        target_cpa_opt_in (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.TargetCpaOptInParameters):
            Optional parameters to use when applying
            target CPA opt-in recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        target_roas_opt_in (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.TargetRoasOptInParameters):
            Optional parameters to use when applying
            target ROAS opt-in recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        callout_extension (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.CalloutExtensionParameters):
            Parameters to use when applying callout
            extension recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        call_extension (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.CallExtensionParameters):
            Parameters to use when applying call
            extension recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        sitelink_extension (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.SitelinkExtensionParameters):
            Parameters to use when applying sitelink
            extension recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        move_unused_budget (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.MoveUnusedBudgetParameters):
            Parameters to use when applying move unused
            budget recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        responsive_search_ad (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.ResponsiveSearchAdParameters):
            Parameters to use when applying a responsive
            search ad recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        use_broad_match_keyword (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.UseBroadMatchKeywordParameters):
            Parameters to use when applying a use broad
            match keyword recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        responsive_search_ad_asset (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.ResponsiveSearchAdAssetParameters):
            Parameters to use when applying a responsive
            search ad asset recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        responsive_search_ad_improve_ad_strength (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.ResponsiveSearchAdImproveAdStrengthParameters):
            Parameters to use when applying a responsive
            search ad improve ad strength recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        raise_target_cpa_bid_too_low (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.RaiseTargetCpaBidTooLowParameters):
            Parameters to use when applying a raise
            target CPA bid too low recommendation. The apply
            is asynchronous and can take minutes depending
            on the number of ad groups there is in the
            related campaign.

            This field is a member of `oneof`_ ``apply_parameters``.
        forecasting_set_target_roas (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.ForecastingSetTargetRoasParameters):
            Parameters to use when applying a forecasting
            set target ROAS recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        callout_asset (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.CalloutAssetParameters):
            Parameters to use when applying callout asset
            recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        call_asset (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.CallAssetParameters):
            Parameters to use when applying call asset
            recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
        sitelink_asset (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.SitelinkAssetParameters):
            Parameters to use when applying sitelink
            asset recommendation.

            This field is a member of `oneof`_ ``apply_parameters``.
    """

    class CampaignBudgetParameters(proto.Message):
        r"""Parameters to use when applying a campaign budget
        recommendation.

        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            new_budget_amount_micros (int):
                New budget amount to set for target budget
                resource. This is a required field.

                This field is a member of `oneof`_ ``_new_budget_amount_micros``.
        """

        new_budget_amount_micros: int = proto.Field(
            proto.INT64, number=2, optional=True,
        )

    class ForecastingSetTargetRoasParameters(proto.Message):
        r"""Parameters to use when applying a forecasting set target roas
        recommendation.

        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            target_roas (float):
                New target ROAS (revenue per unit of spend)
                to set for a campaign resource.
                The value is between 0.01 and 1000.0, inclusive.

                This field is a member of `oneof`_ ``_target_roas``.
            campaign_budget_amount_micros (int):
                New campaign budget amount to set for a
                campaign resource.

                This field is a member of `oneof`_ ``_campaign_budget_amount_micros``.
        """

        target_roas: float = proto.Field(
            proto.DOUBLE, number=1, optional=True,
        )
        campaign_budget_amount_micros: int = proto.Field(
            proto.INT64, number=2, optional=True,
        )

    class TextAdParameters(proto.Message):
        r"""Parameters to use when applying a text ad recommendation.
        Attributes:
            ad (google.ads.googleads.v13.resources.types.Ad):
                New ad to add to recommended ad group. All
                necessary fields need to be set in this message.
                This is a required field.
        """

        ad: gagr_ad.Ad = proto.Field(
            proto.MESSAGE, number=1, message=gagr_ad.Ad,
        )

    class KeywordParameters(proto.Message):
        r"""Parameters to use when applying keyword recommendation.
        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            ad_group (str):
                The ad group resource to add keyword to. This
                is a required field.

                This field is a member of `oneof`_ ``_ad_group``.
            match_type (google.ads.googleads.v13.enums.types.KeywordMatchTypeEnum.KeywordMatchType):
                The match type of the keyword. This is a
                required field.
            cpc_bid_micros (int):
                Optional, CPC bid to set for the keyword. If
                not set, keyword will use bid based on bidding
                strategy used by target ad group.

                This field is a member of `oneof`_ ``_cpc_bid_micros``.
        """

        ad_group: str = proto.Field(
            proto.STRING, number=4, optional=True,
        )
        match_type: keyword_match_type.KeywordMatchTypeEnum.KeywordMatchType = proto.Field(
            proto.ENUM,
            number=2,
            enum=keyword_match_type.KeywordMatchTypeEnum.KeywordMatchType,
        )
        cpc_bid_micros: int = proto.Field(
            proto.INT64, number=5, optional=True,
        )

    class TargetCpaOptInParameters(proto.Message):
        r"""Parameters to use when applying Target CPA recommendation.
        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            target_cpa_micros (int):
                Average CPA to use for Target CPA bidding
                strategy. This is a required field.

                This field is a member of `oneof`_ ``_target_cpa_micros``.
            new_campaign_budget_amount_micros (int):
                Optional, budget amount to set for the
                campaign.

                This field is a member of `oneof`_ ``_new_campaign_budget_amount_micros``.
        """

        target_cpa_micros: int = proto.Field(
            proto.INT64, number=3, optional=True,
        )
        new_campaign_budget_amount_micros: int = proto.Field(
            proto.INT64, number=4, optional=True,
        )

    class TargetRoasOptInParameters(proto.Message):
        r"""Parameters to use when applying a Target ROAS opt-in
        recommendation.

        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            target_roas (float):
                Average ROAS (revenue per unit of spend) to use for Target
                ROAS bidding strategy. The value is between 0.01 and 1000.0,
                inclusive. This is a required field, unless
                new_campaign_budget_amount_micros is set.

                This field is a member of `oneof`_ ``_target_roas``.
            new_campaign_budget_amount_micros (int):
                Optional, budget amount to set for the
                campaign.

                This field is a member of `oneof`_ ``_new_campaign_budget_amount_micros``.
        """

        target_roas: float = proto.Field(
            proto.DOUBLE, number=1, optional=True,
        )
        new_campaign_budget_amount_micros: int = proto.Field(
            proto.INT64, number=2, optional=True,
        )

    class CalloutExtensionParameters(proto.Message):
        r"""Parameters to use when applying callout extension
        recommendation.

        Attributes:
            callout_extensions (MutableSequence[google.ads.googleads.v13.common.types.CalloutFeedItem]):
                Callout extensions to be added. This is a
                required field.
        """

        callout_extensions: MutableSequence[
            extensions.CalloutFeedItem
        ] = proto.RepeatedField(
            proto.MESSAGE, number=1, message=extensions.CalloutFeedItem,
        )

    class CallExtensionParameters(proto.Message):
        r"""Parameters to use when applying call extension
        recommendation.

        Attributes:
            call_extensions (MutableSequence[google.ads.googleads.v13.common.types.CallFeedItem]):
                Call extensions to be added. This is a
                required field.
        """

        call_extensions: MutableSequence[
            extensions.CallFeedItem
        ] = proto.RepeatedField(
            proto.MESSAGE, number=1, message=extensions.CallFeedItem,
        )

    class SitelinkExtensionParameters(proto.Message):
        r"""Parameters to use when applying sitelink extension
        recommendation.

        Attributes:
            sitelink_extensions (MutableSequence[google.ads.googleads.v13.common.types.SitelinkFeedItem]):
                Sitelink extensions to be added. This is a
                required field.
        """

        sitelink_extensions: MutableSequence[
            extensions.SitelinkFeedItem
        ] = proto.RepeatedField(
            proto.MESSAGE, number=1, message=extensions.SitelinkFeedItem,
        )

    class CalloutAssetParameters(proto.Message):
        r"""Parameters to use when applying callout asset
        recommendations.

        Attributes:
            ad_asset_apply_parameters (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.AdAssetApplyParameters):
                Required. Callout assets to be added. This is
                a required field.
        """

        ad_asset_apply_parameters: "ApplyRecommendationOperation.AdAssetApplyParameters" = proto.Field(
            proto.MESSAGE,
            number=1,
            message="ApplyRecommendationOperation.AdAssetApplyParameters",
        )

    class CallAssetParameters(proto.Message):
        r"""Parameters to use when applying call asset recommendations.
        Attributes:
            ad_asset_apply_parameters (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.AdAssetApplyParameters):
                Required. Call assets to be added. This is a
                required field.
        """

        ad_asset_apply_parameters: "ApplyRecommendationOperation.AdAssetApplyParameters" = proto.Field(
            proto.MESSAGE,
            number=1,
            message="ApplyRecommendationOperation.AdAssetApplyParameters",
        )

    class SitelinkAssetParameters(proto.Message):
        r"""Parameters to use when applying sitelink asset
        recommendations.

        Attributes:
            ad_asset_apply_parameters (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.AdAssetApplyParameters):
                Required. Sitelink assets to be added. This
                is a required field.
        """

        ad_asset_apply_parameters: "ApplyRecommendationOperation.AdAssetApplyParameters" = proto.Field(
            proto.MESSAGE,
            number=1,
            message="ApplyRecommendationOperation.AdAssetApplyParameters",
        )

    class AdAssetApplyParameters(proto.Message):
        r"""Common parameters used when applying ad asset
        recommendations.

        Attributes:
            new_assets (MutableSequence[google.ads.googleads.v13.resources.types.Asset]):
                The assets to create and attach to a scope. This may be
                combined with existing_assets in the same call.
            existing_assets (MutableSequence[str]):
                The resource names of existing assets to attach to a scope.
                This may be combined with new_assets in the same call.
            scope (google.ads.googleads.v13.services.types.ApplyRecommendationOperation.AdAssetApplyParameters.ApplyScope):
                Required. The scope at which to apply the
                assets. Assets at the campaign scope level will
                be applied to the campaign associated with the
                recommendation. Assets at the customer scope
                will apply to the entire account. Assets at the
                campaign scope will override any attached at the
                customer scope.
        """

        class ApplyScope(proto.Enum):
            r"""Scope to apply the assets to.
            Next ID: 4
            """
            UNSPECIFIED = 0
            UNKNOWN = 1
            CUSTOMER = 2
            CAMPAIGN = 3

        new_assets: MutableSequence[asset.Asset] = proto.RepeatedField(
            proto.MESSAGE, number=1, message=asset.Asset,
        )
        existing_assets: MutableSequence[str] = proto.RepeatedField(
            proto.STRING, number=2,
        )
        scope: "ApplyRecommendationOperation.AdAssetApplyParameters.ApplyScope" = proto.Field(
            proto.ENUM,
            number=3,
            enum="ApplyRecommendationOperation.AdAssetApplyParameters.ApplyScope",
        )

    class MoveUnusedBudgetParameters(proto.Message):
        r"""Parameters to use when applying move unused budget
        recommendation.

        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            budget_micros_to_move (int):
                Budget amount to move from excess budget to
                constrained budget. This is a required field.

                This field is a member of `oneof`_ ``_budget_micros_to_move``.
        """

        budget_micros_to_move: int = proto.Field(
            proto.INT64, number=2, optional=True,
        )

    class ResponsiveSearchAdAssetParameters(proto.Message):
        r"""Parameters to use when applying a responsive search ad asset
        recommendation.

        Attributes:
            updated_ad (google.ads.googleads.v13.resources.types.Ad):
                Updated ad. The current ad's content will be
                replaced.
        """

        updated_ad: gagr_ad.Ad = proto.Field(
            proto.MESSAGE, number=1, message=gagr_ad.Ad,
        )

    class ResponsiveSearchAdImproveAdStrengthParameters(proto.Message):
        r"""Parameters to use when applying a responsive search ad
        improve ad strength recommendation.

        Attributes:
            updated_ad (google.ads.googleads.v13.resources.types.Ad):
                Updated ad. The current ad's content will be
                replaced.
        """

        updated_ad: gagr_ad.Ad = proto.Field(
            proto.MESSAGE, number=1, message=gagr_ad.Ad,
        )

    class ResponsiveSearchAdParameters(proto.Message):
        r"""Parameters to use when applying a responsive search ad
        recommendation.

        Attributes:
            ad (google.ads.googleads.v13.resources.types.Ad):
                Required. New ad to add to recommended ad
                group.
        """

        ad: gagr_ad.Ad = proto.Field(
            proto.MESSAGE, number=1, message=gagr_ad.Ad,
        )

    class RaiseTargetCpaBidTooLowParameters(proto.Message):
        r"""Parameters to use when applying a raise target CPA bid too
        low recommendation. The apply is asynchronous and can take
        minutes depending on the number of ad groups there is in the
        related campaign..

        Attributes:
            target_multiplier (float):
                Required. A number greater than 1.0
                indicating the factor by which to increase the
                target CPA. This is a required field.
        """

        target_multiplier: float = proto.Field(
            proto.DOUBLE, number=1,
        )

    class UseBroadMatchKeywordParameters(proto.Message):
        r"""Parameters to use when applying a use broad match keyword
        recommendation.

        .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

        Attributes:
            new_budget_amount_micros (int):
                New budget amount to set for target budget
                resource.

                This field is a member of `oneof`_ ``_new_budget_amount_micros``.
        """

        new_budget_amount_micros: int = proto.Field(
            proto.INT64, number=1, optional=True,
        )

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    campaign_budget: CampaignBudgetParameters = proto.Field(
        proto.MESSAGE,
        number=2,
        oneof="apply_parameters",
        message=CampaignBudgetParameters,
    )
    text_ad: TextAdParameters = proto.Field(
        proto.MESSAGE,
        number=3,
        oneof="apply_parameters",
        message=TextAdParameters,
    )
    keyword: KeywordParameters = proto.Field(
        proto.MESSAGE,
        number=4,
        oneof="apply_parameters",
        message=KeywordParameters,
    )
    target_cpa_opt_in: TargetCpaOptInParameters = proto.Field(
        proto.MESSAGE,
        number=5,
        oneof="apply_parameters",
        message=TargetCpaOptInParameters,
    )
    target_roas_opt_in: TargetRoasOptInParameters = proto.Field(
        proto.MESSAGE,
        number=10,
        oneof="apply_parameters",
        message=TargetRoasOptInParameters,
    )
    callout_extension: CalloutExtensionParameters = proto.Field(
        proto.MESSAGE,
        number=6,
        oneof="apply_parameters",
        message=CalloutExtensionParameters,
    )
    call_extension: CallExtensionParameters = proto.Field(
        proto.MESSAGE,
        number=7,
        oneof="apply_parameters",
        message=CallExtensionParameters,
    )
    sitelink_extension: SitelinkExtensionParameters = proto.Field(
        proto.MESSAGE,
        number=8,
        oneof="apply_parameters",
        message=SitelinkExtensionParameters,
    )
    move_unused_budget: MoveUnusedBudgetParameters = proto.Field(
        proto.MESSAGE,
        number=9,
        oneof="apply_parameters",
        message=MoveUnusedBudgetParameters,
    )
    responsive_search_ad: ResponsiveSearchAdParameters = proto.Field(
        proto.MESSAGE,
        number=11,
        oneof="apply_parameters",
        message=ResponsiveSearchAdParameters,
    )
    use_broad_match_keyword: UseBroadMatchKeywordParameters = proto.Field(
        proto.MESSAGE,
        number=12,
        oneof="apply_parameters",
        message=UseBroadMatchKeywordParameters,
    )
    responsive_search_ad_asset: ResponsiveSearchAdAssetParameters = proto.Field(
        proto.MESSAGE,
        number=13,
        oneof="apply_parameters",
        message=ResponsiveSearchAdAssetParameters,
    )
    responsive_search_ad_improve_ad_strength: ResponsiveSearchAdImproveAdStrengthParameters = proto.Field(
        proto.MESSAGE,
        number=14,
        oneof="apply_parameters",
        message=ResponsiveSearchAdImproveAdStrengthParameters,
    )
    raise_target_cpa_bid_too_low: RaiseTargetCpaBidTooLowParameters = proto.Field(
        proto.MESSAGE,
        number=15,
        oneof="apply_parameters",
        message=RaiseTargetCpaBidTooLowParameters,
    )
    forecasting_set_target_roas: ForecastingSetTargetRoasParameters = proto.Field(
        proto.MESSAGE,
        number=16,
        oneof="apply_parameters",
        message=ForecastingSetTargetRoasParameters,
    )
    callout_asset: CalloutAssetParameters = proto.Field(
        proto.MESSAGE,
        number=17,
        oneof="apply_parameters",
        message=CalloutAssetParameters,
    )
    call_asset: CallAssetParameters = proto.Field(
        proto.MESSAGE,
        number=18,
        oneof="apply_parameters",
        message=CallAssetParameters,
    )
    sitelink_asset: SitelinkAssetParameters = proto.Field(
        proto.MESSAGE,
        number=19,
        oneof="apply_parameters",
        message=SitelinkAssetParameters,
    )


class ApplyRecommendationResponse(proto.Message):
    r"""Response message for
    [RecommendationService.ApplyRecommendation][google.ads.googleads.v13.services.RecommendationService.ApplyRecommendation].

    Attributes:
        results (MutableSequence[google.ads.googleads.v13.services.types.ApplyRecommendationResult]):
            Results of operations to apply
            recommendations.
        partial_failure_error (google.rpc.status_pb2.Status):
            Errors that pertain to operation failures in the partial
            failure mode. Returned only when partial_failure = true and
            all errors occur inside the operations. If any errors occur
            outside the operations (for example, auth errors) we return
            the RPC level error.
    """

    results: MutableSequence["ApplyRecommendationResult"] = proto.RepeatedField(
        proto.MESSAGE, number=1, message="ApplyRecommendationResult",
    )
    partial_failure_error: status_pb2.Status = proto.Field(
        proto.MESSAGE, number=2, message=status_pb2.Status,
    )


class ApplyRecommendationResult(proto.Message):
    r"""The result of applying a recommendation.
    Attributes:
        resource_name (str):
            Returned for successful applies.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )


class DismissRecommendationRequest(proto.Message):
    r"""Request message for
    [RecommendationService.DismissRecommendation][google.ads.googleads.v13.services.RecommendationService.DismissRecommendation].

    Attributes:
        customer_id (str):
            Required. The ID of the customer with the
            recommendation.
        operations (MutableSequence[google.ads.googleads.v13.services.types.DismissRecommendationRequest.DismissRecommendationOperation]):
            Required. The list of operations to dismiss recommendations.
            If partial_failure=false all recommendations should be of
            the same type There is a limit of 100 operations per
            request.
        partial_failure (bool):
            If true, successful operations will be
            carried out and invalid operations will return
            errors. If false, operations will be carried in
            a single transaction if and only if they are all
            valid. Default is false.
    """

    class DismissRecommendationOperation(proto.Message):
        r"""Operation to dismiss a single recommendation identified by
        resource_name.

        Attributes:
            resource_name (str):
                The resource name of the recommendation to
                dismiss.
        """

        resource_name: str = proto.Field(
            proto.STRING, number=1,
        )

    customer_id: str = proto.Field(
        proto.STRING, number=1,
    )
    operations: MutableSequence[
        DismissRecommendationOperation
    ] = proto.RepeatedField(
        proto.MESSAGE, number=3, message=DismissRecommendationOperation,
    )
    partial_failure: bool = proto.Field(
        proto.BOOL, number=2,
    )


class DismissRecommendationResponse(proto.Message):
    r"""Response message for
    [RecommendationService.DismissRecommendation][google.ads.googleads.v13.services.RecommendationService.DismissRecommendation].

    Attributes:
        results (MutableSequence[google.ads.googleads.v13.services.types.DismissRecommendationResponse.DismissRecommendationResult]):
            Results of operations to dismiss
            recommendations.
        partial_failure_error (google.rpc.status_pb2.Status):
            Errors that pertain to operation failures in the partial
            failure mode. Returned only when partial_failure = true and
            all errors occur inside the operations. If any errors occur
            outside the operations (for example, auth errors) we return
            the RPC level error.
    """

    class DismissRecommendationResult(proto.Message):
        r"""The result of dismissing a recommendation.
        Attributes:
            resource_name (str):
                Returned for successful dismissals.
        """

        resource_name: str = proto.Field(
            proto.STRING, number=1,
        )

    results: MutableSequence[DismissRecommendationResult] = proto.RepeatedField(
        proto.MESSAGE, number=1, message=DismissRecommendationResult,
    )
    partial_failure_error: status_pb2.Status = proto.Field(
        proto.MESSAGE, number=2, message=status_pb2.Status,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
