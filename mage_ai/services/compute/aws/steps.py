import os
import socket
from enum import Enum
from typing import List

import requests

from mage_ai.services.aws.emr.constants import SECURITY_GROUP_NAME_MASTER_DEFAULT
from mage_ai.services.compute.aws.constants import (
    CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
    CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
)
from mage_ai.services.compute.constants import (
    CUSTOM_TCP_PORT,
    SSH_PORT,
    ComputeConnectionActionUUID,
    ComputeConnectionState,
    ComputeManagementApplicationTab,
)
from mage_ai.services.compute.models import (
    ComputeConnection,
    ComputeConnectionAction,
    ComputeService,
    ErrorMessage,
    SetupStep,
    SetupStepStatus,
)
from mage_ai.services.ssh.aws.emr.constants import SSH_DEFAULTS
from mage_ai.shared.hash import extract, merge_dict

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


class SetupStepUUID(str, Enum):
    ACTIVATE_CLUSTER = 'activate_cluster'
    AWS_ACCESS_KEY_ID = CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY = CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY
    CLUSTER_CONNECTION = 'cluster_connection'
    CONFIGURE = 'configure'
    CREDENTIALS = 'credentials'
    EC2_KEY_NAME = 'ec2_key_name'
    EC2_KEY_PAIR = 'ec2_key_pair'
    EC2_KEY_PATH = 'ec2_key_path'
    IAM_PROFILE = 'iam_instance_profile'
    LAUNCH_CLUSTER = 'launch_cluster'
    OBSERVABILITY = 'observability'
    PERMISSIONS = 'permissions'
    PERMISSIONS_SSH = 'permissions_ssh'
    REMOTE_VARIABLES_DIR = 'remote_variables_dir'
    SETUP = 'setup'


def build_credentials(
    compute_service: ComputeService,
    clusters: List = None,
    clusters_error=None,
) -> SetupStep:
    valid_key = True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False
    valid_secret = True if os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY) else False

    if clusters_error is None:
        if clusters is None:
            status = SetupStepStatus.INCOMPLETE
        else:
            status = SetupStepStatus.COMPLETED
    else:
        status = SetupStepStatus.ERROR

    return SetupStep.load(
        name=SetupStepUUID.CREDENTIALS.capitalize(),
        description='Setup connection credentials.',
        steps=[
            SetupStep.load(
                name='Access key ID',
                description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID}.',
                # error=ERROR_MESSAGE_ACCESS_KEY_ID if not valid_key else None,
                status=SetupStepStatus.COMPLETED if valid_key else None,
                tab=ComputeManagementApplicationTab.SETUP,
                uuid=SetupStepUUID.AWS_ACCESS_KEY_ID,
            ),
            SetupStep.load(
                name='Secret access key',
                description=f'Environment variable {CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY}.',
                # error=ERROR_MESSAGE_SECRET_ACCESS_KEY if not valid_secret else None,
                status=SetupStepStatus.COMPLETED if valid_secret else None,
                tab=ComputeManagementApplicationTab.SETUP,
                uuid=SetupStepUUID.AWS_SECRET_ACCESS_KEY,
            ),
            SetupStep.load(
                name='IAM instance profile',
                description='The IAM profile used by the service running Mage.',
                tab=ComputeManagementApplicationTab.SETUP,
                uuid=SetupStepUUID.IAM_PROFILE,
            ),
        ],
        status=status,
        tab=ComputeManagementApplicationTab.SETUP,
        uuid=SetupStepUUID.CREDENTIALS,
    )


def build_configure(compute_service: ComputeService) -> SetupStep:
    error_message = None
    remote_variables_dir_status = SetupStepStatus.INCOMPLETE
    if compute_service.project.remote_variables_dir:
        if compute_service.project.remote_variables_dir.startswith('s3://'):
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

    return SetupStep.load(
        name=SetupStepUUID.CONFIGURE.replace('_', ' ').capitalize(),
        description='Configure and connect to compute service.',
        steps=[
            SetupStep.load(
                name='Remote variables directory',
                description='Set the Amazon S3 bucket.',
                error=error_message,
                status=remote_variables_dir_status,
                tab=ComputeManagementApplicationTab.SETUP,
                uuid=SetupStepUUID.REMOTE_VARIABLES_DIR,
            ),
        ],
        tab=ComputeManagementApplicationTab.SETUP,
        uuid=SetupStepUUID.CONFIGURE,
    )


def build_launch_cluster(
    compute_service: ComputeService,
    clusters: List = None,
) -> SetupStep:
    if clusters is None:
        status = SetupStepStatus.ERROR
    elif len(clusters) == 0:
        status = SetupStepStatus.INCOMPLETE
    elif len(clusters) >= 1:
        status = SetupStepStatus.COMPLETED

    return SetupStep.load(
        name=SetupStepUUID.LAUNCH_CLUSTER.replace('_', ' ').capitalize(),
        description='Launch at least 1 cluster.',
        status=status,
        tab=ComputeManagementApplicationTab.CLUSTERS,
        uuid=SetupStepUUID.LAUNCH_CLUSTER,
    )


