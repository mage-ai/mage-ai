from mage_integrations.sources.front.streams.base import BaseStream


class TagsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/tags'
