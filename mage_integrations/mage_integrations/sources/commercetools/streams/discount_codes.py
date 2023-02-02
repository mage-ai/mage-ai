from mage_integrations.sources.commercetools.streams.base import BaseStream


class DiscountCodesStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/discount-codes'
