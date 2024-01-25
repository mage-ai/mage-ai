import os
from typing import Any, Dict, List

from jupyter_client.connect import KernelConnectionInfo
from jupyter_client.launcher import launch_kernel
from jupyter_client.provisioning.local_provisioner import LocalProvisioner
from traitlets.config import Unicode

from mage_ai.shared.hash import merge_dict


class ProcessKernelProvisioner(LocalProvisioner):
    async def launch_kernel(self, cmd: List[str], **kwargs: Any) -> KernelConnectionInfo:
        scrubbed_kwargs = ProcessKernelProvisioner._scrub_kwargs(kwargs)
        self.process = launch_kernel(cmd, **scrubbed_kwargs)
        pgid = None
        if hasattr(os, "getpgid"):
            try:
                pgid = os.getpgid(self.process.pid)
            except OSError:
                pass

        self.pid = self.process.pid
        self.pgid = pgid
        return self.connection_info

    @staticmethod
    def _scrub_kwargs(kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Remove any keyword arguments that Popen does not tolerate."""
        keywords_to_scrub: List[str] = ['extra_arguments', 'kernel_id', 'path', 'pipeline_uuid']
        scrubbed_kwargs = kwargs.copy()
        for kw in keywords_to_scrub:
            scrubbed_kwargs.pop(kw, None)
        return scrubbed_kwargs
