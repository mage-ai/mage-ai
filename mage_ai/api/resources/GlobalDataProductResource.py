from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.shared.hash import ignore_keys


class GlobalDataProductResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        return self.build_result_set(
            GlobalDataProduct.load_all(),
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        uuid = payload.get('uuid')
        model = GlobalDataProduct(uuid, **ignore_keys(payload, ['uuid']))
        model.save()

        return self(model, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self(GlobalDataProduct.get(pk), user, **kwargs)

    def delete(self, **kwargs):
        self.model.delete()

    def update(self, payload, **kwargs):
        self.model.update(payload)
        self.model.save()
