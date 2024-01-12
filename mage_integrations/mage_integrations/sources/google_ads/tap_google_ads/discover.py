import json
import sys

import singer

from mage_integrations.sources.google_ads.tap_google_ads.client import create_sdk_client
from mage_integrations.sources.google_ads.tap_google_ads.streams import (
    initialize_core_streams,
    initialize_reports,
)

LOGGER = singer.get_logger()

STREAMS = [
    "accessible_bidding_strategy",
    "ad_group",
    "ad_group_ad",
    "ad_group_criterion",
    "ad_group_audience_view",
    "age_range_view",
    "bidding_strategy",
    "call_view",
    "campaign",
    "campaign_audience_view",
    "campaign_budget",
    "campaign_criterion",
    "campaign_label",
    "carrier_constant",
    "click_view",
    "customer",
    "display_keyword_view",
    "dynamic_search_ads_search_term_view",
    "expanded_landing_page_view",
    "feed",
    "feed_item",
    "feed_item_target",
    "feed_placeholder_view",
    "gender_view",
    "geographic_view",
    "keyword_view",
    "label",
    "landing_page_view",
    "language_constant",
    "managed_placement_view",
    "mobile_app_category_constant",
    "mobile_device_constant",
    "operating_system_version_constant",
    "search_term_view",
    "shopping_performance_view",
    "topic_constant",
    "topic_view",
    "user_interest",
    "user_list",
    "user_location_view",
    "video",
]

CATEGORY_MAP = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    2: "RESOURCE",
    3: "ATTRIBUTE",
    5: "SEGMENT",
    6: "METRIC",
}


def get_api_objects(config):
    client = create_sdk_client(config)
    gaf_service = client.get_service("GoogleAdsFieldService")

    query = "SELECT name, category, data_type, selectable, filterable, sortable, selectable_with, metrics, segments, is_repeated, type_url, enum_values, attribute_resources"

    api_objects = gaf_service.search_google_ads_fields(query=query)
    return api_objects


def get_attributes(api_objects, resource):
    resource_attributes = []

    if CATEGORY_MAP[resource.category] != "RESOURCE":
        # Attributes, segments, and metrics do not have attributes
        return resource_attributes

    attributed_resources = set(resource.attribute_resources)
    for field in api_objects:
        root_object_name = field.name.split(".")[0]
        does_field_exist_on_resource = (
            root_object_name == resource.name
            or root_object_name in attributed_resources
        )
        is_field_an_attribute = CATEGORY_MAP[field.category] == "ATTRIBUTE"
        if is_field_an_attribute and does_field_exist_on_resource:
            resource_attributes.append(field.name)
    return resource_attributes


def get_segments(resource_schema, resource):
    resource_segments = []

    if resource["category"] != "RESOURCE":
        # Attributes, segments, and metrics do not have attributes
        return resource_segments

    segments = resource["segments"]
    for segment in segments:
        if segment.startswith("segments."):
            resource_segments.append(segment)
        else:
            segment_schema = resource_schema[segment]
            segment_attributes = [
                attribute
                for attribute in segment_schema["attributes"]
                if attribute.startswith(f"{segment}.")
            ]
            resource_segments.extend(segment_attributes)
    return resource_segments


def build_resource_metadata(api_objects, resource):
    attributes = get_attributes(api_objects, resource)

    # These are the data types returned from google. They are mapped to json schema. UNSPECIFIED and UNKNOWN have never been returned.
    # 0: "UNSPECIFIED", 1: "UNKNOWN", 2: "BOOLEAN", 3: "DATE", 4: "DOUBLE", 5: "ENUM", 6: "FLOAT", 7: "INT32", 8: "INT64", 9: "MESSAGE", 10: "RESOURCE_NAME", 11: "STRING", 12: "UINT64"
    data_type_map = {
        0: {"type": ["null", "string"]},
        1: {"type": ["null", "string"]},
        2: {"type": ["null", "boolean"]},
        3: {"type": ["null", "string"], "format": "date-time"},
        4: {"type": ["null", "string"]},
        5: {"type": ["null", "string"]},
        6: {"type": ["null", "string"]},
        7: {"type": ["null", "integer"]},
        8: {"type": ["null", "integer"]},
        9: {"type": ["null", "string"], "properties": {}},
        10: {"type": ["null", "string"], "properties": {}},
        11: {"type": ["null", "string"]},
        12: {"type": ["null", "integer"]},
    }

    resource_metadata = {
        "name": resource.name,
        "category": CATEGORY_MAP[resource.category],
        "json_schema": dict(data_type_map[resource.data_type]),
        "selectable": resource.selectable,
        "filterable": resource.filterable,
        "sortable": resource.sortable,
        "selectable_with": set(resource.selectable_with),
        "metrics": list(resource.metrics),
        "segments": list(resource.segments),
        "attributes": attributes,
    }

    return resource_metadata


def get_root_resource_name(field_name):
    if not (field_name.startswith("segments.") or field_name.startswith("metrics.")):
        field_root_resource = field_name.split(".")[0]
    else:
        field_root_resource = field_name

    return field_root_resource


def create_resource_schema(config):
    """
    The resource schema is necessary to create a 'source of truth' with regards to the fields
    Google Ads can return to us. It allows for the discovery of field exclusions and other fun
    things like data types.


    It includes every field Google Ads can return and the possible fields that each resource
    can return.

    This schema is based off of the Google Ads blog posts for the creation of their query builder:
    https://ads-developers.googleblog.com/2021/04/the-query-builder-blog-series-part-3.html
    """

    resource_schema = {}

    api_objects = get_api_objects(config)

    for resource in api_objects:
        resource_schema[resource.name] = build_resource_metadata(api_objects, resource)

    for resource in resource_schema.values():
        updated_segments = get_segments(resource_schema, resource)
        resource["segments"] = updated_segments

    for stream in STREAMS:
        stream_object = resource_schema[stream]
        fields = {}
        attributes = stream_object["attributes"]
        metrics = stream_object["metrics"]
        segments = stream_object["segments"]
        for field in attributes + metrics + segments:
            field_schema = dict(resource_schema[field])

            if field_schema["name"] in segments:
                field_schema["category"] = "SEGMENT"

            fields[field_schema["name"]] = {
                "field_details": field_schema,
                "incompatible_fields": [],
            }

        # Start discovery of field exclusions
        metrics_and_segments = set(metrics + segments)

        for field_name, field in fields.items():
            if field["field_details"]["category"] == "ATTRIBUTE":
                continue
            for compared_field in metrics_and_segments:
                field_root_resource = get_root_resource_name(field_name)
                compared_field_root_resource = get_root_resource_name(compared_field)

                if (
                    field_name != compared_field
                    and not compared_field.startswith(f"{field_root_resource}.")
                ):
                    field_to_check = field_root_resource or field_name
                    compared_field_to_check = compared_field_root_resource or compared_field

                    # The `selectable_with` for any given metric will not include
                    # any other metrics despite compatibility, so don't check those
                    if field_name.startswith("metrics.") and compared_field.startswith("metrics."):
                        continue

                    # If a resource is selectable with another resource they should be in
                    # each other's 'selectable_with' list, but Google is missing some of
                    # these so we have to check both ways
                    if (
                        field_to_check not in resource_schema[compared_field_to_check]["selectable_with"]
                        and compared_field_to_check not in resource_schema[field_to_check]["selectable_with"]
                    ):
                        field["incompatible_fields"].append(compared_field)

        stream_object["fields"] = fields
    return resource_schema


def do_discover_streams(stream_name_to_resource):

    streams = []
    for stream_name, stream in stream_name_to_resource.items():

        catalog_entry = {
            "tap_stream_id": stream_name,
            "stream": stream_name,
            "schema": stream.stream_schema,
            "metadata": singer.metadata.to_list(stream.stream_metadata),
        }
        streams.append(catalog_entry)

    return streams


def do_discover(resource_schema):
    core_streams = do_discover_streams(initialize_core_streams(resource_schema))
    report_streams = do_discover_streams(initialize_reports(resource_schema))
    streams = []

    streams.extend(core_streams)
    streams.extend(report_streams)

    data = {"streams": streams}
    return data
