import importlib
from typing import Dict


async def load_resources(query: Dict) -> Dict:
    mapping = {}

    for query_parameter_name, ids in query.items():
        resource_name = query_parameter_name.replace('[]', '')
        loader = importlib.import_module(
            f'mage_ai.presenters.pages.loaders.{resource_name}',
        ).Loader

        mapping[resource_name] = await loader.load(ids, query)

    return mapping
