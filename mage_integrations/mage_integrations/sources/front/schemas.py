from mage_integrations.sources.front.streams.accounts import AccountsStream
from mage_integrations.sources.front.streams.analytics import AnalyticsStream
from mage_integrations.sources.front.streams.channels import ChannelsStream
from mage_integrations.sources.front.streams.contact_groups import ContactGroupsStream
from mage_integrations.sources.front.streams.contacts import ContactsStream
from mage_integrations.sources.front.streams.conversations import ConversationsStream
from mage_integrations.sources.front.streams.custom_fields import CustomFieldsStream
from mage_integrations.sources.front.streams.events import EventsStream
from mage_integrations.sources.front.streams.rules import RulesStream
from mage_integrations.sources.front.streams.tags import TagsStream
from mage_integrations.sources.front.streams.teammates import TeammatesStream
from mage_integrations.sources.front.streams.teams import TeamsStream


class IDS(object):
    ACCOUNTS = 'accounts'
    ANALYTICS = 'analytics'
    CHANNELS = 'channels'
    CONTACT_GROUPS = 'contact_groups'
    CONTACTS = 'contacts'
    CONVERSATIONS = 'conversations'
    CUSTOM_FIELDS = 'custom_fields'
    EVENTS = 'events'
    RULES = 'rules'
    TAGS = 'tags'
    TEAMMATES = 'teammates'
    TEAMS = 'teams'


STREAMS = {
    IDS.ACCOUNTS: AccountsStream,
    IDS.ANALYTICS: AnalyticsStream,
    IDS.CHANNELS: ChannelsStream,
    IDS.CONTACT_GROUPS: ContactGroupsStream,
    IDS.CONTACTS: ContactsStream,
    IDS.CONVERSATIONS: ConversationsStream,
    IDS.CUSTOM_FIELDS: CustomFieldsStream,
    IDS.EVENTS: EventsStream,
    IDS.RULES: RulesStream,
    IDS.TAGS: TagsStream,
    IDS.TEAMMATES: TeammatesStream,
    IDS.TEAMS: TeamsStream,
}
