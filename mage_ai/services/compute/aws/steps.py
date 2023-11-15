import os
from enum import Enum
from typing import List

import requests

from mage_ai.services.aws.emr.constants import SECURITY_GROUP_NAME_MASTER_DEFAULT
from mage_ai.services.compute.aws.constants import (
    CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
    CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
)
from mage_ai.services.compute.constants import ComputeManagementApplicationTab
from mage_ai.services.compute.models import (
    ComputeService,
    ErrorMessage,
    SetupStep,
    SetupStepStatus,
)

CUSTOM_TCP_PORT = 8998

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
    AWS_ACCESS_KEY_ID = CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY = CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY
    CREDENTIALS = 'credentials'
    IAM_PROFILE = 'iam_instance_profile'
    PERMISSIONS = 'permissions'
    REMOTE_VARIABLES_DIR = 'remote_variables_dir'
    SECURITY_GROUP_INBOUND_RULE_TCP = 'security_group_inbound_rule_tcp'
    SETUP = 'setup'


def build_credentials(compute_service: ComputeService) -> SetupStep:
    valid_key = True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False
    valid_secret = True if os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY) else False

    status = SetupStepStatus.INCOMPLETE
    try:
        compute_service.clusters_and_metadata()
        status = SetupStepStatus.COMPLETED
    except Exception:
        status = SetupStepStatus.ERROR

    return SetupStep.load(
        name=SetupStepUUID.CREDENTIALS.capitalize(),
        description='Setup connection credentials.',
        steps=[
            SetupStep.load(
                name='Access key ID',
                # error=ERROR_MESSAGE_ACCESS_KEY_ID if not valid_key else None,
                status=SetupStepStatus.COMPLETED if valid_key else None,
                tab=ComputeManagementApplicationTab.SETUP,
                uuid=SetupStepUUID.AWS_ACCESS_KEY_ID,
            ),
            SetupStep.load(
                name='Secret access key',
                # error=ERROR_MESSAGE_SECRET_ACCESS_KEY if not valid_secret else None,
                status=SetupStepStatus.COMPLETED if valid_secret else None,
                tab=ComputeManagementApplicationTab.SETUP,
                uuid=SetupStepUUID.AWS_SECRET_ACCESS_KEY,
            ),
            SetupStep.load(
                name='IAM instance profile',
                tab=ComputeManagementApplicationTab.SETUP,
                uuid=SetupStepUUID.IAM_PROFILE,
            ),
        ],
        status=status,
        tab=ComputeManagementApplicationTab.SETUP,
        uuid=SetupStepUUID.CREDENTIALS,
    )


def build_setup(compute_service: ComputeService) -> SetupStep:
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
        name=SetupStepUUID.SETUP.capitalize(),
        description='Configure compute service.',
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
        uuid=SetupStepUUID.SETUP,
    )


def build_permissions(compute_service: ComputeService) -> SetupStep:
    master_security_group_name = SECURITY_GROUP_NAME_MASTER_DEFAULT
    if compute_service.project.emr_config and \
            compute_service.project.emr_config.get('master_security_group'):

        master_security_group_name = compute_service.project.emr_config.get('master_security_group')

    status = SetupStepStatus.INCOMPLETE
    cluster = compute_service.active_cluster()
    if cluster and cluster.master_public_dns_name:
        try:
            response = requests.get(
                f'http://{cluster.master_public_dns_name}:{CUSTOM_TCP_PORT}',
                timeout=3,
            )
            if response.status_code == 200:
                status = SetupStepStatus.COMPLETED
        except (requests.exceptions.ConnectionError, requests.exceptions.ConnectTimeout) as err:
            print(f'[WARNING] AWS EMR create tunnel: {err}')
            status = SetupStepStatus.ERROR

    return SetupStep.load(
        name=SetupStepUUID.PERMISSIONS.capitalize(),
        description='Add inbound rules to the '
                    f'security group named “{master_security_group_name}” '
                    'in order to connect to the AWS EMR Master Node '
                    'from your current IP address.',
        steps=[
            SetupStep.load(
                name=f'Custom TCP port {CUSTOM_TCP_PORT}',
                description=f'Add an inbound rule for Custom TCP port {CUSTOM_TCP_PORT} '
                            'from your current IP address (e.g. My IP) '
                            f'to the security group named “{master_security_group_name}”.',
                status=status,
                uuid=SetupStepUUID.SECURITY_GROUP_INBOUND_RULE_TCP,
            ),
            # SetupStep.load(
            #     name='SSH port 22',
            #     description='Add an inbound rule for SSH port 22 '
            #                 'from your current IP address (e.g. My IP) '
            #                 f'to the security group named “{master_security_group_name}”.',
            #     required=False,
            #     uuid='ssh_22',
            # ),
        ],
        status=status,
        uuid=SetupStepUUID.PERMISSIONS,
    )


def build_steps(compute_service: ComputeService) -> List[SetupStep]:
    return [
        build_credentials(compute_service=compute_service),
        build_setup(compute_service=compute_service),
        build_permissions(compute_service=compute_service),
    ]
