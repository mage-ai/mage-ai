from distutils.dir_util import copy_tree
import os
import shutil

class PipelineExecution():
    def __init__(self):
        self.current_pipeline_block = None
        self.current_pipeline_process = None
        self.previous_config_path = None

pipeline_execution = PipelineExecution()


def set_current_pipeline_process(process):
    pipeline_execution.current_pipeline_process = process


def cancel_pipeline_execution(pipeline, publish_message=None):
    pipeline_execution.current_pipeline_process.terminate()
    publish_message(
        'Pipeline execution cancelled... reverting state to previous iteration',
        execution_state='idle',
    )
    config_path = pipeline_execution.previous_config_path
    if config_path is not None and os.path.isdir(config_path):
        copy_tree(config_path, pipeline.dir_path)
        delete_pipeline_copy_config(config_path)


def reset_execution_manager():
    pipeline_execution.current_pipeline_block = None
    pipeline_execution.current_pipeline_process = None
    pipeline_execution.previous_config_path = None


def set_previous_config_path(path):
    pipeline_execution.previous_config_path = path


def delete_pipeline_copy_config(path):
    shutil.rmtree(path)
