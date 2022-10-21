from mage_ai.orchestration.db.models import PipelineRun


IN_PROGRESS_STATUSES = [
    PipelineRun.PipelineRunStatus.INITIAL,
    PipelineRun.PipelineRunStatus.RUNNING,
]