def build_activate_cluster(
    compute_service: ComputeService,
    active_cluster=None,
    active_cluster_error=None,
) -> SetupStep:
    if active_cluster_error is None:
        if active_cluster is None:
            status = SetupStepStatus.INCOMPLETE
        else:
            status = SetupStepStatus.COMPLETED
    else:
        status = SetupStepStatus.ERROR

    return SetupStep.load(
        name=SetupStepUUID.ACTIVATE_CLUSTER.replace('_', ' ').capitalize(),
        description='Activate a cluster to use it for compute.',
        status=status,
        tab=ComputeManagementApplicationTab.CLUSTERS,
        uuid=SetupStepUUID.ACTIVATE_CLUSTER,
    )


def build_permissions(compute_service: ComputeService, active_cluster=None) -> SetupStep:
    master_security_group_name = SECURITY_GROUP_NAME_MASTER_DEFAULT
    if compute_service.project.emr_config and \
            compute_service.project.emr_config.get('master_security_group'):

        master_security_group_name = compute_service.project.emr_config.get('master_security_group')

    status = SetupStepStatus.INCOMPLETE
    if active_cluster and active_cluster.master_public_dns_name:
        try:
            url = f'http://{active_cluster.master_public_dns_name}:{CUSTOM_TCP_PORT}'
            response = requests.get(
                url,
                timeout=3,
            )
            if response.status_code == 200:
                status = SetupStepStatus.COMPLETED
        except (requests.exceptions.ConnectionError, requests.exceptions.ConnectTimeout) as err:
            print(f'[WARNING] Cannot connect to {url}: {err}')
            status = SetupStepStatus.ERROR

    return SetupStep.load(
        name=SetupStepUUID.PERMISSIONS.capitalize(),
        description=f'Add an inbound rule for Custom TCP port {CUSTOM_TCP_PORT} to the '
                    f'security group named “{master_security_group_name}” '
                    'in order to connect to the AWS EMR Master Node '
                    'from your current IP address.',
        status=status,
        tab=ComputeManagementApplicationTab.RESOURCES,
        uuid=SetupStepUUID.PERMISSIONS,
    )


def build_steps(compute_service: ComputeService) -> List[SetupStep]:
    clusters = None
    clusters_error = None
    try:
        result = compute_service.clusters_and_metadata(deserialize=False)
        clusters = result.get('clusters')
        if clusters:
            clusters = [cluster for cluster in clusters if cluster.valid]
    except Exception as err:
        clusters_error = err

    active_cluster = None
    active_cluster_error = None
    try:
        active_cluster = compute_service.active_cluster()
    except Exception as err:
        active_cluster_error = err

    return [
        SetupStep.load(
            name=SetupStepUUID.SETUP.capitalize(),
            group=True,
            steps=[
                build_credentials(
                    compute_service=compute_service,
                    clusters=clusters,
                    clusters_error=clusters_error,
                ),
                build_configure(compute_service=compute_service),
            ],
            uuid=SetupStepUUID.SETUP,
        ),
        SetupStep.load(
            name=SetupStepUUID.CLUSTER_CONNECTION.replace('_', ' ').capitalize(),
            group=True,
            steps=[
                build_launch_cluster(compute_service=compute_service, clusters=clusters),
                build_activate_cluster(
                    compute_service=compute_service,
                    active_cluster=active_cluster,
                    active_cluster_error=active_cluster_error,
                ),
                build_permissions(
                    compute_service=compute_service,
                    active_cluster=active_cluster,
                ),
            ],
            uuid=SetupStepUUID.CLUSTER_CONNECTION,
        ),
    ]


def build_ssh_permissions(compute_service: ComputeService, active_cluster=None) -> SetupStep:
    master_security_group_name = SECURITY_GROUP_NAME_MASTER_DEFAULT
    if compute_service.project.emr_config and \
            compute_service.project.emr_config.get('master_security_group'):

        master_security_group_name = compute_service.project.emr_config.get('master_security_group')

    error = None
    status = SetupStepStatus.INCOMPLETE
    if active_cluster and active_cluster.master_public_dns_name:
        timeout = 5
        try:
            test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            test_socket.settimeout(timeout)
            test_socket.connect((active_cluster.master_public_dns_name, SSH_PORT))
            status = SetupStepStatus.COMPLETED
        except Exception as err:
            url = f'{active_cluster.master_public_dns_name}:{SSH_PORT}'
            error = ErrorMessage.load(
                message=f'Cannot establish SSH access to {{{{{url}}}}} after {{{{{timeout}}}}} '
                        f'seconds: {err}',
                variables={
                    timeout: dict(
                        bold=True,
                        monospace=True,
                    ),
                    url: dict(
                        bold=True,
                        monospace=True,
                    ),
                },
            )
            status = SetupStepStatus.ERROR
        else:
            test_socket.close()

    return SetupStep.load(
        name='Security group inbound rule SSH port 22',
        description=f'Add an inbound rule for SSH port {SSH_PORT} to the '
                    f'security group named “{master_security_group_name}” '
                    'in order to connect to create an SSH tunnel between the current machine and '
                    'the master node.',
        error=error,
        required=True,
        status=status,
        uuid=SetupStepUUID.PERMISSIONS_SSH,
    )


