from mage_ai.orchestration.db.models import PipelineRun
import multiprocessing


class ExecutionProcessManager:
    def __init__(self):
        self.block_processes = dict()
        self.pipeline_processes = dict()

    def has_pipeline_process(self, pipeline_run_id: int):
        return (
            pipeline_run_id in self.pipeline_processes
            and self.pipeline_processes[pipeline_run_id].is_alive()
        )

    def set_block_process(
        self,
        pipeline_run_id: int,
        block_run_id: int,
        proc: multiprocessing.Process,
    ):
        if pipeline_run_id not in self.block_processes:
            self.block_processes[pipeline_run_id] = dict()
        self.block_processes[pipeline_run_id][block_run_id] = proc

    def set_pipeline_process(
        self,
        pipeline_run_id: int,
        proc: multiprocessing.Process,
    ):
        if self.has_pipeline_process(
            pipeline_run_id in self.pipeline_processes
            and self.pipeline_processes[pipeline_run_id].is_alive()
        ):
            self.pipeline_processes[pipeline_run_id].terminate()
        self.pipeline_processes[pipeline_run_id] = proc

    def clean_up_processes(self):
        """
        Clean up inactive processes and terminate processes for cancelled pipeline runs
        """
        for pipeline_run_id in list(self.block_processes.keys()):
            block_run_procs = self.block_processes[pipeline_run_id]
            if not block_run_procs:
                del self.block_processes[pipeline_run_id]
                continue
            # TODO: Improve perf by batch fetching the pipeline runs
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
                del self.block_processes[pipeline_run_id]

        for pipeline_run_id in list(self.pipeline_processes.keys()):
            pipeline_run_proc = self.pipeline_processes[pipeline_run_id]
            if not pipeline_run_proc.is_alive():
                del self.pipeline_processes[pipeline_run_id]
            else:
                pipeline_run = PipelineRun.query.get(pipeline_run_id)
                if pipeline_run.status == PipelineRun.PipelineRunStatus.CANCELLED:
                    pipeline_run_proc.terminate()
                    del self.pipeline_processes[pipeline_run_id]


execution_process_manager = ExecutionProcessManager()
