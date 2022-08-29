from abc import ABC, abstractmethod
from typing import Dict, List


class BaseStorage(ABC):
    @abstractmethod
    def isdir(self, path: str) -> bool:
        pass

    @abstractmethod
    def listdir(self, path: str) -> List[str]:
        pass

    @abstractmethod
    def makedirs(self, path: str, **kwargs) -> None:
        pass

    @abstractmethod
    def path_exists(self, path: str) -> bool:
        pass

    @abstractmethod
    def remove(self, path: str) -> None:
        pass

    @abstractmethod
    def read_json_file(self, file_path: str, default_value={}) -> Dict:
        pass

    @abstractmethod
    def write_json_file(self, file_path: str, data) -> None:
        pass
