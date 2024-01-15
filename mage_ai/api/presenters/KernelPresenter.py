from datetime import datetime
from inspect import isawaitable

from mage_ai.api.presenters.BasePresenter import BasePresenter


class KernelPresenter(BasePresenter):
    default_attributes = [
        'alive',
        'id',
        'latency',
        'name',
        'usage',
    ]

    async def present(self, **kwargs):
        query = kwargs.get('query', {})

        kernel = self.resource.model

        kernel_response = dict(
            alive=kernel.is_alive(),
            id=kernel.kernel_id,
            name=kernel.kernel_name,
        )
        if kernel.is_alive() and kernel.has_kernel:
            try:
                client = kernel.client()

                check_execution_state = query.get('check_execution_state', [False])
                if check_execution_state:
                    check_execution_state = check_execution_state[0]
                if check_execution_state:
                    now = datetime.utcnow().timestamp()
                    client.execute('1')
                    kernel_response['latency'] = datetime.utcnow().timestamp() - now

                session = kernel.session
                control_channel = client.control_channel
                usage_request = session.msg("usage_request", {})

                control_channel.send(usage_request)
                res = client.control_channel.get_msg(timeout=3)
                if isawaitable(res):
                    # control_channel.get_msg may return a Future,
                    # depending on configured KernelManager class
                    res = await res
                kernel_response['usage'] = res.get('content')
                control_channel.stop()
            except Exception:
                pass

        return kernel_response
