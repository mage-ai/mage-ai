from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.api.result_set import ResultSet


class AsyncBaseResource(BaseResource):
    async def collective_load_for_attribute(self, key):
        k_name = self.__class__.__name__
        if self.result_set().context and self.result_set().context.data:
            loaded = self.result_set().context.data.get(k_name, {}).get(key, None)
        else:
            loaded = None
        loader = self.__class__.collective_loader().get(key, None)
        if not loaded and loader:
            loaded = await loader['load'](self)
            if loaded and not isinstance(
                    loaded,
                    ResultSet) and not isinstance(
                    loaded,
                    dict):
                loaded = ResultSet(loaded)
            if not self.result_set().context.data.get(k_name):
                self.result_set().context.data[k_name] = {}
            self.result_set().context.data[k_name][key] = loaded
        return loaded

    async def __getattr__(self, name):
        async def _missing(*args, **kwargs):
            loader = self.__class__.collective_loader().get(name, None)
            if loader:
                arr = await self.collective_load_for_attribute(name)
                if loader['select']:
                    val = await loader['select'](self, arr)
                else:
                    val = arr
            else:
                val = getattr(self.model, name)

            return val
        return await _missing()
