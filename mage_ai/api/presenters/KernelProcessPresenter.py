from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class KernelProcessPresenter(BasePresenter):
    default_attributes = [
        'active',
        'cmdline',
        'connection_file',
        'connections',
        'cpu',
        'cpu_times',
        'create_time',
        'exe',
        'memory',
        'memory_info',
        'name',
        'num_threads',
        'open_files',
        'pid',
        'ppid',
        'status',
        'username',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
