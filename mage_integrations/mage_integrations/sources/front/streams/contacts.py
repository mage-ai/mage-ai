from mage_integrations.sources.front.streams.base import BaseStream


class ContactsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/contacts'
