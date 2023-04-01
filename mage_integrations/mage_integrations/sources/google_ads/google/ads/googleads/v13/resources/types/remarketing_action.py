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

from google.ads.googleads.v13.common.types import tag_snippet


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.resources",
    marshal="google.ads.googleads.v13",
    manifest={"RemarketingAction",},
)


class RemarketingAction(proto.Message):
    r"""A remarketing action. A snippet of JavaScript code that will
    collect the product id and the type of page people visited
    (product page, shopping cart page, purchase page, general site
    visit) on an advertiser's website.

    .. _oneof: https://proto-plus-python.readthedocs.io/en/stable/fields.html#oneofs-mutually-exclusive-fields

    Attributes:
        resource_name (str):
            Immutable. The resource name of the remarketing action.
            Remarketing action resource names have the form:

            ``customers/{customer_id}/remarketingActions/{remarketing_action_id}``
        id (int):
            Output only. Id of the remarketing action.

            This field is a member of `oneof`_ ``_id``.
        name (str):
            The name of the remarketing action.
            This field is required and should not be empty
            when creating new remarketing actions.

            This field is a member of `oneof`_ ``_name``.
        tag_snippets (MutableSequence[google.ads.googleads.v13.common.types.TagSnippet]):
            Output only. The snippets used for tracking
            remarketing actions.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )
    id: int = proto.Field(
        proto.INT64, number=5, optional=True,
    )
    name: str = proto.Field(
        proto.STRING, number=6, optional=True,
    )
    tag_snippets: MutableSequence[tag_snippet.TagSnippet] = proto.RepeatedField(
        proto.MESSAGE, number=4, message=tag_snippet.TagSnippet,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
