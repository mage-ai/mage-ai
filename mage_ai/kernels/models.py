from inspect import isawaitable
from typing import Dict

from mage_ai.kernels.monitor import kill_inactive_kernel_processes


class KernelWrapper:
    def __init__(self, kernel):
        self.kernel = kernel
        self.usage = None
        self.active_kernels = None
        self.inactive_kernels = None

    async def prepare_usage(self):
        try:
            client = self.kernel.client()
            session = self.kernel.session
            control_channel = client.control_channel
            usage_request = session.msg('usage_request', {})

            control_channel.send(usage_request)
            res = client.control_channel.get_msg(timeout=3)
            if isawaitable(res):
                # control_channel.get_msg may return a Future,
                # depending on configured KernelManager class
                res = await res
            self.usage = res.get('content')
            control_channel.stop()
        except Exception:
            pass

    def is_ready(self) -> bool:
        return self.usage is not None

    def is_alive(self):
        return self.kernel.is_alive()

    @property
    def kernel_id(self) -> str:
        return self.kernel.kernel_id

    @property
    def kernel_name(self) -> str:
        return self.kernel.kernel_name

    def to_dict(self) -> Dict:
        return {
            'active_kernels': self.active_kernels,
            'alive': self.is_alive(),
            'id': self.kernel_id,
            'inactive_kernels': self.inactive_kernels,
            'name': self.kernel_name,
            'usage': self.usage,
        }

    def terminate_inactive_kernels(self) -> None:
        active_kernels, inactive_kernels = kill_inactive_kernel_processes()
        self.active_kernels = active_kernels
        self.inactive_kernels = inactive_kernels
