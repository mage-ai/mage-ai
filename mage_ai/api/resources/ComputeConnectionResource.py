from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.compute.constants import (
    ComputeConnectionAction,
    ComputeConnectionUUID,
)
from mage_ai.services.compute.models import ComputeService
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.ssh.aws.emr.models import SSHTunnel
from mage_ai.services.ssh.aws.emr.utils import tunnel


class ComputeConnectionResource(GenericResource):
    @classmethod
    async def collection(self, query_arg, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        arr = []

        if parent_model and isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                cluster = parent_model.active_cluster()
                ssh_tunnel = SSHTunnel()

                active_cluster = (cluster.active and cluster.ready) if cluster else False
                active_tunnel = ssh_tunnel.is_active() if ssh_tunnel else False

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
                    actions_cluster.extend([
                        dict(
                            name='Terminate',
                            uuid=ComputeConnectionAction.DELETE,
                        ),
                    ])

                actions_tunnel = []
                if active_tunnel:
                    actions_tunnel.extend([
                        dict(
                            name='Reconnect',
                            uuid=ComputeConnectionAction.UPDATE,
                        ),
                        dict(
                            name='Stop',
                            uuid=ComputeConnectionAction.DESELECT,
                        ),
                        dict(
                            name='Close',
                            uuid=ComputeConnectionAction.DELETE,
                        ),
                    ])
                elif cluster and cluster.active:
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
                        connection=ssh_tunnel.to_dict() if ssh_tunnel else None,
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
                    def _callback(action_uuid=action_uuid, *args, **kwargs):
                        ssh_tunnel = SSHTunnel()
                        print('WTFFFFFFFFFFFFFFFFFFF ssh_tunnel', ssh_tunnel)

                        if ComputeConnectionAction.CREATE == action_uuid:
                            if ssh_tunnel:
                                ssh_tunnel.connect()
                            else:
                                tunnel(ignore_active_kernel=True)
                        elif ComputeConnectionAction.DELETE == action_uuid:
                            ssh_tunnel.close()
                        elif ComputeConnectionAction.DESELECT == action_uuid:
                            ssh_tunnel.stop()
                        elif ComputeConnectionAction.UPDATE == action_uuid:
                            ssh_tunnel.reconnect()

                    self.on_update_callback = _callback
