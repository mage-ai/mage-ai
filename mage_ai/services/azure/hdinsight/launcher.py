from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.services.azure.hdinsight.hdinsight import create_a_new_cluster
from typing import Dict


def create_cluster(
    project_path: str,
    done_status: str = 'Running',
    tags: Dict = dict(),
) -> Dict:
    print(f'Creating HDInsight cluster for project: {project_path}')
    repo_config = RepoConfig(project_path)

    # Create HDInsight cluster
    cluster_id = create_a_new_cluster(
        repo_config.hdinsight_config,
        done_status=done_status,
        tags=tags,
    )

    print(f'Cluster {cluster_id} is created')

    return dict(cluster_id=cluster_id)
