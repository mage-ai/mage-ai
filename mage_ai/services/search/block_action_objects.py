from typing import List

from thefuzz import fuzz

from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.shared.custom_logger import DX_PRINTER

DEFAULT_RATIO = 80


async def search(query: str, ratio: float = None, limit: int = None) -> List:
    ratio_to_use = ratio or DEFAULT_RATIO

    cache = await BlockActionObjectCache.initialize_cache()
    DX_PRINTER.label = 'BlockActionObjectCache'

    results = []

    for object_type, mapping in cache.load_all_data().items():
        for uuid, block_action_object in mapping.items():
            score = fuzz.partial_token_sort_ratio(query, uuid)
            if score < ratio_to_use:
                continue

            results.append(dict(
                block_action_object=block_action_object,
                object_type=object_type,
                score=score,
                uuid=uuid,
            ))

    DX_PRINTER.info(f'Cache: {len(results)}')

    arr = sorted(results, key=lambda x: x['score'], reverse=True)

    if limit:
        arr = arr[:limit]

    return arr
