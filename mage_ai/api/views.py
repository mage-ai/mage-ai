from datetime import datetime
from functools import reduce
from mage_ai.api.operations.base import BaseOperation
from mage_ai.api.operations.constants import (
    CREATE,
    DELETE,
    DETAIL,
    LIST,
    UPDATE,
)
from mage_ai.api.logging import debug, error, info
from mage_ai.services.tracking.metrics import increment, timing
from typing import Dict, List, Tuple, Union
import json
import simplejson


async def execute_operation(
    handler,
    resource: str,
    pk: Union[None, int, str] = None,
    child: str = None,
    child_pk: Union[None, int, str] = None,
) -> None:
    request = handler.request
    user_id = 'N/A' if request.current_user is None else request.current_user.id

    tags = dict(
        child=child,
        child_pk=child_pk,
        pk=pk,
        resource=resource,
        user_id=user_id,
    )
    start_time = datetime.utcnow()

    if request.error:
        return __render_error(handler, request.error, **tags)

    action, options = __determine_action(
        request, child=child, child_pk=child_pk, pk=pk)
    try:
        response = BaseOperation(
            action=action,
            files=request.files,
            headers=request.headers,
            meta=__meta(request),
            oauth_client=request.oauth_client,
            oauth_token=request.oauth_token,
            options=options,
            payload=__payload(request),
            pk=child_pk or pk,
            query=__query(request),
            resource=child or resource,
            resource_parent=resource if child else None,
            resource_parent_id=pk if child else None,
            user=request.current_user,
        ).execute()
    except Exception as err:
        __log_error(
            request,
            err,
            **tags,
        )
        raise err

    end_time = datetime.utcnow()

    error = response.get('error', None)
    if error:
        return __render_error(handler, error, **tags)

    info('Action: {} {} {} {} {}'.format(
        action,
        child or resource,
        child_pk or pk,
        resource if child else '',
        pk if child else '',
    ))
    api_time = end_time.timestamp() - start_time.timestamp()
    info(f'Latency: {api_time:.4f} seconds')
    tags = dict(
        action=action,
        resource=child or resource,
        resource_id=child_pk or pk,
        resource_parent=resource if child else None,
        resource_parent_id=pk if child else None,
    )
    timing('api.time', api_time, tags)
    timing('sql.time', api_time, tags)

    handler.write(simplejson.dumps(
        response,
        default=datetime.isoformat,
        ignore_nan=True,
    ))


def __determine_action(
    request,
    child: str = None,
    child_pk: Union[None, int, str] = None,
    pk: Union[None, int, str] = None,
) -> Tuple[str, str]:
    if 'DELETE' == request.method:
        return (DELETE, request.body_arguments)

    if 'GET' == request.method:
        if pk and child and child_pk:
            return (DETAIL, request.query_arguments)
        elif pk and child and not child_pk:
            return (LIST, request.query_arguments)
        elif pk and not child:
            return (DETAIL, request.query_arguments)
        elif not pk:
            return (LIST, request.query_arguments)

    if 'POST' == request.method:
        return (CREATE, request.body_arguments)

    if 'PUT' == request.method:
        return (UPDATE, request.body_arguments)


def __meta(request) -> Dict:
    def _build(obj: Dict, key: str):
        obj[key] = request.query_arguments.get(key)
        return obj
    return reduce(_build, __meta_keys(request), {})


def __meta_keys(request) -> List[str]:
    return list(
        filter(
            lambda x: x[0] == '_', [
                k for k in request.query_arguments.keys()]))


def __payload(request) -> Dict:
    if 'Content-Type' in request.headers and \
       'multipart/form-data' in request.headers.get('Content-Type'):

        parts = request.body.decode('utf-8', 'ignore').split('\r\n')
        idx = parts.index(
            'Content-Disposition: form-data; name="json_root_body"')
        json_root_body = parts[idx + 2]

        return json.loads(json_root_body)

    return request.body_arguments


def __query(request) -> Dict:
    meta_keys = __meta_keys(request)
    query_arg = dict(request.query_arguments)

    def _build(obj, key):
        value = query_arg.get(key)
        if obj.get(key) and isinstance(obj[key], list):
            obj[key].append(value)
        else:
            obj[key] = value
        return obj
    return reduce(_build, request.query_arguments.keys() - meta_keys, {})


def __render_error(handler, error: Dict, **kwargs):
    __log_error(handler.request, error, **kwargs)
    handler.write(dict(
        error=error,
        status=200,
    ))


def __log_error(
    request,
    err: Dict,
    child: str = None,
    child_pk: str = None,
    pk: str = None,
    resource: str = None,
    user_id: str = None,
):
    if request.current_user is not None:
        error(f'Current user: {request.current_user.id}')
    debug(f'Access token: {request.oauth_token}')

    endpoint = resource
    if pk:
        endpoint += '/{}'.format(pk)
        if child:
            endpoint += '/{}'.format(child)
            if child_pk:
                endpoint += '/{}'.format(child_pk)

    error('[{}] [ERROR] {} /{} [user: {}]: {}'.format(
        datetime.utcnow(),
        request.method,
        endpoint,
        user_id,
        err,
    ))

    increment('api.error', tags=dict(
        endpoint=endpoint,
        error=err['type'] if isinstance(err, dict) else type(err).__name__,
        resource=resource,
    ))
