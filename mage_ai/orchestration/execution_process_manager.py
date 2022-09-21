from mage_ai.orchestration.db.models import PipelineRun
import multiprocessing


class ExecutionProcessManager:
    def __init__(self):
        self.processes = dict()

    def set_process(self, pipeline_run_id: int, block_run_id: int, proc: multiprocessing.Process):
        if pipeline_run_id not in self.processes:
            self.processes[pipeline_run_id] = dict()
        self.processes[pipeline_run_id][block_run_id] = proc

    def clean_up_processes(self):
        """
        Clean up inactive processes and terminate processes for cancelled pipeline runs
        """
        for pipeline_run_id in list(self.processes.keys()):
            block_run_procs = self.processes[pipeline_run_id]
            if not block_run_procs:
                del self.processes[pipeline_run_id]
                continue
            pipeline_run = PipelineRun.query.get(pipeline_run_id)
            if pipeline_run.status == PipelineRun.PipelineRunStatus.CANCELLED:
                for block_run_id in list(block_run_procs.keys()):
                    proc = block_run_procs[block_run_id]
                    if proc.is_alive():
                        proc.terminate()
                    del block_run_procs[block_run_id]
            else:
                for block_run_id in list(block_run_procs.keys()):
                    proc = block_run_procs[block_run_id]
                    if not proc.is_alive():
                        del block_run_procs[block_run_id]
            if not block_run_procs:
                del self.processes[pipeline_run_id]


execution_process_manager = ExecutionProcessManager()
