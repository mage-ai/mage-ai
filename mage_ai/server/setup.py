def initialize_globals():
    from mage_ai.kernels.magic.queues.results import get_results_queue
    from mage_ai.orchestration.job_manager import get_job_manager

    print('Initializing global job manager: ', get_job_manager())
    print('Initializing global results queue: ', get_results_queue())
