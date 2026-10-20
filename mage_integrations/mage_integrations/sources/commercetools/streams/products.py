from mage_integrations.sources.commercetools.streams.base import BaseStream


class ProductsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/products'
