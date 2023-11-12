from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.compute.constants import (
    ComputeConnectionAction,
    ComputeConnectionUUID,
)
from mage_ai.services.compute.models import ComputeService
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.ssh.aws.emr.models import SSHTunnel


class ComputeConnectionResource(GenericResource):
    @classmethod
    async def collection(self, query_arg, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        arr = []

        if parent_model and isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                cluster = parent_model.active_cluster()
                tunnel = SSHTunnel()

                active_cluster = cluster.active and cluster.ready if cluster else False
                active_tunnel = tunnel.is_active() if tunnel else False

                description_cluster = 'No cluster has been activated for compute.'
                if cluster and cluster.active:
                    if cluster.ready:
                        description_cluster = 'Cluster is ready for compute.'
                    else:
                        description_cluster = f'Activated cluster status: {cluster.state}.'

                description_tunnel = 'An active SSH tunnel is required for observability.'
                if active_tunnel:
                    description_tunnel = 'SSH tunnel is active.'

                arr.extend([
                    dict(
                        actions=[
                            ComputeConnectionAction.DELETE,  # terminate
                            ComputeConnectionAction.DESELECT,  # deactivate
                        ],
                        active=active_cluster,
                        connection=cluster.to_dict() if cluster else None,
                        description=description_cluster,
                        id=ComputeConnectionUUID.CLUSTER,
                        name='Activated cluster'
                    ),
                    dict(
                        actions=[
                            ComputeConnectionAction.CREATE,  # connect
                            ComputeConnectionAction.DELETE,  # close
                            ComputeConnectionAction.DESELECT,  # stop
                            ComputeConnectionAction.UPDATE,  # reconnect
                        ],
                        active=active_tunnel,
                        connection=tunnel.to_dict() if tunnel else None,
                        description=description_tunnel,
                        id=ComputeConnectionUUID.SSH_TUNNEL,
                        name='SSH tunnel',
                    ),
                ])

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )
