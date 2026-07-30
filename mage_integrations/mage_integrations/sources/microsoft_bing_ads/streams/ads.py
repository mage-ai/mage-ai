from mage_integrations.sources.microsoft_bing_ads.streams.base import BaseStream
from typing import Any, Dict, Mapping, Optional


class Ads(BaseStream):
    """
    Retrieves the ads for all provided accounts.
    API doc: https://docs.microsoft.com/en-us/advertising/campaign-management-service/getadsbyadgroupid?view=bingads-13
    Ad schema: https://docs.microsoft.com/en-us/advertising/campaign-management-service/ad?view=bingads-13
    """

    primary_key = "Id"
    data_field: str = "Ad"
    service_name: str = "CampaignManagement"
    operation_name: str = "GetAdsByAdGroupId"
    additional_fields: str = "ImpressionTrackingUrls Videos LongHeadlines"
    ad_types: Iterable[str] = [
        "Text",
        "Image",
        "Product",
        "AppInstall",
        "ExpandedText",
        "DynamicSearch",
        "ResponsiveAd",
        "ResponsiveSearch",
    ]

    def request_params(
        self,
        stream_slice: Mapping[str, Any] = None,
        **kwargs: Mapping[str, Any],
    ) -> Dict[str, Any]:
        return {
            "AdGroupId": stream_slice["ad_group_id"],
            "AdTypes": {"AdType": self.ad_types},
            "ReturnAdditionalFields": self.additional_fields,
        }

    def stream_slices(
        self,
        **kwargs: Mapping[str, Any],
    ) -> Iterable[Optional[Mapping[str, Any]]]:
        ad_groups = AdGroups(self.client, self.config)
        for slice in ad_groups.stream_slices(sync_mode=SyncMode.full_refresh):
            for ad_group in ad_groups.read_records(sync_mode=SyncMode.full_refresh, stream_slice=slice):
                yield {"ad_group_id": ad_group["Id"], "account_id": slice["account_id"], "customer_id": slice["customer_id"]}
        yield from []
