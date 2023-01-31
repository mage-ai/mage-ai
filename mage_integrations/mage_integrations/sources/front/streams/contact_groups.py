from mage_integrations.sources.front.streams.base import BaseStream


class ContactGroupsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/contact_groups'
