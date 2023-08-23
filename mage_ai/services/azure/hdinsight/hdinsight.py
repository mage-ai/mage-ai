import os

from azure.identity import DefaultAzureCredential, ClientSecretCredential
from azure.mgmt.hdinsight import HDInsightManagementClient

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
