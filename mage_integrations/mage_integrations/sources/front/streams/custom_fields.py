from mage_integrations.sources.front.streams.base import BaseStream


class CustomFieldsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/contacts/custom_fields'
