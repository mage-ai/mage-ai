from mage_ai.api.resources.BaseResource import BaseResource


class GenericResource(BaseResource):
    def __getattr__(self, name):
        def _missing(*args, **kwargs):
            return self.model.get(name)
        return _missing()
