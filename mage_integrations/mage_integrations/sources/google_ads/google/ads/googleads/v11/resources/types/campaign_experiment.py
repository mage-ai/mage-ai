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

from google.ads.googleads.v11.enums.types import campaign_experiment_status
from google.ads.googleads.v11.enums.types import (
    campaign_experiment_traffic_split_type,
)


__protobuf__ = proto.module(
    package="google.ads.googleads.v11.resources",
    marshal="google.ads.googleads.v11",
    manifest={"CampaignExperiment",},
)


class CampaignExperiment(proto.Message):
    r"""An A/B experiment that compares the performance of the base
    campaign (the control) and a variation of that campaign (the
    experiment).

    Attributes:
        resource_name (str):
            Immutable. The resource name of the campaign experiment.
            Campaign experiment resource names have the form:

            ``customers/{customer_id}/campaignExperiments/{campaign_experiment_id}``
        id (int):
            Output only. The ID of the campaign
            experiment.
            This field is read-only.

            This field is a member of `oneof`_ ``_id``.
        campaign_draft (str):
            Immutable. The campaign draft with staged
            changes to the base campaign.

            This field is a member of `oneof`_ ``_campaign_draft``.
        name (str):
            The name of the campaign experiment.
            This field is required when creating new
            campaign experiments and must not conflict with
            the name of another non-removed campaign
            experiment or campaign.

            It must not contain any null (code point 0x0),
            NL line feed (code point 0xA) or carriage return
            (code point 0xD) characters.

            This field is a member of `oneof`_ ``_name``.
        description (str):
            The description of the experiment.

            This field is a member of `oneof`_ ``_description``.
        traffic_split_percent (int):
            Immutable. Share of traffic directed to experiment as a
            percent (must be between 1 and 99 inclusive. Base campaign
            receives the remainder of the traffic (100 -
            traffic_split_percent). Required for create.

            This field is a member of `oneof`_ ``_traffic_split_percent``.
        traffic_split_type (google.ads.googleads.v11.enums.types.CampaignExperimentTrafficSplitTypeEnum.CampaignExperimentTrafficSplitType):
            Immutable. Determines the behavior of the
            traffic split.
        experiment_campaign (str):
            Output only. The experiment campaign, as
            opposed to the base campaign.

            This field is a member of `oneof`_ ``_experiment_campaign``.
        status (google.ads.googleads.v11.enums.types.CampaignExperimentStatusEnum.CampaignExperimentStatus):
            Output only. The status of the campaign
            experiment. This field is read-only.
        long_running_operation (str):
            Output only. The resource name of the
            long-running operation that can be used to poll
            for completion of experiment create or promote.
            The most recent long running operation is
            returned.

            This field is a member of `oneof`_ ``_long_running_operation``.
        start_date (str):
            Date when the campaign experiment starts. By
            default, the experiment starts now or on the
            campaign's start date, whichever is later. If
            this field is set, then the experiment starts at
            the beginning of the specified date in the
            customer's time zone. Cannot be changed once the
            experiment starts.
            Format: YYYY-MM-DD
            Example: 2019-03-14

            This field is a member of `oneof`_ ``_start_date``.
        end_date (str):
            The last day of the campaign experiment. By
            default, the experiment ends on the campaign's
            end date. If this field is set, then the
            experiment ends at the end of the specified date
            in the customer's time zone.
            Format: YYYY-MM-DD
            Example: 2019-04-18

            This field is a member of `oneof`_ ``_end_date``.
    """

    resource_name = proto.Field(proto.STRING, number=1,)
    id = proto.Field(proto.INT64, number=13, optional=True,)
    campaign_draft = proto.Field(proto.STRING, number=14, optional=True,)
    name = proto.Field(proto.STRING, number=15, optional=True,)
    description = proto.Field(proto.STRING, number=16, optional=True,)
    traffic_split_percent = proto.Field(proto.INT64, number=17, optional=True,)
    traffic_split_type = proto.Field(
        proto.ENUM,
        number=7,
        enum=campaign_experiment_traffic_split_type.CampaignExperimentTrafficSplitTypeEnum.CampaignExperimentTrafficSplitType,
    )
    experiment_campaign = proto.Field(proto.STRING, number=18, optional=True,)
    status = proto.Field(
        proto.ENUM,
        number=9,
        enum=campaign_experiment_status.CampaignExperimentStatusEnum.CampaignExperimentStatus,
    )
    long_running_operation = proto.Field(
        proto.STRING, number=19, optional=True,
    )
    start_date = proto.Field(proto.STRING, number=20, optional=True,)
    end_date = proto.Field(proto.STRING, number=21, optional=True,)


__all__ = tuple(sorted(__protobuf__.manifest))
