from mage_ai.api.views import execute_operation
from mage_ai.server.api.base import BaseApiHandler, BaseHandler


class ApiChildDetailHandler(BaseApiHandler):
    def delete(self, resource, pk, child, child_pk):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
            child=child,
            child_pk=child_pk,
        ))

    def get(self, resource, pk, child, child_pk):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
            child=child,
            child_pk=child_pk,
        ))

    def put(self, resource, pk, child, child_pk):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
            child=child,
            child_pk=child_pk,
        ))


class ApiChildListHandler(BaseApiHandler):
    def get(self, resource, pk, child):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
            child=child,
        ))

    def post(self, resource, pk, child):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
            child=child,
        ))


class ApiResourceDetailHandler(BaseApiHandler):
    def delete(self, resource, pk):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
        ))

    def get(self, resource, pk):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
        ))

    def put(self, resource, pk):
        return execute_operation(self, self.request, resource, dict(
            pk=pk,
        ))


class ApiResourceListHandler(BaseApiHandler):
    def get(self, resource):
        return execute_operation(self, self.request, resource)

    def post(self, resource):
        return execute_operation(self, self.request, resource)
