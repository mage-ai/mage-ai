import os
from dataclasses import dataclass, field
from typing import Dict, List, Union

from mage_ai.server.active_kernel import restart_kernel, start_kernel
from mage_ai.services.aws.emr.emr import list_clusters
from mage_ai.services.compute.aws.constants import (
    CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
    CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
    INVALID_STATES,
    ClusterStatusState,
)
from mage_ai.services.compute.aws.steps import build_connections, build_steps
from mage_ai.services.compute.models import (
    ComputeConnection,
    ComputeService,
    ConnectionCredential,
    ErrorMessage,
    SetupStep,
)
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.ssh.aws.emr.utils import cluster_info_from_tunnel
from mage_ai.shared.array import find
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

    def to_dict(self, **kwargs) -> Dict:
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
    ec2_instance_attributes: Ec2InstanceAttributes = None
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

    @property
    def ready(self) -> bool:
        return self.state and self.state in [
            ClusterStatusState.RUNNING,
            ClusterStatusState.WAITING,
        ]

    @property
    def has_dns_name(self) -> bool:
        return self.ready or self.state in [
            ClusterStatusState.BOOTSTRAPING,
        ]

    @property
    def connection_value_score(self) -> int:
        if ClusterStatusState.WAITING == self.state:
            return 3
        elif ClusterStatusState.RUNNING == self.state:
            return 2
        elif ClusterStatusState.STARTING == self.state:
            return 1
        elif ClusterStatusState.BOOTSTRAPPING == self.state:
            return 0
        return -1

    @property
    def invalid(self) -> bool:
        return self.state in INVALID_STATES

    @property
    def valid(self) -> bool:
        return not self.invalid

    @property
    def created_at(self) -> bool:
        if self.status and self.status.timeline:
            return self.status.timeline.creation_date_time

    @property
    def state(self) -> ClusterStatusState:
        if self.status:
            return self.status.state

    def to_dict(self, **kwargs) -> Dict:
        return merge_dict(super().to_dict(), dict(
            ready=self.ready,
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

    def activate_cluster(self, cluster_id: str = None, discover: bool = False, **kwargs) -> Cluster:
        from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager

        cluster_to_activate = None

        # Set active based on this priority:
        # 1. Cluster that is being used in the SSH tunnel
        # 2. EMR cluster manager’s active cluster ID
        # 3. The most recently launched cluster.

        if cluster_id is not None:
            cluster = self.get_cluster_details(cluster_id)
            if cluster.valid:
                cluster_to_activate = cluster

        if not cluster_to_activate:
            cluster_info = cluster_info_from_tunnel()
            if cluster_info:
                cluster = Cluster.load(**cluster_info)
                cluster = self.get_cluster_details(cluster.id)
                if cluster.valid:
                    cluster_to_activate = cluster

        clusters = None
        if discover:
            result = self.clusters_and_metadata(deserialize=False)
            clusters = result.get('clusters') if result else []

        if clusters:
            if not cluster_to_activate:
                active_cluster_id = emr_cluster_manager.active_cluster_id
                if active_cluster_id:
                    cluster = find(
                        lambda cluster, id_check=active_cluster_id: cluster.id == id_check,
                        clusters,
                    )
                    if cluster.valid:
                        cluster_to_activate = cluster

            if not cluster_to_activate:
                cluster = sorted(
                    clusters,
                    key=lambda cluster: (
                        cluster.connection_value_score,
                        cluster.created_at,
                    ),
                    reverse=True,
                )[0]
                if cluster.valid:
                    cluster_to_activate = cluster

        if cluster_to_activate:
            return self.update_cluster(cluster_to_activate.id, payload=dict(active=True))

    def active_cluster(self, **kwargs) -> Cluster:
        from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager

        active_cluster_id = emr_cluster_manager.active_cluster_id
        if not active_cluster_id:
            return

        cluster = self.get_cluster_details(active_cluster_id)

        if not cluster.invalid:
            return cluster

    def terminate_clusters(self, cluster_ids: List[str]) -> None:
        # from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
        from mage_ai.services.aws.emr.emr import terminate_clusters

        terminate_clusters(cluster_ids)

        cluster_info = cluster_info_from_tunnel()
        if cluster_info and cluster_info.get('id') in cluster_ids:
            from mage_ai.services.ssh.aws.emr.models import close_tunnel

            close_tunnel()

        # if emr_cluster_manager.active_cluster_id in cluster_ids:
        #     emr_cluster_manager.set_active_cluster(remove_active_cluster=True)

    def update_cluster(self, cluster_id: str, payload: Dict) -> Cluster:
        if payload.get('active'):
            from mage_ai.cluster_manager.aws.emr_cluster_manager import (
                emr_cluster_manager,
            )

            cluster = self.get_cluster_details(cluster_id)
            if not cluster:
                return

            emr_cluster_manager.set_active_cluster(cluster_id=cluster_id)

            # If the kernel isn’t restarted after setting a cluster as active,
            # the notebook won’t be able to connect to the remote cluster.
            try:
                restart_kernel()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    start_kernel()

            return cluster

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

    def clusters_and_metadata(
        self,
        deserialize: bool = True,
        include_all_states: bool = False,
        **kwargs,
    ) -> Dict:
        from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager

        cluster_states = [
            ClusterStatusState.BOOTSTRAPPING,
            ClusterStatusState.RUNNING,
            ClusterStatusState.STARTING,
            ClusterStatusState.TERMINATING,
            ClusterStatusState.WAITING,
        ]

        if include_all_states:
            cluster_states.extend([
                ClusterStatusState.TERMINATED,
                ClusterStatusState.TERMINATED_WITH_ERRORS,
            ])

        response = list_clusters(cluster_states=cluster_states)

        clusters = []
        for model in response.get('Clusters') or []:
            cluster = Cluster.load(**model)
            cluster.active = emr_cluster_manager.active_cluster_id == cluster.id
            clusters.append(cluster)

        clusters = sorted(clusters, key=lambda cluster: cluster.created_at, reverse=True)

        metadata = response.get('ResponseMetadata')
        metadata = Metadata.load(**metadata) if metadata else None

        return dict(
            clusters=[m.to_dict() if deserialize else m for m in clusters],
            metadata=metadata.to_dict() if metadata else None,
        )

    def connection_credentials(self) -> List[ConnectionCredential]:
        key = os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID)
        # valid_key = True if key else False
        key = ConnectionCredential.load(
            description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID}',
            name='Access key ID',
            # error=ERROR_MESSAGE_ACCESS_KEY_ID if not valid_key else None,
            required=False,
            valid=True,
            value='*' * len(key) if key else 'Empty',
            uuid=CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
        )

        secret = os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY)
        # valid_secret = True if secret else False
        secret = ConnectionCredential.load(
            description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY}',
            name='Secret access key',
            # error=ERROR_MESSAGE_SECRET_ACCESS_KEY if not valid_secret else None,
            required=False,
            valid=True,
            value='*' * len(secret) if secret else 'Empty',
            uuid=CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
        )

        return [
            key,
            secret,
        ]

    def compute_connections(self) -> List[ComputeConnection]:
        return build_connections(compute_service=self)

    def setup_steps(self) -> List[SetupStep]:
        return build_steps(compute_service=self)
