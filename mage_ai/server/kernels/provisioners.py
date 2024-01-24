from jupyter_client.provisioning.local_provisioner import LocalProvisioner

from mage_ai.shared.hash import merge_dict


class ProcessKernelProvisioner(LocalProvisioner):
    def __init__(self, *args, path=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.path = path

    async def pre_launch(self, **kwargs):
        kwargs['env'] = merge_dict(
            kwargs.get('env', {}),
            dict(PATH=self.path),
        )

        return await super().pre_launch(**kwargs)
