from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.shared.hash import ignore_keys


class GlobalDataProductResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        return self.build_result_set(
            sorted(GlobalDataProduct.load_all(), key=lambda x: x.uuid),
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        uuid = payload.get('uuid')
        if GlobalDataProduct.get(uuid):
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(dict(message=f'A global data product with UUID {uuid} already exists.'))
            raise ApiError(error)

        model = GlobalDataProduct(uuid, **ignore_keys(payload, ['uuid']))
        model.save()

        return self(model, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self(GlobalDataProduct.get(pk), user, **kwargs)

    def delete(self, **kwargs):
        self.model.delete()

    def update(self, payload, **kwargs):
        uuid = payload.get('uuid')
        if self.model and self.model.uuid != uuid and GlobalDataProduct.get(uuid):
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(dict(message=f'A global data product with UUID {uuid} already exists.'))
            raise ApiError(error)

        if self.model:
            self.model.update(payload)
        else:
            self.model = self.create(payload, self.current_user, **kwargs).model
