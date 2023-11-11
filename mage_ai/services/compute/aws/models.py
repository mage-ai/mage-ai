import os
from dataclasses import dataclass, field
from typing import Dict, List, Union

from mage_ai.services.aws.emr.emr import list_clusters
from mage_ai.services.compute.aws.constants import (
    CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
    CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
    ClusterStatusState,
)
from mage_ai.services.compute.models import (
    ComputeService,
    ConnectionCredential,
    ErrorMessage,
    SetupStep,
    SetupStepStatus,
)
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.models import BaseDataClass


@dataclass
class StateChangeReason(BaseDataClass):
    code: str = None
    message: str = None


@dataclass
class ClusterStatusTimeline(BaseDataClass):
    creation_date_time: str = None  # 2023-11-10T20:38:47.350000+00:00
    end_date_time: str = None  # 2023-11-10T20:38:47.350000+00:00
    ready_date_time: str = None  # 2023-11-10T20:38:47.350000+00:00


@dataclass
class ErrorDetails(BaseDataClass):
    error_code: str = None
    error_data: List[Dict] = field(default_factory=list)
    error_message: str = None


@dataclass
class ClusterStatus(BaseDataClass):
    error_details: ErrorDetails = None
    state: ClusterStatusState = None
    state_change_reason: StateChangeReason = None
    timeline: ClusterStatusTimeline = None

    def __post_init__(self):
        if self.error_details and isinstance(self.error_details, dict):
            self.error_details = ErrorDetails.load(**self.error_details)

        if self.state and isinstance(self.state, str):
            self.state = ClusterStatusState(self.state)

        if self.state_change_reason and isinstance(self.state_change_reason, dict):
            self.state_change_reason = StateChangeReason.load(**self.state_change_reason)

        if self.timeline and isinstance(self.timeline, dict):
            self.timeline = ClusterStatusTimeline.load(**self.timeline)

    def to_dict(self) -> Dict:
        return merge_dict(super().to_dict(), dict(
            error_details=self.error_details.to_dict() if self.error_details else None,
            state_change_reason=(
                self.state_change_reason.to_dict() if self.state_change_reason else None
            ),
            timeline=self.timeline.to_dict() if self.timeline else None,
        ))


@dataclass
class Ec2InstanceAttributes(BaseDataClass):
    additional_master_security_groups: List[str] = field(default_factory=list)
    additional_slave_security_groups: List[str] = field(default_factory=list)
    ec2_availability_zone: str = None
    ec2_subnet_id: str = None
    emr_managed_master_security_group: str = None
    emr_managed_slave_security_group: str = None
    iam_instance_profile: str = None
    requested_ec2_availability_zones: List[str] = field(default_factory=list)
    requested_ec2_subnet_ids: List[str] = field(default_factory=list)
    service_access_security_group: str = None


@dataclass
class ClusterApplication(BaseDataClass):
    name: str = None
    version: str = None


@dataclass
class ClusterTag(BaseDataClass):
    key: str = None
    value: str = None


@dataclass
class ClusterConfiguration(BaseDataClass):
    classification: str = None
    configurations: Dict = field(default_factory=dict)
    properties: Dict = field(default_factory=dict)

    # def __post_init__(self):
    #     self.serialize_attribute_class('configurations', self.__class__)


@dataclass
class KerberosAttributes(BaseDataClass):
    a_d_domain_join_password: str = None
    a_d_domain_join_user: str = None
    cross_realm_trust_principal_password: str = None
    kdc_admin_password: str = None
    realm: str = None


@dataclass
class PlacementGroups(BaseDataClass):
    instance_role: str = None
    placement_strategy: str = None


@dataclass
class Cluster(BaseDataClass):
    active: bool = False
    applications: List[ClusterApplication] = field(default_factory=list)
    auto_terminate: bool = None
    # arn:aws:elasticmapreduce:us-west-2:679849156117:cluster/j-1MR4C0R54EUHY
    cluster_arn: str = None
    configurations: List[ClusterConfiguration] = field(default_factory=list)
    ebs_root_volume_size: int = None
    ec2_instance_attributes: Dict = None
    id: str = None  # j-1MR4C0R54EUHY
    instance_collection_type: str = None
    kerberos_attributes: Dict = None
    log_uri: str = None
    master_public_dns_name: str = None
    name: str = None  # 2023-11-09T07:23:39.142404-mage-data-preparation
    normalized_instance_hours: int = None  # 0
    o_s_release_label: str = None
    placement_groups: List[PlacementGroups] = field(default_factory=list)
    release_label: str = None
    scale_down_behavior: str = None
    service_role: str = None
    status: ClusterStatus = None
    step_concurrency_level: int = None
    tags: List[ClusterTag] = field(default_factory=list)
    termination_protected: bool = None
    visible_to_all_users: bool = None

    def __post_init__(self):
        self.serialize_attribute_class('ec2_instance_attributes', Ec2InstanceAttributes)
        self.serialize_attribute_class('kerberos_attributes', KerberosAttributes)
        self.serialize_attribute_class('status', ClusterStatus)
        self.serialize_attribute_classes('applications', ClusterApplication)
        self.serialize_attribute_classes('configurations', ClusterConfiguration)
        self.serialize_attribute_classes('placement_groups', PlacementGroups)
        self.serialize_attribute_classes('tags', ClusterTag)


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


