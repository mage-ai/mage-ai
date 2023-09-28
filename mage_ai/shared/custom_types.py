from typing import Any


class FrozenDict(dict):
    def __setitem__(self, __k, __v) -> None:
        raise AttributeError('Cannot assign a value to frozen dictionary')

    def __delitem__(self, __v) -> None:
        raise AttributeError('Cannot delete a value from frozen dictionary')

    def clear(self) -> None:
        raise AttributeError('Cannot clear a frozen dictionary')

    def pop(self, __k) -> Any:
        raise AttributeError('Cannot remove item from a frozen dictionary')

    def popitem(self) -> Any:
        raise AttributeError('Cannot remove item from a frozen dictionary')

    def setdefault(self, __k, __v=None) -> Any:
        if __k in self.keys():
            return self[__k]
        else:
            raise AttributeError('Cannot assign a value to frozen dictionary')

    def update(self, other=None) -> Any:
        raise AttributeError('Cannot assign a value to frozen dictionary')

    def __hash__(self):
        # TODO: Come up with better hash function
        return hash(tuple((key, str(value)) for key, value in self.items()))
