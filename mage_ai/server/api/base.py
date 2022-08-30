from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.strings import camel_to_snake_case
import dateutil.parser
import json
import simplejson
import tornado.web
import traceback


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

    def get_payload(self):
        key = ''
        if self.model_class:
            key = camel_to_snake_case(self.model_class.__name__)

        payload = json.loads(self.request.body).get(key, {})
        for key in self.datetime_keys:
            if payload.get(key) is not None:
                payload[key] = dateutil.parser.parse(payload[key])
        return payload
