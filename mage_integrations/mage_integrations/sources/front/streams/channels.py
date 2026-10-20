from mage_integrations.sources.front.streams.base import BaseStream


class ChannelsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/channels'
