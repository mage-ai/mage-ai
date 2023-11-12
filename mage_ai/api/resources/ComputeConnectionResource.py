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

                actions_cluster = []
                if cluster:
                    active_cluster.extend([
                        dict(
                            name='Terminate',
                            uuid=ComputeConnectionAction.DELETE,
                        ),
                    ])

                actions_tunnel = []
                if active_tunnel:
                    actions_tunnel.extend([
                        dict(
                            name='Close',
                            uuid=ComputeConnectionAction.DELETE,
                        ),
                        dict(
                            name='Stop',
                            uuid=ComputeConnectionAction.DESELECT,
                        ),
                        dict(
                            name='Reconnect',
                            uuid=ComputeConnectionAction.UPDATE,
                        ),
                    ])
                else:
                    actions_tunnel.append(dict(
                        name='Connect',
                        uuid=ComputeConnectionAction.CREATE,
                    ))

                arr.extend([
                    dict(
                        actions=actions_cluster,
                        active=active_cluster,
                        connection=cluster.to_dict() if cluster else None,
                        description=description_cluster,
                        id=ComputeConnectionUUID.CLUSTER,
                        name='Activated cluster'
                    ),
                    dict(
                        actions=actions_tunnel,
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

    @classmethod
    async def member(self, pk, user, **kwargs):
        return self(dict(
            id=pk,
        ), user, **kwargs)

    async def update(self, payload, **kwargs):
        parent_model = kwargs.get('parent_model')

        action_uuid = payload.get('action')
        connection = payload.get('connection')
        model_id = self.model.get('id')

        if not action_uuid:
            return

        if parent_model and isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                if ComputeConnectionUUID.CLUSTER == model_id:
                    cluster = parent_model.active_cluster()
                    if not cluster:
                        return

                    if ComputeConnectionAction.DELETE == action_uuid:
                        parent_model.terminate_clusters([connection.get('id')])
                elif ComputeConnectionUUID.SSH_TUNNEL == model_id:
                    tunnel = SSHTunnel()
                    if not tunnel:
                        return

                    if ComputeConnectionAction.CREATE:
                        tunnel.connect()
                    elif ComputeConnectionAction.DELETE:
                        tunnel.close()
                    elif ComputeConnectionAction.DESELECT:
                        tunnel.stop()
                    elif ComputeConnectionAction.UPDATE:
                        tunnel.reconnect()
