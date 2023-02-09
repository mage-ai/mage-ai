from abc import ABC, abstractmethod
from typing import Dict, List


class BaseStorage(ABC):
    @abstractmethod
    def isdir(self, path: str) -> bool:
        """
        Check whether a path is a directory.
        """
        pass

    @abstractmethod
    def listdir(self, path: str, suffix: str = None) -> List[str]:
        """
        Get a list of files and directories in the specified directory.
        """
        pass

    @abstractmethod
    def makedirs(self, path: str, **kwargs) -> None:
        """
        Create new directories.
        """
        pass

    @abstractmethod
    def path_exists(self, path: str) -> bool:
        """
        Check whether a path exists.
        """
        pass

    @abstractmethod
    def remove(self, path: str) -> None:
        """
        Remove a file with file path.
        """
        pass

    @abstractmethod
    def remove_dir(self, path: str) -> None:
        """
        Remove a directory with directory path.
        """
        pass

    @abstractmethod
    def read_json_file(self, file_path: str, default_value={}) -> Dict:
        """
        Read json from a file with file path.
        """
        pass

    @abstractmethod
    async def read_json_file_async(self, file_path: str, default_value={}) -> Dict:
        """
        Read json from a file with file path asynchronously.
        """
        pass

    @abstractmethod
    def write_json_file(self, file_path: str, data) -> None:
        """
        Write json to a file with file path.
        """
        pass

    @abstractmethod
    async def write_json_file_async(self, file_path: str, data) -> None:
        """
        Write json to a file with file path asynchronously.
        """
        pass
