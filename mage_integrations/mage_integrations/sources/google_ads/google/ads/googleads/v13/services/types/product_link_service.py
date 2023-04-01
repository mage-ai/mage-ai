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

from google.ads.googleads.v13.resources.types import (
    product_link as gagr_product_link,
)


__protobuf__ = proto.module(
    package="google.ads.googleads.v13.services",
    marshal="google.ads.googleads.v13",
    manifest={
        "CreateProductLinkRequest",
        "CreateProductLinkResponse",
        "RemoveProductLinkRequest",
        "RemoveProductLinkResponse",
    },
)


class CreateProductLinkRequest(proto.Message):
    r"""Request message for
    [ProductLinkService.CreateProductLink][google.ads.googleads.v13.services.ProductLinkService.CreateProductLink].

    Attributes:
        customer_id (str):
            Required. The ID of the customer for which
            the product link is created.
        product_link (google.ads.googleads.v13.resources.types.ProductLink):
            Required. The product link to be created.
    """

    customer_id: str = proto.Field(
        proto.STRING, number=1,
    )
    product_link: gagr_product_link.ProductLink = proto.Field(
        proto.MESSAGE, number=2, message=gagr_product_link.ProductLink,
    )


class CreateProductLinkResponse(proto.Message):
    r"""Response message for
    [ProductLinkService.CreateProductLink][google.ads.googleads.v13.services.ProductLinkService.CreateProductLink].

    Attributes:
        resource_name (str):
            Returned for successful operations. Resource
            name of the product link.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )


class RemoveProductLinkRequest(proto.Message):
    r"""Request message for
    [ProductLinkService.RemoveProductLink][google.ads.googleads.v13.services.ProductLinkService.RemoveProductLink].

    Attributes:
        customer_id (str):
            Required. The ID of the customer being
            modified.
        resource_name (str):
            Required. Remove operation: A resource name for the product
            link to remove is expected, in this format:

            ``customers/{customer_id}/productLinks/{product_link_id}``
        validate_only (bool):
            If true, the request is validated but not
            executed. Only errors are returned, not results.
    """

    customer_id: str = proto.Field(
        proto.STRING, number=1,
    )
    resource_name: str = proto.Field(
        proto.STRING, number=2,
    )
    validate_only: bool = proto.Field(
        proto.BOOL, number=3,
    )


class RemoveProductLinkResponse(proto.Message):
    r"""Response message for product link removal.
    Attributes:
        resource_name (str):
            Result for the remove request.
    """

    resource_name: str = proto.Field(
        proto.STRING, number=1,
    )


__all__ = tuple(sorted(__protobuf__.manifest))
