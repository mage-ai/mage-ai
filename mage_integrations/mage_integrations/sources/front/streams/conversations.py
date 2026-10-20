from mage_integrations.sources.front.streams.base import BaseStream


class ConversationsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/conversations'
