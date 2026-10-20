from mage_ai.orchestration.run_status_checker import check_status

if 'sensor' not in globals():
    from mage_ai.data_preparation.decorators import sensor


@sensor
def check_condition(*args, **kwargs) -> bool:
    """
    Template code for checking if block or pipeline run completed.
    """
    return check_status(
        'pipeline_uuid',
        kwargs['execution_date'],
        block_uuid='block_uuid',  # optional if you want the sensor to wait on a specific block
        hours=24,  # optional if you want to check for a specific time window. Default is 24 hours.
    )
