from datetime import datetime
from mage_ai.api import operations
from mage_ai.api.logging import debug, error, info
from mage_ai.services.tracking.metrics import increment
from typing import Dict, List, Tuple, Union


def execute_operation(
     handler,
     resource: str,
     pk: Union[None, int, str] = None,
     child: str = None,
     child_pk: Union[None, int, str] = None,
) -> None:
     request = handler.request

     tags = dict(
          child=child,
          child_pk=child_pk,
          pk=pk,
          resource=resource,
          user_id='N/A' if request.current_user is None else request.current_user.id,
     )
     start_time = datetime.utcnow()

     if request.error:
          return __render_error(handler, request, request.error, tags)

     action, options = __determine_action(request, child=child, child_pk=child_pk, pk=pk)[0]
     try:
        response = operations.BaseOperation(
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
          __log_error(request, err, tags)
          raise err


def __determine_action(
     request,
     child: str = None,
     child_pk: Union[None, int, str] = None,
     pk: Union[None, int, str] = None,
) -> Tuple[str, str]:
     # How to get all the arguments in a GET request?
     if 'DELETE' == request.method:
          return (operations.DELETE, request.POST)

     if 'GET' == request.method:
          if pk and child and child_pk:
               return (operations.DETAIL, request.GET)
          elif pk and child and not child_pk:
               return (operations.LIST, request.GET)
          elif pk and not child:
               return (operations.DETAIL, request.GET)
          elif not pk:
               return (operations.LIST, request.GET)

     if 'POST' == request.method:
          return (operations.CREATE, request.POST)

     if 'PUT' == request.method:
          return (operations.UPDATE, request.POST)


def __meta(request) -> Dict:
    def _build(obj: Dict, key: str):
        obj[key] = request.GET.get(key)
        return obj
    return reduce(_build, __meta_keys(request), {})


def __meta_keys(request) -> List[str]:
    return list(filter(lambda x: x[0] == '_', [k for k in request.GET.keys()]))


def __payload(request) -> Dict:
    if 'Content-Type' in request.headers and \
       'multipart/form-data' in request.headers.get('Content-Type'):
        parts = request.body.decode('utf-8', 'ignore').split('\r\n')
        idx = parts.index('Content-Disposition: form-data; name="json_root_body"')
        json_root_body = parts[idx + 2]
        return json.loads(json_root_body)
    else:
        return json.loads(request.body) if request.body else {}


def __query(request) -> Dict:
    meta_keys = __meta_keys(request)
    query_arg = dict(request.GET)
    def _build(obj, key):
        value = query_arg.get(key)
        if obj.get(key) and type(obj[key]) is list:
            obj[key].append(value)
        else:
            obj[key] = value
        return obj
    return reduce(_build, request.GET.keys() - meta_keys, {})


def __render_error(handler, request, error: Dict, **kwargs):
     __log_error(request, error, **kwargs)
     handler.write(dict(
          error=error,
          status=200,
     ))


def __log_error(request, err: Dict, **kwargs):
    if request.current_user is not None:
        error(f'Current user: {request.current_user.id}')
    debug(f'Access token: {request.oauth_token}')

    endpoint = kwargs.get('resource')
    if kwargs.get('pk'):
        endpoint += '/{}'.format(kwargs.get('pk'))
        if kwargs.get('child'):
            endpoint += '/{}'.format(kwargs.get('child'))
            if kwargs.get('child_pk'):
                endpoint += '/{}'.format(kwargs.get('child_pk'))

    error('[{}] [ERROR] {} /{} [user: {}]: {}'.format(
        datetime.utcnow(),
        request.method,
        endpoint,
        kwargs.get('user_id'),
        err,
    ))

    increment('api.error', tags=dict(
          endpoint=endpoint,
          error=err['type'] if type(err) is dict else type(err).__name__,
          resource=kwargs.get('resource'),
     ))
