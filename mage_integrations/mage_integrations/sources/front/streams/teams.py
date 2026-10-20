from mage_integrations.sources.front.streams.base import BaseStream


class TeamsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/teams'
