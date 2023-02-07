from mage_ai import settings
from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.orchestration.db.errors import DoesNotExistError, ValidationError
from mage_ai.shared.hash import ignore_keys, merge_dict
from sqlalchemy.orm.query import Query


class DatabaseResource(BaseResource):
    DEFAULT_LIMIT = 10

    @classmethod
    def process_collection(self, query, meta, user, **kwargs):
        limit = int(meta.get(META_KEY_LIMIT, self.DEFAULT_LIMIT))
        offset = int(meta.get(META_KEY_OFFSET, 0))
        start_idx = offset
        end_idx = start_idx + limit
        total_results = self.collection(query, meta, user, **kwargs)
        if issubclass(total_results.__class__, Query):
            total_count = total_results.count()
        else:
            total_count = len(total_results)
        results = total_results[start_idx:(end_idx + 1)]
        results_size = len(results)
        has_next = results_size > limit
        final_end_idx = results_size - 1 if has_next else results_size
        result_set = self.build_result_set(
            results[0:final_end_idx],
            user,
            **kwargs,
        )
        result_set.metadata = {
            'count': total_count,
            'next': has_next,
        }
        return result_set

    @classmethod
    def collection(self, query_arg, meta, user, **kwargs):
        query = ignore_keys(query_arg, [settings.QUERY_API_KEY])
        parent_model = kwargs.get('parent_model')
        if parent_model and self.parent_resource():
            column_name, parent_class = next(
                (k, v) for k, v in self.parent_resource().items() if isinstance(
                    parent_model, v.model_class))
            where = {}
            where[column_name] = parent_model.id

            filters = []
            for col, val in merge_dict(query, where).items():
                filters.append(self.model_class)
            return self.model_class.query.filter(
                **merge_dict(query, where)).all()
        else:
            return self.model_class.query.filter(**query).all()

    @classmethod
    def create(self, payload, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        column_name = None
        parent_class = None
        if parent_model and self.parent_models():
            try:
                column_name, parent_class = next(
                    (k, v) for k, v in self.parent_models().items() if isinstance(
                        parent_model, v))
                payload[column_name] = parent_model.id
            except StopIteration:
                pass
        if parent_model and self.parent_resource():
            try:
                column_name, parent_class = next(
                    (k, v) for k, v in self.parent_resource().items() if isinstance(
                        parent_model, v.model_class))
                payload[column_name] = parent_model.id
            except StopIteration:
                pass
        try:
            model = self.model_class(**payload)
            model.full_clean()
            model.save()
            self.create_associated_resources(model, payload, user, **kwargs)
            return self(model, user, **kwargs)
        except ValidationError as err:
            raise ApiError(merge_dict(ApiError.RESOURCE_INVALID, {
                # We need to return 200 so the front end client can process the error response
                # and show the user helpful errors.
                'code': 200,
                'errors': err.to_dict(),
            }))

    @classmethod
    def create_associated_resources(self, model, payload, user, **kwargs):
        """
        Subclasses override this method
        """
        pass

    @classmethod
    def member(self, pk, user, **kwargs):
        model = self.model_class.query.get(pk)
        if not model:
            raise DoesNotExistError(f'{self.model_class.__name__} {pk} does not exist.')
        return self(model, user, **kwargs)

    def delete(self, **kwargs):
        return self.model.delete()

    def update(self, payload, **kwargs):
        for k, v in payload.items():
            setattr(self.model, k, v)
        self.update_associated_resources(payload, **kwargs)
        self.model.save()
        return self

    def update_associated_resources(self, payload, **kwargs):
        """
        Subclasses override this method
        """
        pass
