from mage_ai.api.resources.BaseResource import BaseResource


class GenericResource(BaseResource):
    def __getattr__(self, name):
        def _missing(*args, **kwargs):
            if type(self.model) is dict:
                return self.model.get(name)
            return self.model
        return _missing()
