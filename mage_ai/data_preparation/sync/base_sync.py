from abc import ABC, abstractmethod


class BaseSync(ABC):
    @abstractmethod
    def sync_data(self) -> None:
        pass
