from mage_integrations.sources.microsoft_bing_ads.streams.base import BaseStream
from typing import Any, Dict, Mapping, List, Optional


class Campaigns(BaseStream):
    """
    Gets the campaigns for all provided accounts.
    API doc: https://docs.microsoft.com/en-us/advertising/campaign-management-service/getcampaignsbyaccountid?view=bingads-13
    Campaign schema: https://docs.microsoft.com/en-us/advertising/campaign-management-service/campaign?view=bingads-13
    Stream caches incoming responses to be able to reuse this data in AdGroups stream
    """

    primary_key = "Id"
    # Stream caches incoming responses to avoid duplicated http requests
    use_cache: bool = True
    data_field: str = "Campaign"
    service_name: str = "CampaignManagement"
    operation_name: str = "GetCampaignsByAccountId"
    additional_fields: List = [
        "AdScheduleUseSearcherTimeZone",
        "BidStrategyId",
        "CpvCpmBiddingScheme",
        "DynamicDescriptionSetting",
        "DynamicFeedSetting",
        "MaxConversionValueBiddingScheme",
        "MultimediaAdsBidAdjustment",
        "TargetImpressionShareBiddingScheme",
        "TargetSetting",
        "VerifiedTrackingSetting",
    ]
    campaign_types: List = ["Audience", "DynamicSearchAds", "Search", "Shopping"]

    def request_params(
        self,
        stream_slice: Mapping[str, Any] = None,
        **kwargs: Mapping[str, Any],
    ) -> Dict[str, Any]:
        return {
            "AccountId": stream_slice["account_id"],
            "CampaignType": " ".join(self.campaign_types),
            "ReturnAdditionalFields": " ".join(self.additional_fields),
        }

    def stream_slices(
        self,
        **kwargs: Mapping[str, Any],
    ) -> Iterable[Optional[Mapping[str, Any]]]:
        for account in Accounts(self.client, self.config).read_records(SyncMode.full_refresh):
            yield {"account_id": account["Id"], "customer_id": account["ParentCustomerId"]}

        yield from []
