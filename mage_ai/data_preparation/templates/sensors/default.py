from mage_ai.orchestration.run_status_checker import check_status


if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def check_condition(**kwargs) -> bool:
    """
    Template code for checking if block or pipeline run completed.

    Method to check status of a pipeline or block run
    check_status(
        <pipeline_uuid>,
        <partition>,
        block_uuid=<optional_block_uuid>,
        trigger_id=<optional_trigger_id>,
    )

    # check today's partition for a different pipeline
    partition = kwargs['execution_date']
    check_status('test_pipeline', partition, block_uuid='test_block', trigger_id=1)
    """

    return True
