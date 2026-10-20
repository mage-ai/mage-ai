from mage_integrations.sources.front.streams.base import BaseStream


class RulesStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/rules'
