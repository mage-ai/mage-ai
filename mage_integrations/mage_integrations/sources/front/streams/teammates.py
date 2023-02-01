from mage_integrations.sources.front.streams.base import BaseStream


class TeammatesStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/teammates'
