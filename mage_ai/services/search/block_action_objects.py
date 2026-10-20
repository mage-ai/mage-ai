import os
from typing import List

from thefuzz import fuzz

from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.shared.custom_logger import DX_PRINTER

DEFAULT_RATIO = 50


async def search(query: str, ratio: float = None, limit: int = None) -> List:
    if ratio is None:
        ratio = DEFAULT_RATIO

    cache = await BlockActionObjectCache.initialize_cache()
    DX_PRINTER.label = 'BlockActionObjectCache'

    results = []

    for object_type, mapping in cache.load_all_data().items():
        for uuid, block_action_object in mapping.items():
            text = get_searchable_text(object_type, block_action_object)
            if not text:
                continue

            arr = [fuzz.token_set_ratio(query, t) for t in text]
            if not arr:
                continue

            score = max(arr)

            if score < ratio:
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


def get_searchable_text(object_type, block_action_object) -> List[str]:
    arr = []

    if OBJECT_TYPE_BLOCK_FILE == object_type:
        uuid = block_action_object.get('uuid')
        arr.extend([
            block_action_object.get('content'),
            block_action_object.get('language'),
            block_action_object.get('type'),
            uuid,
        ])
        if uuid:
            uuid_spaces = uuid.replace('_', ' ')
            arr.extend([
                os.path.basename(uuid),
                os.path.basename(uuid_spaces),
                uuid_spaces,
            ])
    elif OBJECT_TYPE_MAGE_TEMPLATE == object_type:
        arr.extend([
            block_action_object.get('block_type'),
            block_action_object.get('description'),
            block_action_object.get('language'),
            block_action_object.get('name'),
        ])
        groups = block_action_object.get('groups')
        if groups:
            arr.extend(groups)

    return [t.strip().lower() for t in arr if t and t.strip()]
