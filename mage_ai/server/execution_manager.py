class PipelineExecution():
    def __init__(self):
        self.current_pipeline_task = None
        self.current_pipeline_block_tasks = []

pipeline_execution = PipelineExecution()

def set_pipeline_execution(task):
    pipeline_execution.current_pipeline_task = task

def add_pipeline_block_execution(task):
    pipeline_execution.current_pipeline_block_tasks.append(task)

def set_pipeline(task):
    pipeline_execution.current_pipeline_task = task

def cancel_pipeline_execution(callback=None):
    current_task = pipeline_execution.current_pipeline_task
    current_block_tasks = pipeline_execution.current_pipeline_block_tasks
    if current_task is not None or not current_task.cancelled():
        current_task.cancel()
        if len(current_block_tasks) > 0:
            for task in current_block_tasks:
                if not task.cancelled():
                    task.cancel()
        if callback is not None:
            callback()

    pipeline_execution.current_pipeline_task = None
    pipeline_execution.current_pipeline_block_tasks = []
    
