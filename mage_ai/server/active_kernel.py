from typing import Dict

from jupyter_client import KernelClient, KernelManager
from jupyter_client.kernelspec import NoSuchKernel

from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.server.kernels import DEFAULT_KERNEL_NAME, KernelName, kernel_managers
from mage_ai.server.logger import Logger
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.spark.utils import get_compute_service
from mage_ai.services.ssh.aws.emr.utils import cluster_info_from_tunnel

logger = Logger().new_server_logger(__name__)


class ActiveKernel():
    def __init__(self):
        self.kernel = kernel_managers[DEFAULT_KERNEL_NAME]
        self.kernel_client = self.kernel.client()


active_kernel = ActiveKernel()


def switch_active_kernel(
    kernel_name: KernelName,
    emr_config: Dict = None,
) -> None:
    """
    Switches the active kernel to the specified kernel name, handling its startup and
    shutdown.

    This function switches the active kernel to the specified kernel name, shutting down any
    currently active kernel and starting the new kernel. It also updates the active kernel and
    its client. If the specified kernel is PySpark, it configures the active EMR cluster through
    the 'emr_cluster_manager'.

    This method logs various information and handles exceptions for different scenarios.

    Args:
        kernel_name (KernelName): The name of the kernel to switch to.
        emr_config (Dict, optional): Configuration settings for EMR (Elastic MapReduce).
            Defaults to None.

    Returns:
        None: This function does not return anything.

    Raises:
        NoSuchKernel: If the specified kernel is not available.
        Exception: If the specified kernel is PySpark and is not installed,
            it provides instructions for installation.

    Note:
        Ensure the necessary dependencies and configurations are set up for the desired kernels.
    """
    logger.info(f'Switch active kernel: {kernel_name}')
    if kernel_managers[kernel_name].is_alive():
        logger.info(f'Kernel {kernel_name} is already alive.')
        return

    for kernel in kernel_managers.values():
        if kernel.is_alive():
            logger.info(f'Shut down current kernel {kernel}.')
            kernel.request_shutdown()

    try:
        new_kernel = kernel_managers[kernel_name]
        new_kernel.start_kernel()
        active_kernel.kernel = new_kernel
        active_kernel.kernel_client = new_kernel.client()
        if kernel_name == KernelName.PYSPARK:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import (
                emr_cluster_manager,
            )

            should_set_active = True
            auto_creation = True
            cluster_id = None
            project = Project()

            if project.is_feature_enabled(FeatureUUID.COMPUTE_MANAGEMENT):
                if ComputeServiceUUID.AWS_EMR == get_compute_service(
                    emr_config=emr_config,
                    kernel_name=kernel_name,
                ):
                    auto_creation = False
                    should_set_active = False

                    cluster_info = cluster_info_from_tunnel()

                    if cluster_info:
                        from mage_ai.services.compute.models import ComputeService

                        cluster_id = cluster_info.get('id') or None
                        compute_service = ComputeService(project=project)
                        cluster = compute_service.get_cluster_details(cluster_id=cluster_id)

                        should_set_active = cluster.has_dns_name if cluster else False

            if should_set_active:
                emr_cluster_manager.set_active_cluster(
                    auto_creation=auto_creation,
                    auto_selection=True,
                    cluster_id=cluster_id,
                    emr_config=emr_config,
                )
    except NoSuchKernel as e:
        if kernel_name == KernelName.PYSPARK:
            raise Exception(
                'PySpark kernel is not installed. Please follow the instructions in '
                'https://docs.mage.ai/integrations/spark-pyspark '
                'to install it.'
            ) from e
        else:
            raise e


def get_active_kernel() -> KernelManager:
    return active_kernel.kernel


def get_active_kernel_name() -> str:
    return active_kernel.kernel.kernel_name


def get_active_kernel_client() -> KernelClient:
    return active_kernel.kernel_client


def interrupt_kernel() -> None:
    active_kernel.kernel.interrupt_kernel()


def restart_kernel() -> None:
    active_kernel.kernel.restart_kernel()
    active_kernel.kernel_client = active_kernel.kernel.client()


def start_kernel() -> None:
    active_kernel.kernel.start_kernel()
    active_kernel.kernel_client = active_kernel.kernel.client()
