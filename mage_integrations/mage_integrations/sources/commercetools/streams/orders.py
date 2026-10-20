from mage_integrations.sources.commercetools.streams.base import BaseStream


class OrdersStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/orders'
