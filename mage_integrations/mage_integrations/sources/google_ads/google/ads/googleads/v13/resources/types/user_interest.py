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

from google.ads.googleads.v13.common.types import (
    criterion_category_availability,
)
from google.ads.googleads.v13.enums.types import user_interest_taxonomy_type


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"UserInterest",},
)


class UserInterest(proto.Message):
    r"""A user interest: a particular interest-based vertical to be
    targeted.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Output only. The resource name of the user interest. User
            interest resource names have the form:

            ``customers/{customer_id}/userInterests/{user_interest_id}``
        taxonomy_type (google.ads.googleads.v13.enums.types.UserInterestTaxonomyTypeEnum.UserInterestTaxonomyType):
            Output only. Taxonomy type of the user
            interest.
        user_interest_id (int):
            Output only. The ID of the user interest.

            This field is a member of `oneof`_ ``_user_interest_id``.
        name (str):
            Output only. The name of the user interest.

            This field is a member of `oneof`_ ``_name``.
        user_interest_parent (str):
            Output only. The parent of the user interest.

            This field is a member of `oneof`_ ``_user_interest_parent``.
        launched_to_all (bool):
            Output only. True if the user interest is
            launched to all channels and locales.

            This field is a member of `oneof`_ ``_launched_to_all``.
        availabilities (MutableSequence[google.ads.googleads.v13.common.types.CriterionCategoryAvailability]):
            Output only. Availability information of the
            user interest.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    taxonomy_type: user_interest_taxonomy_type.UserInterestTaxonomyTypeEnum.UserInterestTaxonomyType = proto.Field(
        proto.ENUM,
        number=2,
        enum=user_interest_taxonomy_type.UserInterestTaxonomyTypeEnum.UserInterestTaxonomyType,
    )
    user_interest_id: int = proto.Field(
        proto.INT64, number=8, optional=True,
    )
    name: str = proto.Field(
        proto.STRING, number=9, optional=True,
    )
    user_interest_parent: str = proto.Field(
        proto.STRING, number=10, optional=True,
    )
    launched_to_all: bool = proto.Field(
        proto.BOOL, number=11, optional=True,
    )
    availabilities: MutableSequence[
        criterion_category_availability.CriterionCategoryAvailability
    ] = proto.RepeatedField(
        proto.MESSAGE,
        number=7,
        message=criterion_category_availability.CriterionCategoryAvailability,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
