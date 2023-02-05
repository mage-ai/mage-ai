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

    def terminate_pipeline_process(self, pipeline_run_id: int) -> None:
        if self.has_pipeline_process(pipeline_run_id):
            try:
                self.pipeline_processes[pipeline_run_id].terminate()
            except AttributeError as err:
                print(f'ExecutionProcessManager.terminate_pipeline_process: {err}')

    def set_pipeline_process(
        self,
        pipeline_run_id: int,
        proc: multiprocessing.Process,
    ):
        self.terminate_pipeline_process(pipeline_run_id)
        self.pipeline_processes[pipeline_run_id] = proc

    def has_block_process(self, pipeline_run_id: int, block_run_id: int):
        return (
            pipeline_run_id in self.block_processes
            and block_run_id in self.block_processes[pipeline_run_id]
            and self.block_processes[pipeline_run_id][block_run_id].is_alive()
        )

    def set_block_process(
        self,
        pipeline_run_id: int,
        block_run_id: int,
        proc: multiprocessing.Process,
    ):
        self.terminate_block_process(pipeline_run_id, block_run_id)
        if pipeline_run_id not in self.block_processes:
            self.block_processes[pipeline_run_id] = dict()
        self.block_processes[pipeline_run_id][block_run_id] = proc

    def terminate_block_process(self, pipeline_run_id: int, block_run_id: int) -> None:
        if self.has_block_process(pipeline_run_id, block_run_id):
            self.block_processes[pipeline_run_id][block_run_id].terminate()

    def clean_up_processes(self, include_child_processes=True):
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
                    if proc and hasattr(proc, 'is_alive') and not proc.is_alive():
                        del block_run_procs[block_run_id]
            if not block_run_procs:
                del self.block_processes[pipeline_run_id]

        for pipeline_run_id in list(self.pipeline_processes.keys()):
            pipeline_run_proc = self.pipeline_processes[pipeline_run_id]
            if not pipeline_run_proc.is_alive():
                del self.pipeline_processes[pipeline_run_id]
            else:
                pipeline_run = PipelineRun.query.get(pipeline_run_id)
                if pipeline_run and pipeline_run.status == PipelineRun.PipelineRunStatus.CANCELLED:
                    pipeline_run_proc.terminate()
                    del self.pipeline_processes[pipeline_run_id]


execution_process_manager = ExecutionProcessManager()
