from abc import ABC, abstractmethod


class BaseSource(ABC):
    @abstractmethod
    def read(self):
        pass

    @abstractmethod
    def batch_read(self):
        pass

    def test_connection(self):
        return True
