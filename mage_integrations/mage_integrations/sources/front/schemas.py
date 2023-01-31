from mage_integrations.sources.front.streams.accounts import AccountsStream
from mage_integrations.sources.front.streams.analytics import AnalyticsStream
from mage_integrations.sources.front.streams.contact_groups import ContactGroupsStream
from mage_integrations.sources.front.streams.contacts import ContactsStream
from mage_integrations.sources.front.streams.tags import TagsStream
from mage_integrations.sources.front.streams.teammates import TeammatesStream
from mage_integrations.sources.front.streams.teams import TeamsStream


class IDS(object):
    ACCOUNTS = 'accounts'
    ANALYTICS = 'analytics'
    CONTACT_GROUPS = 'contact_groups'
    CONTACTS = 'contacts'
    TAGS = 'tags'
    TEAMMATES = 'teammates'
    TEAMS = 'teams'


STREAMS = {
    IDS.ACCOUNTS: AccountsStream,
    IDS.ANALYTICS: AnalyticsStream,
    IDS.CONTACT_GROUPS: ContactGroupsStream,
    IDS.CONTACTS: ContactsStream,
    IDS.TAGS: TagsStream,
    IDS.TEAMMATES: TeammatesStream,
    IDS.TEAMS: TeamsStream,
}
