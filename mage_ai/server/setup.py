from mage_ai.settings.server import KERNEL_MAGIC


def initialize_globals():
    from mage_ai.orchestration.job_manager import get_job_manager

    print('Initializing global job manager: ', get_job_manager())

    if KERNEL_MAGIC:
        from mage_ai.kernels.magic.queues.results import get_results_queue

        print('Initializing global results queue: ', get_results_queue())
