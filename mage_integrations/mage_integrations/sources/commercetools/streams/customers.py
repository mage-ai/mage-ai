from mage_integrations.sources.commercetools.streams.base import BaseStream


class CustomersStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/customers'
