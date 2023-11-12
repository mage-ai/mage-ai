import json
import os
from typing import Dict

from sshtunnel import SSHTunnelForwarder

from mage_ai.data_preparation.models.project import Project
from mage_ai.services.compute.aws.constants import ClusterStatusState
from mage_ai.services.compute.aws.models import Cluster
from mage_ai.services.compute.models import ComputeService
from mage_ai.services.spark.api.constants import (
    SPARK_UI_HOST,
    SPARK_UI_PORT,
    SPARK_UI_PORT_AWS_EMR,
)
from mage_ai.services.ssh.aws.emr.utils import file_path, should_tunnel
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import is_port_in_use

SSH_USERNAME_DEFAULT = 'hadoop'


class SSHTunnel:
    _instance = None
    _tunnel = None

    def __new__(
        cls,
        ec2_key_path: str = None,
        master_public_dns_name: str = None,
        spark_ui_host_local: str = None,
        spark_ui_host_remote: str = None,
        spark_ui_port_local: int = None,
        spark_ui_port_remote: int = None,
        ssh_username: str = None,
    ):
        if cls._instance is None:
            if ec2_key_path and master_public_dns_name:
                cls._instance = super(SSHTunnel, cls).__new__(cls)

                """
                ssh \
                    -i ~/.ssh/mage-emr-2023.pem \
                    -L [local host]:[local port]:[remote host]:[remote port] \
                    hadoop@ec2-34-217-92-37.us-west-2.compute.amazonaws.com
                """

                cls._instance._tunnel = SSHTunnelForwarder(
                    master_public_dns_name,
                    local_bind_address=(
                        spark_ui_host_local or SPARK_UI_HOST,
                        get_port(spark_ui_port_local or SPARK_UI_PORT),
                    ),
                    remote_bind_address=(
                        spark_ui_host_remote or SPARK_UI_HOST,
                        spark_ui_port_remote or SPARK_UI_PORT_AWS_EMR,
                    ),
                    ssh_pkey=ec2_key_path,
                    ssh_username=ssh_username or SSH_USERNAME_DEFAULT,
                )

        return cls._instance

    @property
    def tunnel(self) -> SSHTunnelForwarder:
        if self._instance:
            return self._instance._tunnel

    def connect(self) -> bool:
        if not self.is_active():
            self.__start()

        return self.is_active()

    def reconnect(self) -> bool:
        if self.is_active():
            self.__restart()
        else:
            self.__start()

        return self.is_active()

    def stop(self) -> None:
        if self.tunnel:
            try:
                self.tunnel.stop()
            except Exception as err:
                print(f'[WARNING] AWS EMR SSHTunnel: {err}')

    def close(self) -> None:
        if self.tunnel:
            self.tunnel.stop()
            self._instance = None

    def connection_details(self) -> Dict:
        return dict(
            address=self.tunnel.local_bind_address if self.tunnel else None,
            host=self.tunnel.local_bind_host if self.tunnel else None,
            port=self.tunnel.local_bind_port if self.tunnel else None,
        )

    def to_dict(self) -> Dict:
        return merge_dict(self.connection_details(), dict(
            active=self.is_active(),
        ))

    def is_active(self, raise_error: bool = False) -> bool:
        if not self.tunnel:
            return False

        if raise_error:
            self.tunnel._check_is_started()

        return self.tunnel.is_active

    def __restart(self) -> None:
        if self.tunnel:
            try:
                self.tunnel.restart()
            except Exception as err:
                print(f'[WARNING] AWS EMR SSHTunnel: {err}')

    def __start(self) -> None:
        if self.tunnel:
            try:
                self.tunnel.start()
            except Exception as err:
                print(f'[WARNING] AWS EMR SSHTunnel: {err}')


def create_tunnel(
    cluster: Cluster = None,
    compute_service: ComputeService = None,
    connect: bool = False,
    project: Project = None,
    reconnect: bool = False,
    spark_ui_host_local: str = None,
    spark_ui_host_remote: str = None,
    spark_ui_port_local: int = None,
    spark_ui_port_remote: int = None,
    ssh_username: str = None,
    stop: bool = False,
) -> SSHTunnel:
    cluster_from_cache = False

    absolute_file_path = file_path()
    if os.path.exists(absolute_file_path):
        with open(absolute_file_path, 'r') as f:
            text = f.read()
            if text:
                commands = json.loads(text) or {}

                cluster = cluster or commands.get('cluster')
                if cluster and isinstance(cluster, dict):
                    cluster = Cluster.load(**cluster)
                    cluster_from_cache = True

                connect = connect or commands.get('connect')
                reconnect = reconnect or commands.get('reconnect')
                spark_ui_host_local = spark_ui_host_local or commands.get('spark_ui_host_local')
                spark_ui_host_remote = spark_ui_host_remote or commands.get('spark_ui_host_remote')
                spark_ui_port_local = spark_ui_port_local or commands.get('spark_ui_port_local')
                spark_ui_port_remote = spark_ui_port_remote or commands.get('spark_ui_port_remote')
                ssh_username = ssh_username or commands.get('ssh_username')
                stop = stop or commands.get('stop')

    if not project:
        project = Project()

    if not should_tunnel(
        ignore_active_kernel=True,
        project=project,
    ):
        return close_tunnel()

    if not compute_service:
        compute_service = ComputeService.build(project)

    if not compute_service:
        return close_tunnel()

    if not cluster:
        cluster = compute_service.active_cluster()

    if not cluster:
        return close_tunnel()

    if cluster_from_cache:
        cluster = compute_service.get_cluster_details(cluster.id)
        if not cluster or \
                not cluster.status or \
                not cluster.status.state or \
                cluster.status.state in [
                    ClusterStatusState.TERMINATED,
                    ClusterStatusState.TERMINATED_WITH_ERRORS,
                    ClusterStatusState.TERMINATING,
                ]:
            return

    tunnel = SSHTunnel(
        project.emr_config.get('ec2_key_path'),
        cluster.master_public_dns_name,
        spark_ui_host_local=spark_ui_host_local,
        spark_ui_host_remote=spark_ui_host_remote,
        spark_ui_port_local=spark_ui_port_local,
        spark_ui_port_remote=spark_ui_port_remote,
        ssh_username=ssh_username,
    )

    if connect:
        tunnel.connect()

    if reconnect:
        tunnel.reconnect()

    if stop:
        tunnel.stop()

    # This method is invoked when the server restarts.
    # When the server restarts, there is no active cluster set.
    # We need to set it again.
    if compute_service and cluster:
        compute_service.update_cluster(cluster.id, dict(active=cluster.active))

    return tunnel


def close_tunnel() -> None:
    tunnel = SSHTunnel()
    if tunnel:
        tunnel.close()


def get_port(port: int) -> int:
    local_port = port
    max_local_port = int(local_port) + 100

    while is_port_in_use(local_port):
        if local_port > max_local_port:
            raise Exception(
                f'Cannot find an open port from {port} to '
                f'{max_local_port} for SSH tunnel. '
                'Please clear running processes to free up available ports.',
            )
        local_port += 1

    return local_port
