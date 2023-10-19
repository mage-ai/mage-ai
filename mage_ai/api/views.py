import json
from datetime import datetime
from functools import reduce
from typing import Dict, List, Tuple, Union

import simplejson

from mage_ai.api.logging import debug, error, info
from mage_ai.api.operations.base import BaseOperation
from mage_ai.api.operations.constants import CREATE, DELETE, DETAIL, LIST, UPDATE
from mage_ai.services.tracking.metrics import increment, timing
from mage_ai.shared.parsers import encode_complex


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
        base_operation = BaseOperation(
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
        )
        response = await base_operation.execute()
    except Exception as err:
        __log_error(
            request,
            err,
            **tags,
        )
        raise err

    end_time = datetime.utcnow()

    error_response = response.get('error', None)
    if error_response:
        return __render_error(handler, error_response, **tags)

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
        default=encode_complex,
        ignore_nan=True,
    ))


def __determine_action(
    request,
    child: str = None,
    child_pk: Union[None, int, str] = None,
    pk: Union[None, int, str] = None,
) -> Tuple[str, str]:
    if 'DELETE' == request.method:
        return (DELETE, __parse_request_body(request))

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
        return (CREATE, __parse_request_body(request))

    if 'PUT' == request.method:
        return (UPDATE, __parse_request_body(request))


def __meta(request) -> Dict:
    def _build(obj: Dict, key: str):
        obj[key] = request.query_arguments.get(key)
        return obj

    meta_init = reduce(_build, __meta_keys(request), {})
    meta = {}
    for k, v in meta_init.items():
        if type(v) is not list:
            v = [v]

        arr = []
        for val in v:
            try:
                val = val.decode()
            except (UnicodeDecodeError, AttributeError):
                pass
            arr.append(val)

        meta[k] = arr[0]

    return meta


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

    return __parse_request_body(request)


def __parse_request_body(request) -> Dict:
    payload = {}

    if request.body_arguments and len(request.body_arguments) >= 1:
        payload = request.body_arguments
    elif request.body:
        if type(request.body) is str:
            payload = json.loads(request.body)
        else:
            payload = json.loads(request.body.decode())

    return payload


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
