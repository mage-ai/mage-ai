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

from google.ads.googleads.v11.enums.types import (
    response_content_type as gage_response_content_type,
)
from google.ads.googleads.v11.resources.types import (
    campaign_experiment as gagr_campaign_experiment,
)
from google.protobuf import field_mask_pb2  # type: ignore
from google.rpc import status_pb2  # type: ignore


__protobuf__ = proto.module(
    package="google.ads.googleads.v11.services",
    marshal="google.ads.googleads.v11",
    manifest={
        "MutateCampaignExperimentsRequest",
        "CampaignExperimentOperation",
        "MutateCampaignExperimentsResponse",
        "MutateCampaignExperimentResult",
        "CreateCampaignExperimentRequest",
        "CreateCampaignExperimentMetadata",
        "GraduateCampaignExperimentRequest",
        "GraduateCampaignExperimentResponse",
        "PromoteCampaignExperimentRequest",
        "EndCampaignExperimentRequest",
        "ListCampaignExperimentAsyncErrorsRequest",
        "ListCampaignExperimentAsyncErrorsResponse",
    },
)


class MutateCampaignExperimentsRequest(proto.Message):
    r"""Request message for
    [CampaignExperimentService.MutateCampaignExperiments][google.ads.googleads.v11.services.CampaignExperimentService.MutateCampaignExperiments].

    Attributes:
        customer_id (str):
            Required. The ID of the customer whose
            campaign experiments are being modified.
        operations (Sequence[google.ads.googleads.v11.services.types.CampaignExperimentOperation]):
            Required. The list of operations to perform
            on individual campaign experiments.
        partial_failure (bool):
            If true, successful operations will be
            carried out and invalid operations will return
            errors. If false, all operations will be carried
            out in one transaction if and only if they are
            all valid. Default is false.
        validate_only (bool):
            If true, the request is validated but not
            executed. Only errors are returned, not results.
        response_content_type (google.ads.googleads.v11.enums.types.ResponseContentTypeEnum.ResponseContentType):
            The response content type setting. Determines
            whether the mutable resource or just the
            resource name should be returned post mutation.
    """

    customer_id = proto.Field(proto.STRING, number=1,)
    operations = proto.RepeatedField(
        proto.MESSAGE, number=2, message="CampaignExperimentOperation",
    )
    partial_failure = proto.Field(proto.BOOL, number=3,)
    validate_only = proto.Field(proto.BOOL, number=4,)
    response_content_type = proto.Field(
        proto.ENUM,
        number=5,
        enum=gage_response_content_type.ResponseContentTypeEnum.ResponseContentType,
    )


class CampaignExperimentOperation(proto.Message):
    r"""A single update operation on a campaign experiment.

    This message has `oneof`_ fields (mutually exclusive fields).
    For each oneof, at most one member field can be set at the same time.
    Setting any member of the oneof automatically clears all other
    members.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        update_mask (google.protobuf.field_mask_pb2.FieldMask):
            FieldMask that determines which resource
            fields are modified in an update.
        update (google.ads.googleads.v11.resources.types.CampaignExperiment):
            Update operation: The campaign experiment is
            expected to have a valid resource name.

            This field is a member of `oneof`_ ``operation``.
        remove (str):
            Remove operation: The campaign experiment is expected to
            have a valid resource name, in this format:

            ``customers/{customer_id}/campaignExperiments/{campaign_experiment_id}``

            This field is a member of `oneof`_ ``operation``.
    """

    update_mask = proto.Field(
        proto.MESSAGE, number=3, message=field_mask_pb2.FieldMask,
    )
    update = proto.Field(
        proto.MESSAGE,
        number=1,
        oneof="operation",
        message=gagr_campaign_experiment.CampaignExperiment,
    )
    remove = proto.Field(proto.STRING, number=2, oneof="operation",)


class MutateCampaignExperimentsResponse(proto.Message):
    r"""Response message for campaign experiment mutate.

    Attributes:
        partial_failure_error (google.rpc.status_pb2.Status):
            Errors that pertain to operation failures in the partial
            failure mode. Returned only when partial_failure = true and
            all errors occur inside the operations. If any errors occur
            outside the operations (for example, auth errors), we return
            an RPC level error.
        results (Sequence[google.ads.googleads.v11.services.types.MutateCampaignExperimentResult]):
            All results for the mutate.
    """

    partial_failure_error = proto.Field(
        proto.MESSAGE, number=3, message=status_pb2.Status,
    )
    results = proto.RepeatedField(
        proto.MESSAGE, number=2, message="MutateCampaignExperimentResult",
    )


class MutateCampaignExperimentResult(proto.Message):
    r"""The result for the campaign experiment mutate.

    Attributes:
        resource_name (str):
            Returned for successful operations.
        campaign_experiment (google.ads.googleads.v11.resources.types.CampaignExperiment):
            The mutated campaign experiment with only mutable fields
            after mutate. The field will only be returned when
            response_content_type is set to "MUTABLE_RESOURCE".
    """

    resource_name = proto.Field(proto.STRING, number=1,)
    campaign_experiment = proto.Field(
        proto.MESSAGE,
        number=2,
        message=gagr_campaign_experiment.CampaignExperiment,
    )


