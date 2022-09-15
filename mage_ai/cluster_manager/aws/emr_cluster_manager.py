from mage_ai.cluster_manager.cluster_manager import ClusterManager
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.services.aws.emr.emr import describe_cluster, list_clusters
from mage_ai.services.aws.emr.launcher import create_cluster
from pathlib import Path
import json
import os


class EmrClusterManager(ClusterManager):
    def __init__(self):
        self.active_cluster_id = None

    def list_clusters(self):
        clusters = list_clusters()['Clusters']
        return [dict(
            id=c['Id'],
            name=c['Name'],
            status=c['Status']['State'],
            is_active=c['Id'] == self.active_cluster_id,
        ) for c in clusters]

    def create_cluster(self):
        create_cluster(get_repo_path(), done_status=None)

    def set_active_cluster(self, cluster_id=None):
        self.active_cluster_id = cluster_id

        if cluster_id is None:
            return

        # Fetch cluster master instance public DNS
        cluster_info = describe_cluster(cluster_id)
        emr_dns = cluster_info['MasterPublicDnsName']

        # Get cluster information and update cluster url in sparkmagic config 
        home_dir = str(Path.home())
        sparkmagic_config_path = os.path.join(home_dir, '.sparkmagic/config.json')
        with open(sparkmagic_config_path) as f:
            fcontent = f.read()

        config = json.loads(fcontent)
        for k, v in config.items():
            if type(v) is dict and 'url' in v:
                v['url'] = f'http://{emr_dns}:8998'

        with open(sparkmagic_config_path, 'w') as f:
            f.write(json.dumps(config))


emr_cluster_manager = EmrClusterManager()
