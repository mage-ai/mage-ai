from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import ignore_keys


class GlobalDataProductResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        repo_path = query.get('repo_path', [None])
        if repo_path:
            repo_path = repo_path[0]

        current_project = query.get('current_project', [False])
        if current_project:
            current_project = current_project[0]

        if current_project:
            repo_path = get_repo_path(user=user)

        return self.build_result_set(
            sorted(GlobalDataProduct.load_all(repo_path), key=lambda x: x.uuid),
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        repo_path = get_repo_path(user=user)
        uuid = payload.get('uuid')
        if GlobalDataProduct.get(uuid, repo_path):
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(
                dict(message=f'A global data product with UUID {uuid} already exists.')
            )
            raise ApiError(error)

        model = GlobalDataProduct(
            uuid,
            repo_path=repo_path,
            **ignore_keys(payload, ['uuid']),
        )
        model.save()

        return self(model, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        query = kwargs.get('query', {})
        project = query.get('project', [None])
        if project:
            project = project[0]
        repo_path = get_repo_path(user=user)
        return self(
            GlobalDataProduct.get(
                pk, repo_path=repo_path if not project else None, project=project
            ),
            user,
            **kwargs,
        )

    def delete(self, **kwargs):
        self.model.delete()

    def update(self, payload, **kwargs):
        repo_path = get_repo_path(user=self.current_user)
        uuid = payload.get('uuid')
        if (
            self.model
            and self.model.uuid != uuid
            and GlobalDataProduct.get(uuid, repo_path)
        ):
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(
                dict(message=f'A global data product with UUID {uuid} already exists.')
            )
            raise ApiError(error)

        if self.model:
            self.model.update(payload)
        else:
            self.model = self.create(payload, self.current_user, **kwargs).model
