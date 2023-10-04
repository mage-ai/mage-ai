import urllib.parse

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.presenters.pages.constants import CLIENT_PAGES


class ClientPageResource(GenericResource):
    @classmethod
    async def collection(self, query, meta, user, **kwargs):
        return self.build_result_set(CLIENT_PAGES.values(), user, **kwargs)

    @classmethod
    async def member(self, pk, user, **kwargs):
        return self(CLIENT_PAGES[urllib.parse.unquote(pk)], user, **kwargs)
