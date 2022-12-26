from typing import List


def get_leaf_nodes(
    block: 'Block',
    attribute_key: str,
    condition=None,
    include_all_nodes: bool = False,
) -> List['Block']:
    leafs = []

    def _get_leaf_nodes(b: 'Block'):
        if condition is None or condition(b):
            if b is not None:
                arr = getattr(b, attribute_key)
                if len(arr) == 0 or (include_all_nodes and b != block):
                    leafs.append(b)

                for n in arr:
                    _get_leaf_nodes(n)

    _get_leaf_nodes(block)

    return leafs


def is_dynamic_block(block: 'Block') -> bool:
    return block.configuration and block.configuration.get('dynamic', False)
