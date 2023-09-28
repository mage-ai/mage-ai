from abc import ABC, abstractmethod
from typing import Callable


class Queue(ABC):
    @abstractmethod
    def clean_up_jobs(self):
        pass

    @abstractmethod
    def enqueue(self, job_id: str, target: Callable, *args, **kwargs):
        pass

    @abstractmethod
    def has_job(self, job_id: str):
        pass

    @abstractmethod
    def kill_job(self, job_id: str):
        pass

    def _print(self, msg):
        print(f'[{self.__class__.__name__}] {msg}')
