if 'on_success' not in globals():
    from mage_ai.data_preparation.decorators import on_success
if 'on_failure' not in globals():
    from mage_ai.data_preparation.decorators import on_failure


@on_success
def on_success_callback(**kwargs):
    pass


@on_failure
def on_failure_callback(**kwargs):
    pass
