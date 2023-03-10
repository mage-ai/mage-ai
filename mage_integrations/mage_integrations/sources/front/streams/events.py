from mage_integrations.sources.front.streams.base import BaseStream


class EventsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/events'
