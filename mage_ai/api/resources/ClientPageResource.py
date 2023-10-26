import urllib.parse

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.presenters.pages.constants import CLIENT_PAGES
from mage_ai.presenters.pages.loaders.utils import load_resources
from mage_ai.shared.hash import ignore_keys


class ClientPageResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        resources = await load_resources(ignore_keys(query or {}, ['api_key']))

        result_set = self.build_result_set(CLIENT_PAGES.values(), user, **kwargs)
        result_set.context.data['resources'] = resources

        return result_set

    @classmethod
    @safe_db_query
    async def member(self, pk, user, **kwargs):
        query = kwargs.get('query') or {}
        model = self(CLIENT_PAGES[urllib.parse.unquote(pk)], user, **kwargs)

        resources = await load_resources(ignore_keys(query or {}, ['api_key']))
        model.result_set().context.data['resources'] = resources

        return model
