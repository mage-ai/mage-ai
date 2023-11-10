import os
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Dict, List

from mage_ai.data_preparation.models.project import Project
from mage_ai.services.compute.aws.constants import (
    CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
    CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
)
from mage_ai.services.spark.constants import ComputeServiceUUID


@dataclass
class ConnectionCredentialError:
    message: str
    variables: Dict = field(default_factory=dict)


@dataclass
class ConnectionCredential:
    uuid: str
    description: str = None
    error: ConnectionCredentialError = None
    name: str = None
    required: bool = False
    valid: bool = False
    value: str = None

    def __post_init__(self):
        if self.error and isinstance(self.error, dict):
            self.error = ConnectionCredentialError(**self.error)


class SetupStepStatus(str, Enum):
    COMPLETED = 'completed'
    ERROR = 'error'
    INCOMPLETE = 'incomplete'


@dataclass
class SetupStep:
    name: str
    description: str = None
    status: SetupStepStatus = SetupStepStatus.INCOMPLETE
    steps: List[SetupStepStatus] = field(default_factory=list)

    def __post_init__(self):
        if self.status and isinstance(self.status, str):
            self.status = SetupStepStatus(self.status)

        if self.steps and isinstance(self.steps, list):
            steps = []

            for step in self.steps:
                if isinstance(step, dict):
                    steps.append(SetupStep(**step))
                else:
                    steps.append(step)

            self.steps = steps


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
            valid_key = True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False
            key = ConnectionCredential(
                description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID}',
                name='Access key ID',
                error=ConnectionCredentialError(
                    message='Environment variable '
                            f'{{{{{CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID}}}}} '
                            'is missing',
                    variables={
                        CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID: dict(
                            monospace=True,
                            muted=True,
                        ),
                    },
                ) if not valid_key else None,
                required=True,
                valid=valid_key,
                uuid=CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
            )

            valid_secret = True if os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY) else False
            secret = ConnectionCredential(
                description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY}',
                name='Secret access key',
                error=ConnectionCredentialError(
                    message='Environment variable '
                            f'{{{{{CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY}}}}} '
                            'is missing',
                    variables={
                        CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY: dict(
                            monospace=True,
                            muted=True,
                        ),
                    },
                ) if not valid_secret else None,
                required=True,
                valid=valid_secret,
                uuid=CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
            )

            arr += [
                key,
                secret,
            ]

        return arr

    def setup_steps(self) -> List[SetupStep]:
        arr = []

        if ComputeServiceUUID.AWS_EMR == self.uuid:
            valid_key = True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False
            valid_secret = True if os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY) else False

            # How do we let the client know clicking a step will take them to the right place?
            arr.append(SetupStep(
                description='Setup connection credentials.',
                name='Credentials',
                steps=[
                    SetupStep(
                        name='Access key ID',
                        status=(
                            SetupStepStatus.COMPLETED if valid_key
                            else SetupStepStatus.INCOMPLETE
                        ),
                    ),
                    SetupStep(
                        name='Secret access key',
                        status=(
                            SetupStepStatus.COMPLETED if valid_secret
                            else SetupStepStatus.INCOMPLETE
                        ),
                    ),
                ],
                status=(
                    SetupStepStatus.COMPLETED if valid_key and
                    valid_secret else SetupStepStatus.INCOMPLETE
                ),
            ))

            remote_variables_dir_status = SetupStepStatus.INCOMPLETE
            if self.project.remote_variables_dir:
                if self.project.remote_variables_dir.startswith('s3://'):
                    remote_variables_dir_status = SetupStepStatus.COMPLETED
                else:
                    remote_variables_dir_status = SetupStepStatus.ERROR

            arr.append(SetupStep(
                description='Set the Amazon S3 bucket.',
                name='Remote variables directory',
                status=remote_variables_dir_status,
            ))

        return arr

    def to_dict(self) -> Dict:
        return dict(
            connection_credentials=[asdict(m) for m in self.connection_credentials()],
            setup_steps=[asdict(m) for m in self.setup_steps()],
            uuid=self.uuid,
        )
