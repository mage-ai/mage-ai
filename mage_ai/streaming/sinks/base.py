from abc import ABC, abstractmethod


class BaseSink(ABC):
    @abstractmethod
    def write(self, data):
        pass

    @abstractmethod
    def batch_write(self, data):
        pass

    def test_connection(self):
        return True
