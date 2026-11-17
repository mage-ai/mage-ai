from mage_integrations.sources.microsoft_bing_ads.streams.accounts import AccountsStream
from mage_integrations.sources.microsoft_bing_ads.streams.ad_groups import AdGroupsStream
from mage_integrations.sources.microsoft_bing_ads.streams.ads import AdsStream
from mage_integrations.sources.microsoft_bing_ads.streams.campaigns import CampaignsStream


class IDS(object):
    ACCOUNTS = 'accounts'
    AD_GROUPS = 'ad_groups'
    ADS = 'ads'
    CAMPAIGNS = 'campaigns'


STREAMS = {
    IDS.ACCOUNTS: AccountsStream,
    IDS.AD_GROUPS: AdGroupsStream,
    IDS.ADS: AdsStream,
    IDS.CAMPAIGNS: CampaignsStream,
}
