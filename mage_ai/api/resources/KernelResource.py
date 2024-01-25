from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.kernels.active_kernel import (
    get_active_kernel_config,
    interrupt_kernel,
    restart_kernel,
    start_kernel,
    switch_active_kernel,
)
from mage_ai.server.kernels.constants import DEFAULT_KERNEL_NAME, KernelName
from mage_ai.server.kernels.kernels import kernel_managers
from mage_ai.services.ssh.aws.emr.utils import tunnel
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path


class KernelResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        kernels = []

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels.append(kernel)

        return self.build_result_set(
            kernels,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        kernel_fallback = None
        kernels_by_id = {}

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels_by_id[kernel.kernel_id] = kernel

                if not kernel_fallback:
                    kernel_fallback = kernel

        kernel = kernels_by_id.get(pk)
        if not kernel and pk in [name for name in KernelName]:
            kernel = kernel_managers[pk]
        if not kernel:
            kernel = kernel_fallback
        if not kernel:
            kernel = kernel_managers[DEFAULT_KERNEL_NAME]

        return self(kernel, user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        action_type = payload.get('action_type')

        query = kwargs.get('query')
        pipeline_uuid = query.get('pipeline_uuid')
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]

        config = None
        if pipeline_uuid:
            pipeline = Pipeline.get(
                pipeline_uuid,
                repo_path=get_repo_path(),
                all_projects=project_platform_activated(),
            )
            config = dict(
                path=pipeline.pipeline_environment_dir,
                pipeline_uuid=pipeline.uuid,
            )
        # switch_active_kernel(self.model.kernel_name, kernel_config=config)

        if 'interrupt' == action_type:
            interrupt_kernel()
        elif 'restart' == action_type:
            try:
                restart_kernel()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    start_kernel(**get_active_kernel_config())

        def _callback(*args, **kwargs):
            tunnel(
                kernel_name=self.model.kernel_name,
                reconnect=True,
                validate_conditions=True,
            )

        self.on_update_callback = _callback

        return self
