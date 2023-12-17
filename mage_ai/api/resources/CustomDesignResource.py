from typing import Dict

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.presenters.design.models import CustomDesign


class CustomDesignResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query: Dict, _meta: Dict, user, **kwargs):
        custom_design = CustomDesign.load_from_file(all_configurations=True)

        arr = [custom_design]

        if custom_design.custom_designs:
            arr.extend(list(custom_design.custom_designs.values()))

        return self.build_result_set(arr, user, **kwargs)
