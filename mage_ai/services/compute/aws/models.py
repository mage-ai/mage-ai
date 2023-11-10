import os
from dataclasses import dataclass, field
from typing import Dict, List

from mage_ai.services.aws.emr.emr import list_clusters
from mage_ai.services.compute.aws.constants import (
    CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
    CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
)
from mage_ai.services.compute.models import (
    ComputeService,
    ConnectionCredential,
    ConnectionCredentialError,
    SetupStep,
    SetupStepStatus,
)
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.models import BaseDataClass


@dataclass
class ClusterStatusTimeline(BaseDataClass):
    creation_date_time: str = None  # 2023-11-10T20:38:47.350000+00:00


@dataclass
class ClusterStatus(BaseDataClass):
    state: str = None  # STARTING
    state_change_reason: Dict = field(default_factory=dict)
    timeline: ClusterStatusTimeline = None

    def __post_init__(self):
        if self.timeline and isinstance(self.timeline, dict):
            self.timeline = ClusterStatusTimeline.load(**self.timeline)

    def to_dict(self) -> Dict:
        return merge_dict(super().to_dict(), dict(
            timeline=self.timeline.to_dict() if self.timeline else None,
        ))


@dataclass
class Cluster(BaseDataClass):
    # arn:aws:elasticmapreduce:us-west-2:679849156117:cluster/j-1MR4C0R54EUHY
    cluster_arn: str = None
    id: str = None  # j-1MR4C0R54EUHY
    name: str = None  # 2023-11-09T07:23:39.142404-mage-data-preparation
    normalized_instance_hours: int = None  # 0
    status: ClusterStatus = None

    def __post_init__(self):
        if self.status and isinstance(self.status, dict):
            self.status = ClusterStatus.load(**self.status)

    def to_dict(self) -> Dict:
        return merge_dict(super().to_dict(), dict(
            status=self.status.to_dict() if self.status else None,
        ))


@dataclass
class Metadata(BaseDataClass):
    # {
    #     "x-amzn-requestid": "fcf809f2-2e6d-4606-8fe9-9bfe1f886ba7",
    #     "content-type": "application/x-amz-json-1.1",
    #     "content-length": "313",
    #     "date": "Fri, 10 Nov 2023 20:40:29 GMT"
    # }
    http_headers: Dict = field(default_factory=dict)
    http_status_code: int = None  # 200
    request_id: str = None
    retry_attempts: int = None  # 0


class AWSEMRComputeService(ComputeService):
    uuid = ComputeServiceUUID.AWS_EMR

    def clusters_and_metadata(self) -> Dict:
        response = list_clusters()

        clusters = [Cluster.load(**m) for m in response.get('Clusters') or []]
        metadata = response.get('ResponseMetadata')
        metadata = Metadata.load(**metadata) if metadata else None

        return dict(
            clusters=[m.to_dict() for m in clusters],
            metadata=metadata.to_dict() if metadata else None,
        )

    def connection_credentials(self) -> List[ConnectionCredential]:
        valid_key = True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False
        key = ConnectionCredential.load(
            description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID}',
            name='Access key ID',
            error=ConnectionCredentialError.load(
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
        secret = ConnectionCredential.load(
            description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY}',
            name='Secret access key',
            error=ConnectionCredentialError.load(
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

        return [
            key,
            secret,
        ]

    def setup_steps(self) -> List[SetupStep]:
        arr = []

        valid_key = True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False
        valid_secret = True if os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY) else False

        # How do we let the client know clicking a step will take them to the right place?
        arr.append(SetupStep.load(
            description='Setup connection credentials.',
            name='Credentials',
            steps=[
                SetupStep.load(
                    name='Access key ID',
                    status=(
                        SetupStepStatus.COMPLETED if valid_key
                        else SetupStepStatus.INCOMPLETE
                    ),
                ),
                SetupStep.load(
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

        arr.append(SetupStep.load(
            description='Set the Amazon S3 bucket.',
            name='Remote variables directory',
            status=remote_variables_dir_status,
        ))

        return arr
