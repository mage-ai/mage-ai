from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.services.compute.constants import (
    ComputeConnectionActionUUID,
    ComputeConnectionState,
)
from mage_ai.services.compute.models import ComputeConnection, ComputeService
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.ssh.aws.emr.models import SSHTunnel, create_tunnel
from mage_ai.services.ssh.aws.emr.utils import should_tunnel, tunnel
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
                    action_valid = action_uuid in [
                        ComputeConnectionActionUUID.CREATE,
                        ComputeConnectionActionUUID.DELETE,
                        ComputeConnectionActionUUID.DESELECT,
                        ComputeConnectionActionUUID.UPDATE,
                    ]

                    if action_valid:
                        if ComputeConnectionActionUUID.CREATE == action_uuid:
                            try:
                                should_tunnel(
                                    ignore_active_kernel=True,
                                    raise_error=True,
                                )

                                ssh_tunnel = create_tunnel(
                                    connect=False,
                                    fresh=True,
                                    reconnect=False,
                                    stop=False,
                                )
                                if ssh_tunnel:
                                    ssh_tunnel.precheck_access(raise_error=True)
                                    ssh_tunnel.connect()
                                else:
                                    raise Exception('Cannot create SSH tunnel instance.')
                            except Exception as err:
                                error = ApiError.UNAUTHORIZED_ACCESS.copy()
                                error.update(message=str(err))
                                raise ApiError(error)

                        def _callback(
                            action_uuid=action_uuid,
                            *args,
                            **kwargs,
                        ):
                            ssh_tunnel = SSHTunnel()

                            if ComputeConnectionActionUUID.CREATE == action_uuid:
                                tunnel(ignore_active_kernel=True)
                            elif ComputeConnectionActionUUID.DELETE == action_uuid:
                                ssh_tunnel.close()
                            elif ComputeConnectionActionUUID.DESELECT == action_uuid:
                                ssh_tunnel.stop()
                            elif ComputeConnectionActionUUID.UPDATE == action_uuid:
                                ssh_tunnel.reconnect()

                        self.model.state = ComputeConnectionState.PENDING
                        self.on_update_callback = _callback
