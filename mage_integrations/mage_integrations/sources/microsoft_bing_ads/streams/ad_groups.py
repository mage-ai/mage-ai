from mage_integrations.sources.microsoft_bing_ads.streams.base import BaseStream
from typing import Any, Dict, Mapping, Optional


class AdGroups(BaseStream):
    """
    Gets the ad groups for all provided accounts.
    API doc: https://docs.microsoft.com/en-us/advertising/campaign-management-service/getadgroupsbycampaignid?view=bingads-13
    AdGroup schema: https://docs.microsoft.com/en-us/advertising/campaign-management-service/adgroup?view=bingads-13
    Stream caches incoming responses to be able to reuse this data in Ads stream
    """

    primary_key = "Id"
    # Stream caches incoming responses to avoid duplicated http requests
    use_cache: bool = True
    data_field: str = "AdGroup"
    service_name: str = "CampaignManagement"
    operation_name: str = "GetAdGroupsByCampaignId"
    additional_fields: str = "AdGroupType AdScheduleUseSearcherTimeZone CpmBid CpvBid MultimediaAdsBidAdjustment"

    def request_params(
        self,
        stream_slice: Mapping[str, Any] = None,
        **kwargs: Mapping[str, Any],
    ) -> Dict[str, Any]:
        return {"CampaignId": stream_slice["campaign_id"], "ReturnAdditionalFields": self.additional_fields}

    def stream_slices(
        self,
        **kwargs: Mapping[str, Any],
    ) -> Iterable[Optional[Mapping[str, Any]]]:
        campaigns = Campaigns(self.client, self.config)
        for account in Accounts(self.client, self.config).read_records(SyncMode.full_refresh):
            for campaign in campaigns.read_records(
                sync_mode=SyncMode.full_refresh, stream_slice={"account_id": account["Id"], "customer_id": account["ParentCustomerId"]}
            ):
                yield {"campaign_id": campaign["Id"], "account_id": account["Id"], "customer_id": account["ParentCustomerId"]}

        yield from []