ERROR_MESSAGE_ACCESS_KEY_ID = ErrorMessage.load(
    message='Environment variable '
            f'{{{{{CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID}}}}} '
            'is missing',
    variables={
        CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID: dict(
            monospace=True,
            muted=True,
        ),
    },
)

ERROR_MESSAGE_SECRET_ACCESS_KEY = ErrorMessage.load(
    message='Environment variable '
            f'{{{{{CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY}}}}} '
            'is missing',
    variables={
        CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY: dict(
            monospace=True,
            muted=True,
        ),
    },
)


class AWSEMRComputeService(ComputeService):
    uuid = ComputeServiceUUID.AWS_EMR

    def terminate_clusters(self, cluster_ids: List[str]) -> None:
        from mage_ai.services.aws.emr.emr import terminate_clusters

        terminate_clusters(cluster_ids)

    def update_cluster(self, cluster_id: str, payload: Dict) -> Cluster:
        if payload.get('active'):
            from mage_ai.cluster_manager.aws.emr_cluster_manager import (
                emr_cluster_manager,
            )

            emr_cluster_manager.set_active_cluster(cluster_id)

            return self.get_cluster_details(cluster_id)

    def create_cluster(self, **kwargs) -> Cluster:
        from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager

        result = emr_cluster_manager.create_cluster()

        if result and 'cluster_id' in result:
            cluster_id = result.get('cluster_id')

            return self.get_cluster_details(cluster_id)

    def get_cluster_details(self, cluster_id, **kwargs) -> Union[Cluster, Dict]:
        from mage_ai.services.aws.emr.emr import describe_cluster

        cluster = describe_cluster(cluster_id)
        if cluster:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import (
                emr_cluster_manager,
            )

            cluster = Cluster.load(**cluster)
            cluster.active = emr_cluster_manager.active_cluster_id == cluster.id

        return cluster

    def clusters_and_metadata(self, **kwargs) -> Dict:
        from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager

        # For testing only
        # response = list_clusters(cluster_states=[
        #     ClusterStatusState.BOOTSTRAPPING,
        #     ClusterStatusState.RUNNING,
        #     ClusterStatusState.STARTING,
        #     ClusterStatusState.TERMINATED,
        #     ClusterStatusState.TERMINATED_WITH_ERRORS,
        #     ClusterStatusState.TERMINATING,
        #     ClusterStatusState.WAITING,
        # ])

        response = list_clusters()

        clusters = []
        for model in response.get('Clusters') or []:
            cluster = Cluster.load(**model)
            cluster.active = emr_cluster_manager.active_cluster_id == cluster.id
            clusters.append(cluster)

        metadata = response.get('ResponseMetadata')
        metadata = Metadata.load(**metadata) if metadata else None

        return dict(
            clusters=[m.to_dict() for m in clusters],
            metadata=metadata.to_dict() if metadata else None,
        )

    def connection_credentials(self) -> List[ConnectionCredential]:
        key = os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID)
        valid_key = True if key else False
        key = ConnectionCredential.load(
            description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID}',
            name='Access key ID',
            error=ERROR_MESSAGE_ACCESS_KEY_ID if not valid_key else None,
            required=True,
            valid=valid_key,
            value='*' * len(key) if key else None,
            uuid=CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
        )

        secret = os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY)
        valid_secret = True if secret else False
        secret = ConnectionCredential.load(
            description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY}',
            name='Secret access key',
            error=ERROR_MESSAGE_SECRET_ACCESS_KEY if not valid_secret else None,
            required=True,
            valid=valid_secret,
            value='*' * len(secret) if secret else None,
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
                    error=ERROR_MESSAGE_ACCESS_KEY_ID if not valid_key else None,
                    status=(
                        SetupStepStatus.COMPLETED if valid_key
                        else SetupStepStatus.INCOMPLETE
                    ),
                    uuid=CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
                ),
                SetupStep.load(
                    name='Secret access key',
                    error=ERROR_MESSAGE_SECRET_ACCESS_KEY if not valid_secret else None,
                    status=(
                        SetupStepStatus.COMPLETED if valid_secret
                        else SetupStepStatus.INCOMPLETE
                    ),
                    uuid=CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
                ),
            ],
            status=(
                SetupStepStatus.COMPLETED if valid_key and
                valid_secret else SetupStepStatus.INCOMPLETE
            ),
            tab='connection',
            uuid='credentials',
        ))

        error_message = None
        remote_variables_dir_status = SetupStepStatus.INCOMPLETE
        if self.project.remote_variables_dir:
            if self.project.remote_variables_dir.startswith('s3://'):
                remote_variables_dir_status = SetupStepStatus.COMPLETED
            else:
                remote_variables_dir_status = SetupStepStatus.ERROR
                error_message = ErrorMessage.load(
                    message='Remote variables directory must begin with: {{s3://}}',
                    variables={
                        's3://': dict(
                            monospace=True,
                            muted=True,
                        ),
                    },
                )

        arr.append(SetupStep.load(
            description='Set the Amazon S3 bucket.',
            error=error_message,
            name='Remote variables directory',
            status=remote_variables_dir_status,
            tab='connection',
            uuid='remote_variables_dir',
        ))

        return arr
