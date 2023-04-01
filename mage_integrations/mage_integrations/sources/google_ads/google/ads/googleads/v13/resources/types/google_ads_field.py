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

from google.ads.googleads.v13.enums.types import google_ads_field_category
from google.ads.googleads.v13.enums.types import google_ads_field_data_type


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"GoogleAdsField",},
)


class GoogleAdsField(proto.Message):
    r"""A field or resource (artifact) used by GoogleAdsService.
    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Output only. The resource name of the artifact. Artifact
            resource names have the form:

            ``googleAdsFields/{name}``
        name (str):
            Output only. The name of the artifact.

            This field is a member of `oneof`_ ``_name``.
        category (google.ads.googleads.v13.enums.types.GoogleAdsFieldCategoryEnum.GoogleAdsFieldCategory):
            Output only. The category of the artifact.
        selectable (bool):
            Output only. Whether the artifact can be used
            in a SELECT clause in search queries.

            This field is a member of `oneof`_ ``_selectable``.
        filterable (bool):
            Output only. Whether the artifact can be used
            in a WHERE clause in search queries.

            This field is a member of `oneof`_ ``_filterable``.
        sortable (bool):
            Output only. Whether the artifact can be used
            in a ORDER BY clause in search queries.

            This field is a member of `oneof`_ ``_sortable``.
        selectable_with (MutableSequence[str]):
            Output only. The names of all resources,
            segments, and metrics that are selectable with
            the described artifact.
        attribute_resources (MutableSequence[str]):
            Output only. The names of all resources that
            are selectable with the described artifact.
            Fields from these resources do not segment
            metrics when included in search queries.

            This field is only set for artifacts whose
            category is RESOURCE.
        metrics (MutableSequence[str]):
            Output only. This field lists the names of
            all metrics that are selectable with the
            described artifact when it is used in the FROM
            clause. It is only set for artifacts whose
            category is RESOURCE.
        segments (MutableSequence[str]):
            Output only. This field lists the names of
            all artifacts, whether a segment or another
            resource, that segment metrics when included in
            search queries and when the described artifact
            is used in the FROM clause. It is only set for
            artifacts whose category is RESOURCE.
        enum_values (MutableSequence[str]):
            Output only. Values the artifact can assume
            if it is a field of type ENUM.
            This field is only set for artifacts of category
            SEGMENT or ATTRIBUTE.
        data_type (google.ads.googleads.v13.enums.types.GoogleAdsFieldDataTypeEnum.GoogleAdsFieldDataType):
            Output only. This field determines the
            operators that can be used with the artifact in
            WHERE clauses.
        type_url (str):
            Output only. The URL of proto describing the
            artifact's data type.

            This field is a member of `oneof`_ ``_type_url``.
        is_repeated (bool):
            Output only. Whether the field artifact is
            repeated.

            This field is a member of `oneof`_ ``_is_repeated``.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    name: str = proto.Field(
        proto.STRING, number=21, optional=True,
    )
    category: google_ads_field_category.GoogleAdsFieldCategoryEnum.GoogleAdsFieldCategory = proto.Field(
        proto.ENUM,
        number=3,
        enum=google_ads_field_category.GoogleAdsFieldCategoryEnum.GoogleAdsFieldCategory,
    )
    selectable: bool = proto.Field(
        proto.BOOL, number=22, optional=True,
    )
    filterable: bool = proto.Field(
        proto.BOOL, number=23, optional=True,
    )
    sortable: bool = proto.Field(
        proto.BOOL, number=24, optional=True,
    )
    selectable_with: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=25,
    )
    attribute_resources: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=26,
    )
    metrics: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=27,
    )
    segments: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=28,
    )
    enum_values: MutableSequence[str] = proto.RepeatedField(
        proto.STRING, number=29,
    )
    data_type: google_ads_field_data_type.GoogleAdsFieldDataTypeEnum.GoogleAdsFieldDataType = proto.Field(
        proto.ENUM,
        number=12,
        enum=google_ads_field_data_type.GoogleAdsFieldDataTypeEnum.GoogleAdsFieldDataType,
    )
    type_url: str = proto.Field(
        proto.STRING, number=30, optional=True,
    )
    is_repeated: bool = proto.Field(
        proto.BOOL, number=31, optional=True,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
