@on_success
def on_pipeline_success(pipeline_run, pipeline, **kwargs):
    """
    Called when the pipeline run completes successfully.

    Args:
        pipeline_run: The pipeline run model instance.
        pipeline: The pipeline model instance.
        **kwargs: Additional keyword arguments including global variables.
    """
    pass


@on_failure
def on_pipeline_failure(pipeline_run, pipeline, __error=None, **kwargs):
    """
    Called when the pipeline run fails.

    Args:
        pipeline_run: The pipeline run model instance.
        pipeline: The pipeline model instance.
        __error: The failure exception passed to the callback.
        **kwargs: Additional keyword arguments including global variables.
    """
    pass
