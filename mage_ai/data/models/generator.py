from collections.abc import Generator
from typing import Any, Callable, Dict, List, Optional


class DataGenerator:
    def __init__(
        self,
        data: Optional[Any] = None,
        load_data: Optional[Callable[[int], Any]] = None,
        measure_data: Optional[Callable[[int], int]] = None,
    ):
        self.data = data
        self.index = 0
        self.load_data = load_data
        self.measure_data = measure_data
        self._length = None

    def __len__(self):
        # Check if the total length has been determined already
        if self._length is None:
            # Logic to determine the length from the datasource
            # This could involve querying the database,
            # reading file info, etc., without loading all data
            self._length = self._data_length(self.index)
        return self._length

    def __iter__(self):
        if self.data is not None and hasattr(self.data, '__iter__'):
            for item in self.data:
                yield item
        elif self.data is not None and hasattr(self.data, '__getitem__'):
            for item in self.__sequence_iterator():
                yield item
        else:
            while self.index < self._data_length(self.index):
                item = None
                if self.load_data:
                    item = self.load_data(self.index)
                elif self.data is not None:
                    item = self.data[self.index]
                self.index += 1
                yield item
        self.data = None  # Explicitly set data to None after iteration is finished

    def __next__(self):
        if self.index < self._data_length(self.index):
            # Load the next item
            item = None
            if self.load_data:
                item = self.load_data(self.index)
            elif self.data is not None:
                item = self.data[self.index]
            self.index += 1
            return item
        else:
            self.data = None  # Set data to None when the generator is exhausted
            # No more data, stop iteration
            raise StopIteration

    def iterable(self) -> bool:
        return hasattr(self.data, '__iter__') or hasattr(self.data, '__getitem__')

    def _data_length(self, index: Optional[int] = None) -> int:
        if self.measure_data:
            return self.measure_data(index or 0)
        return len(self.data) if self.data is not None else 0

    def __sequence_iterator(self) -> Any:
        # Custom iterator for objects supporting the sequence protocol without __iter__
        class SeqIterator:
            def __init__(self, seq):
                self.seq = seq
                self.index = 0

            def __next__(self):
                try:
                    result = self.seq[self.index]
                except IndexError:
                    raise StopIteration
                self.index += 1
                return result

        return SeqIterator(self.data)


class GeneratorWithMetadata:
    def __init__(self, generator: Generator, metadata: Optional[List[Dict[str, Any]]]):
        """
        Initializes the custom generator wrapper with a generator and associated metadata.

        :param generator: The generator to wrap.
        :param metadata: A dictionary containing metadata related to the generator.
        """
        self._generator = generator
        self.metadata = metadata

    def __iter__(self):
        """
        Returns the iterator object itself.
        """
        return self

    def __next__(self):
        """
        Returns the next item from the generator.
        """
        return next(self._generator)

    def get_metadata(self) -> Dict[str, Any]:
        """
        Returns the stored metadata.

        :return: A dictionary containing metadata.
        """
        return self.metadata
