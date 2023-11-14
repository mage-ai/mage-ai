import json
import os
from typing import Dict

import simplejson

from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.server.kernels import KernelName
from mage_ai.services.compute.models import ComputeService
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.spark.utils import get_compute_service
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.parsers import encode_complex


def file_path() -> str:
    return os.path.join(
        get_repo_path(),
        '.ssh_tunnel',
        'aws_emr.json',
    )


def should_tunnel(
    ignore_active_kernel: bool = False,
    kernel_name: KernelName = None,
    project: Project = None,
) -> bool:
    if not project:
        project = Project()

    if not project.is_feature_enabled(FeatureUUID.COMPUTE_MANAGEMENT):
        return False

    if ComputeServiceUUID.AWS_EMR != get_compute_service(
        project.repo_config,
        ignore_active_kernel=ignore_active_kernel,
        kernel_name=kernel_name,
    ):
        return False

    if not project.emr_config:
        return False

    ec2_key_name = project.emr_config.get('ec2_key_name')
    ec2_key_path = project.emr_config.get('ec2_key_path')

    if not ec2_key_name or not ec2_key_path:
        return False

    if not os.path.exists(ec2_key_path):
        raise Exception(f'Public key {ec2_key_path} doesn’t exist.')

    return True


def tunnel(
    ignore_active_kernel: bool = False,
    kernel_name: KernelName = None,
    reconnect: bool = False,
    spark_ui_host_local: str = None,
    spark_ui_host_remote: str = None,
    spark_ui_port_local: str = None,
    spark_ui_port_remote: str = None,
    ssh_username: str = None,
    stop: bool = False,
    validate_conditions: bool = False,
) -> None:
    project = Project()

    if validate_conditions and not should_tunnel(
        ignore_active_kernel=ignore_active_kernel,
        kernel_name=kernel_name,
        project=project,
    ):
        print('WTFFFFFFFFFFFFFFFFFFF can’t tunnel')
        return

    data = dict(
        connect=not reconnect,
        reconnect=reconnect,
        spark_ui_host_local=spark_ui_host_local,
        spark_ui_host_remote=spark_ui_host_remote,
        spark_ui_port_local=spark_ui_port_local,
        spark_ui_port_remote=spark_ui_port_remote,
        ssh_username=ssh_username,
        stop=stop,
    )

    print('WTFFFFFFFFFFFFFFFFFFF data')

    if project and \
            project.emr_config and \
            project.is_feature_enabled(FeatureUUID.COMPUTE_MANAGEMENT):

        compute_service = ComputeService.build(project)
        if compute_service and ComputeServiceUUID.AWS_EMR == compute_service.uuid:
            try:
                cluster = compute_service.active_cluster()
                if cluster:
                    data['cluster'] = cluster.to_dict()
            except Exception as err:
                print(f'[WARNING] tunnel: {err}')

    absolute_file_path = file_path()
    os.makedirs(os.path.dirname(absolute_file_path), exist_ok=True)

    with open(absolute_file_path, 'w') as f:
        f.write(simplejson.dumps(
            data,
            default=encode_complex,
            ignore_nan=True,
        ))


def cluster_info_from_tunnel() -> Dict:
    cluster = None

    absolute_file_path = file_path()
    if os.path.exists(absolute_file_path):
        with open(absolute_file_path, 'r') as f:
            text = f.read()
            if text:
                commands = json.loads(text) or {}
                cluster = commands.get('cluster')

    return cluster
