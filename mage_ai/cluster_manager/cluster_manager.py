from abc import ABC, abstractmethod


class ClusterManager(ABC):
    @abstractmethod
    def create_cluster(self):
        pass

    @abstractmethod
    def list_clusters(self):
        pass

    @abstractmethod
    def set_active_cluster(self, **kwargs):
        pass
