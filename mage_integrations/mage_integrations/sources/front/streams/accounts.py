from mage_integrations.sources.front.streams.base import BaseStream


class AccountsStream(BaseStream):
    KEY_PROPERTIES = ['id']

    URL_PATH = '/accounts'
