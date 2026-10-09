@on_success
def on_pipeline_success(pipeline_run, **kwargs):
    """
    Called when the pipeline run completes successfully.

    Args:
        pipeline_run: Dict with pipeline run metadata including:
            - pipeline_uuid (str): UUID of the pipeline.
            - status (str): Final status of the pipeline run.
            - block_runs (list): Summary of all block run statuses.
        **kwargs: Additional keyword arguments including global variables.
    """
    pass


@on_failure
def on_pipeline_failure(pipeline_run, **kwargs):
    """
    Called when the pipeline run fails.

    Args:
        pipeline_run: Dict with pipeline run metadata including:
            - pipeline_uuid (str): UUID of the pipeline.
            - status (str): Final status of the pipeline run.
            - error (str): Error message describing the failure.
            - failed_blocks (list): List of block UUIDs that failed.
        **kwargs: Additional keyword arguments including global variables.
    """
    pass
