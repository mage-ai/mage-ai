import inspect

from sqlalchemy.orm.query import Query

from mage_ai import settings
from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.errors import DoesNotExistError, ValidationError
from mage_ai.shared.hash import ignore_keys, merge_dict


class DatabaseResource(BaseResource):
    DEFAULT_LIMIT = 40

    @classmethod
    @safe_db_query
    async def process_collection(self, query, meta, user, **kwargs):
        limit = int((meta or {}).get(META_KEY_LIMIT, self.DEFAULT_LIMIT))
        offset = int((meta or {}).get(META_KEY_OFFSET, 0))

        total_results = self.collection(query, meta, user, **kwargs)
        if total_results and inspect.isawaitable(total_results):
            total_results = await total_results

        if issubclass(total_results.__class__, Query):
            total_count = total_results.count()

            results = total_results.limit(limit + 1).offset(offset).all()
        else:
            total_count = len(total_results)

            start_idx = offset
            end_idx = start_idx + limit

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
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        query_parameters = ignore_keys(query_arg, [settings.QUERY_API_KEY])

        query = self.model_class.query

        for key, value in query_parameters.items():
            query = query.filter(getattr(self.model_class, key) == value)

        parent_model = kwargs.get('parent_model')
        if parent_model and self.parent_resource():
            column_name, _parent_class = next(
                (k, v) for k, v in self.parent_resource().items() if isinstance(
                    parent_model, v.model_class))

            query = query.filter(getattr(self.model_class, column_name) == parent_model.id)

        return query

    @classmethod
    @safe_db_query
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
    @safe_db_query
    def create_associated_resources(self, model, payload, user, **kwargs):
        """
        Subclasses override this method
        """
        pass

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        try:
            db_connection.session.commit()
        except Exception:
            db_connection.session.rollback()

        model = self.model_class.query.get(pk)
        if not model:
            raise DoesNotExistError(f'{self.model_class.__name__} {pk} does not exist.')
        return self(model, user, **kwargs)

    @safe_db_query
    def delete(self, **kwargs):
        return self.model.delete()

    async def process_update(self, payload, **kwargs):
        self.on_update_callback = None
        self.on_update_failure_callback = None

        try:
            res = self.update(payload, **kwargs)
            if res and inspect.isawaitable(res):
                res = await res

            db_connection.session.commit()

            if self.on_update_callback:
                self.on_update_callback(resource=self)

            return res
        except Exception as err:
            db_connection.session.rollback()

            if self.on_update_failure_callback:
                self.on_update_failure_callback(resource=self)

            raise err

    @safe_db_query
    def update(self, payload, **kwargs):
        for k, v in payload.items():
            setattr(self.model, k, v)
        self.update_associated_resources(payload, **kwargs)
        self.model.save()
        return self

    @safe_db_query
    def update_associated_resources(self, payload, **kwargs):
        """
        Subclasses override this method
        """
        pass
