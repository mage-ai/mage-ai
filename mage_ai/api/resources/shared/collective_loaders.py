from mage_ai.orchestration.db.models import User
from mage_ai.shared.array import find
import importlib


def build_load(associated_resource_class, **kwargs):
    associated_id_column_name = '{}_id'.format(kwargs.get(
        'attribute', associated_resource_class.resource_name_singular()), )

    def _load(resource):
        ids = list(
            filter(
                lambda x: x, [
                    getattr(
                        r, associated_id_column_name) for r in resource.result_set()], ))

        if ids:
            query_set = associated_resource_class.model_class.objects.filter(
                id__in=ids)
        else:
            query_set = []

        return getattr(
            importlib.import_module(
                'api.resources.{}'.format(
                    associated_resource_class.__name__)),
            associated_resource_class.__name__,
        ).build_result_set(
            query_set,
            resource.current_user)

    return _load


def build_load_select(current_resource, associated_resource_class, **kwargs):
    associated_id_column_name = '{}_id'.format(
        kwargs.get('attribute', current_resource.resource_name_singular()),
    )

    def _load(resource):
        ids = [r.id for r in resource.result_set()]
        query = {}
        query[f'{associated_id_column_name}__in'] = ids
        query_set = associated_resource_class.model_class.objects.filter(
            **query)
        return getattr(
            importlib.import_module(
                'api.resources.{}'.format(
                    associated_resource_class.__name__)),
            associated_resource_class.__name__,
        ).build_result_set(
            query_set,
            resource.current_user)
    return _load


def build_select_find(query_column_name):
    def _select(resource, arr):
        return find(
            lambda res: res.id == getattr(
                resource,
                query_column_name),
            arr)
    return _select


def build_select_filter(query_column_name):
    def _select(resource, arr):
        return list(
            filter(
                lambda res: resource.id == getattr(
                    res,
                    query_column_name),
                arr))
    return _select


def load_user(resource):
    user_ids = [r.user_id for r in resource.result_set()]
    query_set = User.query.filter(User.id.in_(user_ids))
    UserResource = getattr(
        importlib.import_module('mage_ai.api.resources.UserResource'),
        'UserResource',
    )
    return UserResource.build_result_set(query_set, resource.current_user)


def select_user(resource, arr):
    return find(lambda res: res.id == resource.user_id, arr)
