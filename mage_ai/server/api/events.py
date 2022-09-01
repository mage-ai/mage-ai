from .base import BaseHandler


class ApiEventHandler(BaseHandler):
    def post(self):
        payload = self.get_payload()
        print(payload)
        self.write(dict(event=payload))
