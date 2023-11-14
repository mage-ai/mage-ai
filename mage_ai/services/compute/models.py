from abc import abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List

from mage_ai.data_preparation.models.project import Project
from mage_ai.services.compute.constants import ComputeManagementApplicationTab
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.models import BaseDataClass


@dataclass
class ErrorMessage(BaseDataClass):
    message: str
    variables: Dict = field(default_factory=dict)


@dataclass
class ConnectionCredential(BaseDataClass):
    uuid: str
    description: str = None
    error: ErrorMessage = None
    name: str = None
    required: bool = False
    valid: bool = False
    value: str = None

    def __post_init__(self):
        if self.error and isinstance(self.error, dict):
            self.error = ErrorMessage.load(**self.error)


class SetupStepStatus(str, Enum):
    COMPLETED = 'completed'
    ERROR = 'error'
    INCOMPLETE = 'incomplete'


@dataclass
class SetupStep(BaseDataClass):
    name: str
    uuid: str
    description: str = None
    error: ErrorMessage = None
    required: bool = True
    status: SetupStepStatus = None
    steps: List[SetupStepStatus] = field(default_factory=list)
    tab: ComputeManagementApplicationTab = None

    def __post_init__(self):
        if self.error and isinstance(self.error, dict):
            self.error = ErrorMessage.load(**self.error)

        if self.status and isinstance(self.status, str):
            self.status = SetupStepStatus(self.status)

        if self.steps and isinstance(self.steps, list):
            steps = []

            for step in self.steps:
                if isinstance(step, dict):
                    steps.append(SetupStep.load(**step))
                else:
                    steps.append(step)

            self.steps = steps

        if self.tab and isinstance(self.tab, str):
            self.tab = ComputeManagementApplicationTab(self.tab)

    def status_calculated(self) -> SetupStepStatus:
        if self.status:
            return self.status

        if self.steps:
            if all([
                not step.required or SetupStepStatus.COMPLETED == step.status
                for step in self.steps
            ]):
                return SetupStepStatus.COMPLETED

        return None

    def to_dict(self) -> Dict:
        return merge_dict(super().to_dict(), dict(
            status_calculated=self.status_calculated(),
        ))


class ComputeService:
    uuid = ComputeServiceUUID.STANDALONE_CLUSTER

    def __init__(self, project: Project, with_clusters: bool = False):
        self.project = project
        self.with_clusters = with_clusters

    @classmethod
    def build(self, project: Project, with_clusters: bool = False):
        service_class = self

        if project and project.spark_config:
            if project.emr_config:
                from mage_ai.services.compute.aws.models import AWSEMRComputeService

                service_class = AWSEMRComputeService

        return service_class(project=project, with_clusters=with_clusters)

    def to_dict(self) -> Dict:
        result = dict(
            connection_credentials=[m.to_dict() for m in self.connection_credentials()],
            setup_steps=[m.to_dict() for m in self.setup_steps()],
            uuid=self.uuid,
        )

        if self.with_clusters:
            result['clusters'] = self.clusters_and_metadata()

        return result

    @property
    def uuid(self) -> ComputeServiceUUID:
        return self.__class__.uuid

    @abstractmethod
    def active_cluster(self, **kwargs) -> Dict:
        pass

    @abstractmethod
    def activate_cluster(self, **kwargs) -> Dict:
        pass

    @abstractmethod
    def create_cluster(self, **kwargs) -> Dict:
        pass

    @abstractmethod
    def clusters_and_metadata(self, **kwargs) -> Dict:
        pass

    @abstractmethod
    def get_cluster_details(self, **kwargs) -> Dict:
        pass

    @abstractmethod
    def connection_credentials(self) -> List[ConnectionCredential]:
        pass

    @abstractmethod
    def setup_steps(self) -> List[SetupStep]:
        pass

    @abstractmethod
    def terminate_clusters(self, cluster_ids: List[str]) -> None:
        pass

    @abstractmethod
    def update_cluster(self, cluster_id: str, payload: Dict) -> Dict:
        pass
