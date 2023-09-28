from mage_ai.api.errors import ApiError


class BaseMonitor():
    def __init__(self, resource, user, error, **kwargs):
        self.error = error
        self.options = kwargs
        self.resource = resource
        self.user = user

    def present(self):
        data = ApiError.RESOURCE_ERROR.copy()
        if self.error.code:
            data['code'] = self.error.code
        if self.error.errors:
            data['errors'] = self.error.errors
        if self.error.message:
            data['message'] = self.error.message
        if self.error.type:
            data['type'] = self.error.type
        return data
