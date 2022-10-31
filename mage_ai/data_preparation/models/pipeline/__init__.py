from mage_ai.data_preparation.models.constants import PIPELINES_FOLDER, PipelineType
from mage_ai.data_preparation.models.pipeline.base import METADATA_FILE_NAME, Pipeline
from mage_ai.data_preparation.models.pipeline.integration_pipeline import IntegrationPipeline

import os

from mage_ai.data_preparation.repo_manager import get_repo_path


def get_pipeline(uuid: str, repo_path: str = None) -> Pipeline:
    pipeline = Pipeline(uuid, repo_path=repo_path)
    if pipeline.type == PipelineType.INTEGRATION:
        pipeline = IntegrationPipeline(uuid, repo_path=repo_path)

    return pipeline

def get_pipelines_by_block(block, repo_path=None, widget=False):
    repo_path = repo_path or get_repo_path()
    pipelines_folder = os.path.join(repo_path, PIPELINES_FOLDER)
    pipelines = []
    for entry in os.scandir(pipelines_folder):
        if entry.is_dir():
            try:
                p = get_pipeline(entry.name, repo_path=repo_path)
                mapping = p.widgets_by_uuid if widget else p.blocks_by_uuid
                if block.uuid in mapping:
                    pipelines.append(p)
            except Exception:
                pass
    return pipelines

def is_valid_pipeline(pipeline_path):
    return os.path.isdir(pipeline_path) and os.path.exists(
        os.path.join(pipeline_path, METADATA_FILE_NAME)
    )

def get_all_pipelines(repo_path):
    pipelines_folder = os.path.join(repo_path, PIPELINES_FOLDER)
    if not os.path.exists(pipelines_folder):
        os.mkdir(pipelines_folder)
    return [
        d
        for d in os.listdir(pipelines_folder)
        if is_valid_pipeline(os.path.join(pipelines_folder, d))
    ]