class CreateCampaignExperimentRequest(proto.Message):
    r"""Request message for
    [CampaignExperimentService.CreateCampaignExperiment][google.ads.googleads.v11.services.CampaignExperimentService.CreateCampaignExperiment].

    Attributes:
        customer_id (str):
            Required. The ID of the customer whose
            campaign experiment is being created.
        campaign_experiment (google.ads.googleads.v11.resources.types.CampaignExperiment):
            Required. The campaign experiment to be
            created.
        validate_only (bool):
            If true, the request is validated but not
            executed. Only errors are returned, not results.
    """

    customer_id = proto.Field(proto.STRING, number=1,)
    campaign_experiment = proto.Field(
        proto.MESSAGE,
        number=2,
        message=gagr_campaign_experiment.CampaignExperiment,
    )
    validate_only = proto.Field(proto.BOOL, number=3,)


class CreateCampaignExperimentMetadata(proto.Message):
    r"""Message used as metadata returned in Long Running Operations
    for CreateCampaignExperimentRequest

    Attributes:
        campaign_experiment (str):
            Resource name of campaign experiment created.
    """

    campaign_experiment = proto.Field(proto.STRING, number=1,)


class GraduateCampaignExperimentRequest(proto.Message):
    r"""Request message for
    [CampaignExperimentService.GraduateCampaignExperiment][google.ads.googleads.v11.services.CampaignExperimentService.GraduateCampaignExperiment].

    Attributes:
        campaign_experiment (str):
            Required. The resource name of the campaign
            experiment to graduate.
        campaign_budget (str):
            Required. Resource name of the budget to
            attach to the campaign graduated from the
            experiment.
        validate_only (bool):
            If true, the request is validated but not
            executed. Only errors are returned, not results.
    """

    campaign_experiment = proto.Field(proto.STRING, number=1,)
    campaign_budget = proto.Field(proto.STRING, number=2,)
    validate_only = proto.Field(proto.BOOL, number=3,)


class GraduateCampaignExperimentResponse(proto.Message):
    r"""Response message for campaign experiment graduate.

    Attributes:
        graduated_campaign (str):
            The resource name of the campaign from the graduated
            experiment. This campaign is the same one as
            CampaignExperiment.experiment_campaign.
    """

    graduated_campaign = proto.Field(proto.STRING, number=1,)


class PromoteCampaignExperimentRequest(proto.Message):
    r"""Request message for
    [CampaignExperimentService.PromoteCampaignExperiment][google.ads.googleads.v11.services.CampaignExperimentService.PromoteCampaignExperiment].

    Attributes:
        campaign_experiment (str):
            Required. The resource name of the campaign
            experiment to promote.
        validate_only (bool):
            If true, the request is validated but no Long
            Running Operation is created. Only errors are
            returned.
    """

    campaign_experiment = proto.Field(proto.STRING, number=1,)
    validate_only = proto.Field(proto.BOOL, number=2,)


class EndCampaignExperimentRequest(proto.Message):
    r"""Request message for
    [CampaignExperimentService.EndCampaignExperiment][google.ads.googleads.v11.services.CampaignExperimentService.EndCampaignExperiment].

    Attributes:
        campaign_experiment (str):
            Required. The resource name of the campaign
            experiment to end.
        validate_only (bool):
            If true, the request is validated but not
            executed. Only errors are returned, not results.
    """

    campaign_experiment = proto.Field(proto.STRING, number=1,)
    validate_only = proto.Field(proto.BOOL, number=2,)


class ListCampaignExperimentAsyncErrorsRequest(proto.Message):
    r"""Request message for
    [CampaignExperimentService.ListCampaignExperimentAsyncErrors][google.ads.googleads.v11.services.CampaignExperimentService.ListCampaignExperimentAsyncErrors].

    Attributes:
        resource_name (str):
            Required. The name of the campaign experiment
            from which to retrieve the async errors.
        page_token (str):
            Token of the page to retrieve. If not specified, the first
            page of results will be returned. Use the value obtained
            from ``next_page_token`` in the previous response in order
            to request the next page of results.
        page_size (int):
            Number of elements to retrieve in a single
            page. When a page request is too large, the
            server may decide to further limit the number of
            returned resources.
    """

    resource_name = proto.Field(proto.STRING, number=1,)
    page_token = proto.Field(proto.STRING, number=2,)
    page_size = proto.Field(proto.INT32, number=3,)


class ListCampaignExperimentAsyncErrorsResponse(proto.Message):
    r"""Response message for
    [CampaignExperimentService.ListCampaignExperimentAsyncErrors][google.ads.googleads.v11.services.CampaignExperimentService.ListCampaignExperimentAsyncErrors].

    Attributes:
        errors (Sequence[google.rpc.status_pb2.Status]):
            Details of the errors when performing the
            asynchronous operation.
        next_page_token (str):
            Pagination token used to retrieve the next page of results.
            Pass the content of this string as the ``page_token``
            attribute of the next request. ``next_page_token`` is not
            returned for the last page.
    """

    @property
    def raw_page(self):
        return self

    errors = proto.RepeatedField(
        proto.MESSAGE, number=1, message=status_pb2.Status,
    )
    next_page_token = proto.Field(proto.STRING, number=2,)


__all__ = tuple(sorted(__protobuf__.manifest))
