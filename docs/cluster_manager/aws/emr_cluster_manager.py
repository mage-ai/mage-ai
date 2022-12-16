from mage_ai.cluster_manager.cluster_manager import ClusterManager
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.services.aws.emr.emr import describe_cluster, list_clusters
from mage_ai.services.aws.emr.launcher import create_cluster
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from pathlib import Path
import json
import os

CLUSTER_NAME = 'mage-data-prep'


class EmrClusterManager(ClusterManager):
    def __init__(self):
        self.active_cluster_id = None

    def list_clusters(self):
        clusters = list_clusters()['Clusters']
        valid_clusters = []
        for c in clusters:
            cluster_info = describe_cluster(c['Id'])
            cluster_tags = cluster_info['Tags']
            if find(
                lambda t: t['Key'] == 'name' and t['Value'] == CLUSTER_NAME,
                cluster_tags,
            ):
                valid_clusters.append(c)
        return [dict(
            id=c['Id'],
            name=c['Name'],
            status=c['Status']['State'],
            is_active=c['Id'] == self.active_cluster_id,
        ) for c in valid_clusters]

    def create_cluster(self):
        return create_cluster(
            get_repo_path(),
            done_status=None,
            tags=dict(name=CLUSTER_NAME),
        )

    def set_active_cluster(self, auto_selection=False, cluster_id=None):
        if cluster_id is None and auto_selection:
            clusters = self.list_clusters()
            if len(clusters) > 0:
                cluster_id = clusters[0]['id']
            else:
                self.create_cluster()
        if cluster_id is None:
            return

        self.active_cluster_id = cluster_id

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

        return merge_dict(cluster_info, dict(cluster_id=cluster_id))


emr_cluster_manager = EmrClusterManager()
