from .base import BaseHandler


class ApiClustersHandler(BaseHandler):
    def get(self, cluster_type):
        clusters = []
        if cluster_type == 'emr':
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
            clusters = emr_cluster_manager.list_clusters()
        self.write(dict(clusters=clusters))

    def post(self, cluster_type):
        success = False
        if cluster_type == 'emr':
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
            cluster_payload = self.get_payload().get('cluster')
            if cluster_payload is None:
                raise Exception('Please include cluster info in the request payload')
            action = cluster_payload.get('action')
            if action == 'create_new_cluster':
                emr_cluster_manager.create_cluster()
                success = True
            elif action == 'set_active_cluster':
                cluster_id = cluster_payload.get('cluster_id')
                if cluster_id is None:
                    raise Exception('Please include cluster_id in thhe request payhload')
                emr_cluster_manager.set_active_cluster(cluster_id)
                success = True
        self.write(dict(cluster=cluster_payload, success=success))
