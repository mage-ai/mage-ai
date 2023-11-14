# import os
# from enum import Enum
# from typing import List

# from mage_ai.services.compute.aws.constants import (
#     CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID,
#     CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY,
#     INVALID_STATES,
#     ClusterStatusState,
# )
# from mage_ai.services.compute.models import (
#     ComputeService,
#     ConnectionCredential,
#     ErrorMessage,
#     SetupStep,
#     SetupStepStatus,
# )


# class SetupStepUUID(str, Enum):
#     AWS_ACCESS_KEY_ID = CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID
#     AWS_SECRET_ACCESS_KEY = CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY
#     CREDENTIALS = 'credentials'


# def access_key_id_step() -> SetupStep:
#     valid_key = True if os.getenv(CONNECTION_CREDENTIAL_AWS_ACCESS_KEY_ID) else False

#     return SetupStep.load(
#         name='Access key ID',
#         error=ERROR_MESSAGE_ACCESS_KEY_ID if not valid_key else None,
#         status=(
#             SetupStepStatus.COMPLETED if valid_key
#             else SetupStepStatus.INCOMPLETE
#         ),
#         uuid=SetupStepUUID.AWS_ACCESS_KEY_ID,
#     )


# def build_steps() -> List[SetupStep]:
#     valid_secret = True if os.getenv(CONNECTION_CREDENTIAL_AWS_SECRET_ACCESS_KEY) else False

#     credentials_substep1 = access_key_id_step()
#     credentials_substep2 = access_key_id_step()
#     SetupStep.load(
#         description='Setup connection credentials.',
#         name='Credentials',
#         steps=[
#             ,
#             SetupStep.load(
#                 name='Secret access key',
#                 error=ERROR_MESSAGE_SECRET_ACCESS_KEY if not valid_secret else None,
#                 status=(
#                     SetupStepStatus.COMPLETED if valid_secret
#                     else SetupStepStatus.INCOMPLETE
#                 ),
#                 uuid=SetupStepUUID.AWS_SECRET_ACCESS_KEY,
#             ),
#         ],
#         status=(
#             SetupStepStatus.COMPLETED if valid_key and
#             valid_secret else SetupStepStatus.INCOMPLETE
#         ),
#         tab=ComputeManagementApplicationTab.SETUP,
#         uuid=SetupStepUUID.CREDENTIALS,
#     )


#         arr.append()

#         error_message = None
#         remote_variables_dir_status = SetupStepStatus.INCOMPLETE
#         if self.project.remote_variables_dir:
#             if self.project.remote_variables_dir.startswith('s3://'):
#                 remote_variables_dir_status = SetupStepStatus.COMPLETED
#             else:
#                 remote_variables_dir_status = SetupStepStatus.ERROR
#                 error_message = ErrorMessage.load(
#                     message='Remote variables directory must begin with: {{s3://}}',
#                     variables={
#                         's3://': dict(
#                             monospace=True,
#                             muted=True,
#                         ),
#                     },
#                 )

#         arr.append(SetupStep.load(
#             description='Set the Amazon S3 bucket.',
#             error=error_message,
#             name='Remote variables directory',
#             status=remote_variables_dir_status,
#             tab=ComputeManagementApplicationTab.SETUP,
#             uuid='remote_variables_dir',
#         ))

#         master_security_group_name = SECURITY_GROUP_NAME_MASTER_DEFAULT
#         if self.project.emr_config and self.project.emr_config.get('master_security_group'):
#             master_security_group_name = self.project.emr_config.get('master_security_group')

#         arr.append(SetupStep.load(
#             name='Security group permissions',
#             description='Add inbound rules to the '
#                         f'security group named “{master_security_group_name}” '
#                         'in order to connect to the AWS EMR Master Node '
#                         'from your current IP address.',
#             steps=[
#                 SetupStep.load(
#                     name='Custom TCP port 8998',
#                     description='Add an inbound rule for Custom TCP port 8998 '
#                                 'from your current IP address (e.g. My IP) '
#                                 f'to the security group named “{master_security_group_name}”.',
#                     uuid='custom_tcp_8998',
#                 ),
#                 SetupStep.load(
#                     name='SSH port 22',
#                     description='Add an inbound rule for SSH port 22 '
#                                 'from your current IP address (e.g. My IP) '
#                                 f'to the security group named “{master_security_group_name}”.',
#                     required=False,
#                     uuid='ssh_22',
#                 ),
#             ],
#             uuid='security',
#         ))
