from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.services.aws.emr.emr import create_a_new_cluster
from mage_ai.services.aws.emr.resource_manager import EmrResourceManager
from typing import Dict


def create_cluster(
    project_path: str,
    done_status: str = 'WAITING',
    idle_timeout: int = 30 * 60,
    tags: Dict = dict(),
):
    print(f'Creating EMR cluster for project: {project_path}')
    repo_config = RepoConfig(project_path)
    # Upload bootstrap script
    resource_manager = EmrResourceManager(
        repo_config.s3_bucket,
        repo_config.s3_path_prefix,
    )
    resource_manager.upload_bootstrap_script()

    # Create EMR cluster
    cluster_id = create_a_new_cluster(
        'mage-data-preparation',
        [],
        repo_config.emr_config,
        bootstrap_script_path=resource_manager.bootstrap_script_path,
        done_status=done_status,
        idle_timeout=idle_timeout,
        keep_alive=True,
        log_uri=resource_manager.log_uri,
        tags=tags,
    )
    print(f'Cluster {cluster_id} is created')

    return dict(cluster_id=cluster_id)
