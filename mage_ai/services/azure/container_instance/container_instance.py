import os
import time
import traceback

from azure.identity import DefaultAzureCredential
from azure.mgmt.containerinstance import ContainerInstanceManagementClient
from azure.mgmt.containerinstance.models import (
    Container,
    ContainerGroup,
    ContainerGroupRestartPolicy,
    ResourceRequests,
    ResourceRequirements,
)

from mage_ai.server.logger import Logger
from mage_ai.services.azure.constants import (
    ENV_VAR_CONTAINER_GROUP_NAME,
    ENV_VAR_RESOURCE_GROUP_NAME,
    ENV_VAR_STORAGE_ACCOUNT_KEY,
    ENV_VAR_SUBSCRIPTION_ID,
)
from mage_ai.services.azure.container_instance.config import ContainerInstanceConfig

logger = Logger().new_server_logger(__name__)


def run_job(command: str, job_id: str, container_instance_config: ContainerInstanceConfig):
    if type(container_instance_config) is dict:
        container_instance_config = ContainerInstanceConfig.load(config=container_instance_config)

    curr_container_group_name = os.getenv(ENV_VAR_CONTAINER_GROUP_NAME)
    resource_group_name = os.getenv(ENV_VAR_RESOURCE_GROUP_NAME)
    subscription_id = os.getenv(ENV_VAR_SUBSCRIPTION_ID)

    credential = DefaultAzureCredential()

    # Create the ACI management client
    aci_client = ContainerInstanceManagementClient(credential, subscription_id)

    # Get current container group
    curr_container_group = aci_client.container_groups.get(
        resource_group_name,
        curr_container_group_name,
    )
    curr_container = curr_container_group.containers[0]

    # Configure the container
    container_resource_requests = ResourceRequests(
        cpu=container_instance_config.cpu,
        memory_in_gb=container_instance_config.memory,
    )
    container_resource_requirements = ResourceRequirements(
        requests=container_resource_requests,
    )
    container = Container(
        command=command.split(' '),
        environment_variables=curr_container.environment_variables,
        image=curr_container.image,
        name=job_id,
        resources=container_resource_requirements,
        volume_mounts=curr_container.volume_mounts,
    )

    # Configure the container group
    volumes = []
    if curr_container_group.volumes:
        volume = curr_container_group.volumes[0]
        volume.azure_file.storage_account_key = os.getenv(ENV_VAR_STORAGE_ACCOUNT_KEY)
        volumes = [volume]
    group = ContainerGroup(
        containers=[container],
        location=curr_container_group.location,
        os_type=curr_container_group.os_type,
        restart_policy=ContainerGroupRestartPolicy.never,
        volumes=volumes,
    )

    # Create the container group
    result = aci_client.container_groups.begin_create_or_update(
        resource_group_name,
        job_id,
        group,
    )
    logger.info(f'Begin creating or updating the job {job_id}')

    # Wait for the container create operation to complete. The operation is
    # "done" when the container group provisioning state is one of:
    # Succeeded, Canceled, Failed
    while result.done() is False:
        time.sleep(5)

    # Get the provisioning state of the container group.
    container_group = aci_client.container_groups.get(resource_group_name,
                                                      job_id)
    if str(container_group.provisioning_state).lower() == 'succeeded':
        logger.info(f'Executing job {job_id} succeeded.')
    else:
        logger.info(f'Executing job {job_id} failed.'
                    f'Provisioning state is: {container_group.provisioning_state}')

    # Delete the container group
    try:
        aci_client.container_groups.begin_delete(resource_group_name,
                                                 job_id)
    except Exception:
        traceback.print_exc()
