import json
import os
from pathlib import Path
from typing import Dict

from mage_ai.cluster_manager.cluster_manager import ClusterManager
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.services.aws.emr.config import EmrConfig
from mage_ai.services.aws.emr.emr import describe_cluster, list_clusters
from mage_ai.services.aws.emr.launcher import create_cluster
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict

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

    def create_cluster(self, repo_path: str, emr_config: Dict = None):
        emr_config = EmrConfig.load(
            config=merge_dict(get_repo_config().emr_config or dict(), emr_config or dict()))

        return create_cluster(
            repo_path,
            done_status=None,
            emr_config=emr_config,
            tags=dict(name=CLUSTER_NAME),
            bootstrap_script_path=emr_config.bootstrap_script_path,
        )

    def set_active_cluster(
        self,
        repo_path: str = None,
        auto_creation: bool = True,
        auto_selection: bool = False,
        cluster_id=None,
        emr_config: Dict = None,
    ):
        if cluster_id is None and auto_selection:
            clusters = self.list_clusters()
            if len(clusters) > 0:
                cluster_id = clusters[0]['id']
            elif auto_creation:
                self.create_cluster(repo_path, emr_config=emr_config)
        if cluster_id is None:
            return

        self.active_cluster_id = cluster_id
        emr_config = EmrConfig.load(
            config=merge_dict(
                get_repo_config(repo_path=repo_path).emr_config or dict(),
                emr_config or dict(),
            )
        )

        # Fetch cluster master instance public DNS
        cluster_info = describe_cluster(cluster_id)
        emr_dns = cluster_info['MasterPublicDnsName']

        # Get cluster information and update cluster url in sparkmagic config
        home_dir = str(Path.home())
        sparkmagic_config_path = os.path.join(home_dir, '.sparkmagic', 'config.json')
        with open(sparkmagic_config_path) as f:
            fcontent = f.read()

        config = json.loads(fcontent)
        for _, v in config.items():
            if type(v) is dict and 'url' in v:
                v['url'] = f'http://{emr_dns}:8998'

        config['session_configs']['jars'] = emr_config.spark_jars
        with open(sparkmagic_config_path, 'w') as f:
            f.write(json.dumps(config))

        return merge_dict(cluster_info, dict(cluster_id=cluster_id))


emr_cluster_manager = EmrClusterManager()
