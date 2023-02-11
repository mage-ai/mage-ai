from mage_ai.api.constants import META_KEY_LIMIT, META_KEY_OFFSET
from typing import Dict, List


def limit_collection(results: List, query: Dict) -> List:
    limit = query.get(META_KEY_LIMIT, [None])
    if limit:
        limit = limit[0]

    offset = query.get(META_KEY_OFFSET, [None])
    if offset:
        offset = offset[0]

    if limit is not None:
        results = results.limit(limit)

    if offset is not None:
        results = results.offset(offset)

    return results
