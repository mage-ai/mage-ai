import os

from azure.identity import DefaultAzureCredential, ClientSecretCredential
from azure.mgmt.hdinsight import HDInsightManagementClient
from azure.mgmt.hdinsight.models import (
    ClusterCreateProperties,
    ClusterCreateParametersExtended,
    ClusterDefinition,
    ComputeProfile,
    HardwareProfile,
    LinuxOperatingSystemProfile,
    OsProfile,
    OSType,
    Role,
    StorageAccount,
    StorageProfile,
    Tier,
)


from mage_ai.server.logger import Logger
from mage_ai.services.azure.constants import (
    ENV_VAR_CLIENT_ID,
    ENV_VAR_CLIENT_SECRET,
    ENV_VAR_SUBSCRIPTION_ID,
    ENV_VAR_TENANT_ID,
)
from mage_ai.services.azure.hdinsight.config import HDInsightConfig

logger = Logger().new_server_logger(__name__)


def get_credential(config: HDInsightConfig):
    tenant_id = config.tenant_id if config.tenant_id \
        else os.getenv(ENV_VAR_TENANT_ID)
    client_id = config.client_id if config.client_id \
        else os.getenv(ENV_VAR_CLIENT_ID)
    client_secret = config.client_secret if config.client_secret \
        else os.getenv(ENV_VAR_CLIENT_SECRET)

    if tenant_id and client_id and client_secret:
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
    else:
        credential = DefaultAzureCredential()

    return credential


def get_hdinsight_client(config: HDInsightConfig):
    if type(config) is dict:
        config = HDInsightConfig.load(config=config)

    subscription_id = config.subscription_id if config.subscription_id \
        else os.getenv(ENV_VAR_SUBSCRIPTION_ID)

    credential = get_credential(config)

    hdinsight_client = HDInsightManagementClient(credential, subscription_id)
    return hdinsight_client


def create_a_new_cluster(config: HDInsightConfig):
    client = get_hdinsight_client(config)
    params = ClusterCreateProperties(
        cluster_version=config.cluster_version,
        os_type=OSType.linux,
        tier=Tier.standard,
        cluster_definition=ClusterDefinition(
            kind="spark",
            configurations={
                "gateway": {
                    "restAuthCredential.isEnabled": "true",
                    "restAuthCredential.username": config.cluster_login_user_name,
                    "restAuthCredential.password": config.password
                }
            }
        ),
        compute_profile=ComputeProfile(
            roles=[
                Role(
                    name="headnode",
                    target_instance_count=config.headnode_instance_count,
                    hardware_profile=HardwareProfile(vm_size="Large"),
                    os_profile=OsProfile(
                        linux_operating_system_profile=LinuxOperatingSystemProfile(
                            username=config.ssh_user_name,
                            password=config.password
                        )
                    )
                ),
                Role(
                    name="workernode",
                    target_instance_count=config.workernode_instance_count,
                    hardware_profile=HardwareProfile(vm_size="Large"),
                    os_profile=OsProfile(
                        linux_operating_system_profile=LinuxOperatingSystemProfile(
                            username=config.ssh_user_name,
                            password=config.password
                        )
                    )
                )
            ]
        ),
        storage_profile=StorageProfile(
            storageaccounts=[StorageAccount(
                name=config.storage_account_name + config.blob_endpoint_suffix,
                key=config.storage_account_key,
                container=config.container_name.lower(),
                is_default=True
            )]
        )
    )

    create_params = ClusterCreateParametersExtended(
        location=config.location,
        tags={},
        properties=params
    )

    client.clusters.begin_create(
        config.resource_group_name,
        config.cluster_name,
        create_params
    )


def describe_cluster(cluster_id: str, config: HDInsightConfig):
    if type(config) is dict:
        config = HDInsightConfig.load(config=config)

    hdinsight_client = get_hdinsight_client(config=config)

    cluster = hdinsight_client.clusters.get(
        resource_group_name=config.resource_group_name,
        cluster_name=cluster_id,
    )

    return cluster


def list_clusters(config: HDInsightConfig):
    if type(config) is dict:
        config = HDInsightConfig.load(config=config)

    hdinsight_client = get_hdinsight_client(config=config)

    clusters = hdinsight_client.clusters.list_by_resource_group(
        resource_group_name=config.resource_group_name,
    )

    return clusters
