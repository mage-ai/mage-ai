from dataclasses import dataclass

from mage_ai.shared.config import BaseConfig


@dataclass
class HDInsightConfig(BaseConfig):
    # Tenant ID for your Azure Subscription
    tenant_id: str = '00000000-0000-0000-0000-000000000000'

    # Your Service Principal App Client ID
    client_id: str = '00000000-0000-0000-0000-000000000000'

    # Your Service Principal Client Secret
    client_secret: str = ''

    # Azure Subscription ID
    subscription_id: str = '00000000-0000-0000-0000-000000000000'

    # The name of the resource group that contains the cluster.
    resource_group_name: str = ''

    # The name for the cluster you are creating. The name must be unique, 59 characters or less,
    # and can contain letters, numbers, and hyphens (but the first and last character must be
    # a letter or number).
    cluster_name: str = 'mage-data-prep'

    # Choose a region. i.e. "East US 2".
    location: str = 'West US'

    # Choose a cluster login username. The username must be at least two characters
    # in length and can only consist of digits, upper or lowercase letters,
    # and/or the following special characters: ! # $ % & ' ( ) - ^ _ ` { } ~
    cluster_login_user_name: str = 'admin'

    # Choose a Secure Shell (SSH) user username. The SSH username must be at least two characters
    # in length and can only consist of digits, upper or lowercase letters,
    # and/or the following special characters: % & ' - ^ _ ` {} ~
    ssh_user_name: str = 'sshuser'

    # Choose a cluster admin password. The password must be at least 10 characters in length
    # and must contain at least one digit, one uppercase and one lower case letter,
    # one non-alphanumeric character (except characters ' " ` \).
    password: str = ''

    # The name of blob storage account
    storage_account_name: str = ''

    # Blob storage account key
    storage_account_key: str = ''

    # Blob Storage endpoint suffix.
    blob_endpoint_suffix: str = '.blob.core.windows.net'

    # Blob storage account container name
    container_name: str = ''

    # HDInsight cluster version
    cluster_version: str = '5.1'

    # The type of HDInsight cluster you want to create.
    kind: str = 'Spark'

    # The size of the VMs in the cluster for headnodes. See available VM sizes at
    # https://docs.microsoft.com/en-us/azure/hdinsight/hdinsight-hadoop-provision-linux-clusters#configure-cluster-size-and-type
    headnode_vm_size: str = 'Large'

    # The size of the VMs in the cluster for workernodes
    workernode_vm_size: str = 'Large'

    # The number of head nodes in the cluster.
    headnode_instance_count: int = 1

    # The number of worker nodes in the cluster.
    workernode_instance_count: int = 1
