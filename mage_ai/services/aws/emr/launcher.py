from typing import Dict

from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.services.aws.emr.config import EmrConfig
from mage_ai.services.aws.emr.emr import create_a_new_cluster
from mage_ai.services.aws.emr.resource_manager import EmrResourceManager


def create_cluster(
    project_path: str,
    bootstrap_script_path: str = None,
    done_status: str = 'WAITING',
    emr_config: EmrConfig = None,
    idle_timeout: int = 30 * 60,
    tags: Dict = None,
):
    """
    Create an EMR (Elastic MapReduce) cluster for a specified project.

    Args:
        project_path (str): The path to the Mage project.
        done_status (str, optional): The status to consider the cluster as done
            (default is 'WAITING').
        idle_timeout (int, optional): The idle timeout in seconds for the cluster
            (default is 30 minutes).
        tags (Dict, optional): Custom tags to associate with the EMR cluster
            (default is an empty dictionary).

    Returns:
        dict: A dictionary containing the 'cluster_id' of the created EMR cluster.
    """
    if tags is None:
        tags = dict()
    print(f'Creating EMR cluster for project: {project_path}')
    repo_config = RepoConfig(project_path)
    # Upload bootstrap script
    resource_manager = EmrResourceManager(
        repo_config.s3_bucket,
        repo_config.s3_path_prefix,
        bootstrap_script_path=bootstrap_script_path,
    )
    resource_manager.upload_bootstrap_script()

    if emr_config is None:
        emr_config = repo_config.emr_config

    # Create EMR cluster
    cluster_id = create_a_new_cluster(
        'mage-data-preparation',
        [],
        emr_config,
        bootstrap_script_path=resource_manager.bootstrap_script_path,
        done_status=done_status,
        idle_timeout=idle_timeout,
        keep_alive=True,
        log_uri=resource_manager.log_uri,
        tags=tags,
    )
    print(f'Cluster {cluster_id} is created')

    return dict(cluster_id=cluster_id)
