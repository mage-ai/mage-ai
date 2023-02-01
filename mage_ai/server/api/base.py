from json import JSONDecodeError
from mage_ai.orchestration.db.models import Oauth2AccessToken, Oauth2Application
from mage_ai.server.api.constants import ENDPOINTS_BYPASS_OAUTH_CHECK, HEADER_OAUTH_TOKEN
from mage_ai.server.api.errors import ApiError
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.strings import camel_to_snake_case
import dateutil.parser
import json
import os
import simplejson
import tornado.web
import traceback

META_KEY_LIMIT = '_limit'
META_KEY_OFFSET = '_offset'


class BaseHandler(tornado.web.RequestHandler):
    datetime_keys = []
    model_class = None

    def check_origin(self, origin):
        return True

    def get_bool_argument(self, name, default_value=None):
        value = self.get_argument(name, default_value)
        if type(value) is not str:
            return value
        return value.lower() in ('yes', 'true', 't', '1')

    def limit(self, results):
        limit = self.get_argument(META_KEY_LIMIT, None)
        offset = self.get_argument(META_KEY_OFFSET, None)
        if limit is not None:
            results = results.limit(limit)
        if offset is not None:
            results = results.offset(offset)
        return results

    def options(self, **kwargs):
        self.set_status(204)
        self.finish()

    def set_default_headers(self):
        methods = 'DELETE, GET, PATCH, POST, PUT, OPTIONS'
        self.set_header('Access-Control-Allow-Headers', '*')
        self.set_header('Access-Control-Allow-Methods', methods)
        self.set_header('Access-Control-Allow-Origin', '*')
        self.set_header('Content-Type', 'application/json')

    def write(self, chunk):
        if type(chunk) is dict:
            chunk = simplejson.dumps(
                chunk,
                default=encode_complex,
                ignore_nan=True,
            )
        super().write(chunk)

    def write_error(self, status_code, **kwargs):
        if status_code == 500:
            self.set_status(200)
            exception = kwargs['exc_info'][1]
            self.write(
                dict(
                    error=dict(
                        code=status_code,
                        errors=traceback.format_stack(),
                        exception=str(exception),
                        message=traceback.format_exc(),
                    ),
                    url_parameters=self.path_kwargs,
                )
            )

    def write_model(self, model, **kwargs):
        key = camel_to_snake_case(self.model_class.__name__)
        self.write({key: model.to_dict(**kwargs)})

    def write_models(self, models):
        key = camel_to_snake_case(self.model_class.__name__) + 's'
        self.write({key: [m.to_dict() for m in models]})

    def get_payload(self):
        key = ''
        if self.model_class:
            key = camel_to_snake_case(self.model_class.__name__)

        payload = {}
        body = self.request.body
        if body:
            payload = json.loads(self.request.body)
            if key != '':
                payload = payload.get(key, {})
            for key in self.datetime_keys:
                if payload.get(key) is not None:
                    payload[key] = dateutil.parser.parse(payload[key])
        return payload


class BaseApiHandler(BaseHandler):
    def prepare(self):
        self.request.__setattr__('current_user', None)
        self.request.__setattr__('error', None)
        self.request.__setattr__('oauth_token', None)

        paths = [path for path in self.request.uri.split('/') if path]
        if any(p in ENDPOINTS_BYPASS_OAUTH_CHECK for p in paths):
            return

        token_from_header = self.request.headers.get(HEADER_OAUTH_TOKEN, None)
        if not token_from_header:
            return

        oauth_token = Oauth2AccessToken.query.filter(
            Oauth2AccessToken.token == token_from_header,
        ).first()
        if oauth_token:
            if oauth_token.is_valid():
                self.request.__setattr__('oauth_token', oauth_token)
                self.request.__setattr__('current_user', oauth_token.user)
            else:
                self.request.__setattr__('error', ApiError.EXPIRED_OAUTH_TOKEN)
        else:
            self.request.__setattr__('error', ApiError.INVALID_OAUTH_TOKEN)


class BaseDetailHandler(BaseHandler):
    def get(self, model_id, **kwargs):
        model = self.model_class.query.get(int(model_id))
        self.write_model(model, **kwargs)

    def put(self, model_id, payload=None):
        model = self.model_class.query.get(int(model_id))
        payload = payload or self.get_payload()
        model.update(**payload)
        self.write_model(model)

    def delete(self, model_id):
        model = self.model_class.query.get(int(model_id))
        model.delete()
        self.write_model(model)
