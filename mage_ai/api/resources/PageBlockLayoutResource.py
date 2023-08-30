import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.presenters.block_layout.page import PageBlockLayout


class PageBlockLayoutResource(GenericResource):
    @classmethod
    def get_model(self, pk):
        uuid = urllib.parse.unquote(pk)
        return PageBlockLayout.load(uuid)

    @classmethod
    def member(self, pk, user, **kwargs):
        model = self.get_model(pk)

        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(model, user, **kwargs)

    def update(self, payload, **kwargs):
        self.model.blocks = payload.get('blocks')
        self.model.layout = payload.get('layout')
        self.model.save()
