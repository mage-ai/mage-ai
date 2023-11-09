import os
from dataclasses import asdict, dataclass
from typing import Dict, List

from mage_ai.data_preparation.models.project import Project
from mage_ai.services.compute.aws.constants import (
    CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
    CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
)
from mage_ai.services.spark.constants import ComputeServiceUUID


@dataclass
class ConnectionCredential:
    uuid: str
    name: str = None
    required: bool = False
    valid: bool = False
    value: str = None


class ComputeService:
    def __init__(self, project: Project):
        self.project = project

        self._uuid = None

    @property
    def uuid(self) -> ComputeServiceUUID:
        if self._uuid:
            return self._uuid

        if self.project.spark_config:
            if self.project.emr_config:
                self._uuid = ComputeServiceUUID.AWS_EMR
            else:
                self._uuid = ComputeServiceUUID.STANDALONE_CLUSTER

        return self._uuid

    def connection_credentials(self) -> List[ConnectionCredential]:
        arr = []
        if ComputeServiceUUID.AWS_EMR == self.uuid:
            arr += [
                ConnectionCredential(
                    name='Access key ID',
                    required=True,
                    valid=True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False,
                    uuid=CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
                ),
                ConnectionCredential(
                    name='Secret access key',
                    required=True,
                    valid=True if os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY) else False,
                    uuid=CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
                ),
            ]

        return arr

    def to_dict(self) -> Dict:
        return dict(
            connection_credentials=[asdict(m) for m in self.connection_credentials()],
            uuid=self.uuid,
        )