def build_connections(compute_service: ComputeService) -> List[ComputeConnection]:
    ec2_key_name = None
    ec2_key_name_display = ''
    ec2_key_path = None
    if compute_service.project.emr_config:
        ec2_key_name = compute_service.project.emr_config.get('ec2_key_name')
        ec2_key_path = compute_service.project.emr_config.get('ec2_key_path')
        if ec2_key_name:
            ec2_key_name_display = f'{ec2_key_name} '

    active_cluster = None
    active_cluster_error = None
    try:
        active_cluster = compute_service.active_cluster()
    except Exception as err:
        active_cluster_error = err

    actions = []
    attributes = merge_dict(SSH_DEFAULTS, dict(
        ec2_key_name=ec2_key_name,
        ec2_key_path=ec2_key_path,
        master_public_dns_name=None,
    ))
    error = None
    state = None
    status = None
    ssh_tunnel_active = False

    if active_cluster:
        from mage_ai.services.ssh.aws.emr.models import SSHTunnel

        attributes['master_public_dns_name'] = active_cluster.master_public_dns_name
        state = ComputeConnectionState.INACTIVE

        ssh_tunnel = SSHTunnel()
        try:
            if ssh_tunnel:
                attributes.update(ssh_tunnel.to_dict())
                ssh_tunnel_active = ssh_tunnel.is_active()
                if ssh_tunnel_active:
                    state = ComputeConnectionState.ACTIVE
        except Exception as err:
            error = ErrorMessage.load(
                message=f'SSH tunnel failed to connect: {err}.',
            )
            status = SetupStepStatus.ERROR

    step1 = SetupStep.load(
        name='EC2 key pair',
        description='Create and use an EC2 key pair when launching a cluster.',
        required=True,
        steps=[
            SetupStep.load(
                name='EC2 key name',
                description='The name of the EC2 key pair that is used when '
                            'launching a cluster.',
                required=True,
                status=(
                    SetupStepStatus.COMPLETED if ec2_key_name
                    else SetupStepStatus.INCOMPLETE
                ),
                tab=ComputeManagementApplicationTab.RESOURCES,
                uuid=SetupStepUUID.EC2_KEY_NAME,
            ),
            SetupStep.load(
                name='EC2 key path',
                description='The absolute file path to the EC2 key pair '
                            f'{ec2_key_name_display}stored on the current machine.',
                required=True,
                status=(
                    SetupStepStatus.COMPLETED if ec2_key_path
                    else SetupStepStatus.INCOMPLETE
                ),
                tab=ComputeManagementApplicationTab.RESOURCES,
                uuid=SetupStepUUID.EC2_KEY_PATH,
            ),
        ],
        tab=ComputeManagementApplicationTab.RESOURCES,
        uuid=SetupStepUUID.EC2_KEY_PAIR,
    )
    step2 = build_activate_cluster(
        compute_service=compute_service,
        active_cluster=active_cluster,
        active_cluster_error=active_cluster_error,
    )
    step3 = build_ssh_permissions(
        compute_service=compute_service,
        active_cluster=active_cluster,
    )

    step_final = ComputeConnection.load(
        actions=actions,
        attributes=attributes,
        connection=extract(active_cluster.to_dict(), [
            'id',
            'name',
            'normalized_instance_hours',
            'state',
        ]) if active_cluster else None,
        description='Enable access to Spark applications running on the master node and '
                    'view the status and progress of code execution.',
        error=error,
        group=True,
        name='Compute observability',
        required=True,
        state=state,
        status=status,
        steps=[
            step1,
            step2,
            step3,
        ],
        tab=ComputeManagementApplicationTab.MONITORING,
        uuid=SetupStepUUID.OBSERVABILITY,
    )

    if SetupStepStatus.COMPLETED == step_final.status_calculated():
        if ssh_tunnel_active:
            step_final.actions = [
                ComputeConnectionAction.load(
                    name='Stop SSH tunnel connection',
                    description='Stop the current SSH tunnel for current active cluster.',
                    uuid=ComputeConnectionActionUUID.DESELECT,
                ),
                ComputeConnectionAction.load(
                    name='Close SSH tunnel',
                    description='Close current SSH tunnel and remove SSH tunnel settings '
                                'for current active cluster.',
                    uuid=ComputeConnectionActionUUID.DELETE,
                ),
            ]
        else:
            step_final.actions = [
                ComputeConnectionAction.load(
                    name='Create SSH tunnel',
                    description='Start the SSH tunnel between the local machine and '
                                'remote active cluster. '
                                'This process can take up to 60 seconds to complete because the '
                                'Mage application needs to refresh, '
                                'please wait until the page updates or an error is raised.',
                    uuid=ComputeConnectionActionUUID.CREATE,
                ),
            ]

    return [
        step_final,
    ]
