from mage_ai.api.views import execute_operation
from mage_ai.server.api.base import BaseApiHandler


class ApiChildDetailHandler(BaseApiHandler):
    async def delete(self, resource, pk, child, child_pk):
        return await execute_operation(self, resource, dict(
            pk=pk,
            child=child,
            child_pk=child_pk,
        ))

    async def get(self, resource, pk, child, child_pk):
        return await execute_operation(self, resource, dict(
            pk=pk,
            child=child,
            child_pk=child_pk,
        ))

    async def put(self, resource, pk, child, child_pk):
        return await execute_operation(self, resource, dict(
            pk=pk,
            child=child,
            child_pk=child_pk,
        ))


class ApiChildListHandler(BaseApiHandler):
    async def get(self, resource, pk, child):
        return await execute_operation(self, resource, dict(
            pk=pk,
            child=child,
        ))

    async def post(self, resource, pk, child):
        return await execute_operation(self, resource, dict(
            pk=pk,
            child=child,
        ))


class ApiResourceDetailHandler(BaseApiHandler):
    async def delete(self, resource, pk):
        return await execute_operation(self, resource, dict(
            pk=pk,
        ))

    async def get(self, resource, pk):
        return await execute_operation(self, resource, dict(
            pk=pk,
        ))

    async def put(self, resource, pk):
        return await execute_operation(self, resource, dict(
            pk=pk,
        ))


class ApiResourceListHandler(BaseApiHandler):
    async def get(self, resource):
        return await execute_operation(self, resource)

    async def post(self, resource):
        return await execute_operation(self, resource)
