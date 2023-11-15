from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.compute.constants import ComputeConnectionActionUUID
from mage_ai.services.compute.models import ComputeConnection, ComputeService
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.ssh.aws.emr.models import SSHTunnel
from mage_ai.services.ssh.aws.emr.utils import tunnel
from mage_ai.shared.array import find


class ComputeConnectionResource(GenericResource):
    @classmethod
    async def collection(self, query_arg, _meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        arr = []

        if parent_model and isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                arr.extend(parent_model.compute_connections())

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        model = ComputeConnection.load(name=pk, uuid=pk)
        if parent_model and isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                model = find(lambda x: x.uuid == pk, parent_model.compute_connections())

        return self(model, user, **kwargs)

    async def update(self, payload, **kwargs):
        parent_model = kwargs.get('parent_model')

        action_uuid = payload.get('action')

        if not action_uuid:
            return

        if parent_model and isinstance(parent_model, ComputeService):
            if ComputeServiceUUID.AWS_EMR == parent_model.uuid:
                from mage_ai.services.compute.aws.steps import SetupStepUUID

                if SetupStepUUID.OBSERVABILITY == self.model.uuid:
                    def _callback(action_uuid=action_uuid, *args, **kwargs):
                        ssh_tunnel = SSHTunnel()

                        if ComputeConnectionActionUUID.CREATE == action_uuid:
                            tunnel(ignore_active_kernel=True)
                        elif ComputeConnectionActionUUID.DELETE == action_uuid:
                            ssh_tunnel.close()
                        elif ComputeConnectionActionUUID.DESELECT == action_uuid:
                            ssh_tunnel.stop()
                        elif ComputeConnectionActionUUID.UPDATE == action_uuid:
                            ssh_tunnel.reconnect()

                    self.on_update_callback = _callback
