from unittest.mock import MagicMock


def get_dbt_error_message(res) -> str:
    """Copy of DBTBlockSQL.__get_dbt_error_message for isolated testing."""
    base_msg = str(res.exception) if res.exception else 'dbt run failed'

    failed_nodes = []
    try:
        if res.result and hasattr(res.result, 'results'):
            for run_result in res.result.results:
                status = str(run_result.status)
                if status in ('error', 'fail', 'runtime error'):
                    node = run_result.node
                    resource_type = (
                        node.resource_type.value
                        if hasattr(node.resource_type, 'value')
                        else str(node.resource_type)
                    )
                    node_name = node.name
                    message = run_result.message or ''
                    failed_nodes.append(
                        f'  - {resource_type} "{node_name}": {message}'
                    )
    except Exception:
        pass

    if failed_nodes:
        return (
            f'{base_msg}\n\n'
            f'Failed dbt models/tests:\n'
            + '\n'.join(failed_nodes)
        )

    return base_msg


def make_node(name, resource_type_value):
    node = MagicMock()
    node.name = name
    node.resource_type.value = resource_type_value
    return node


def test_failed_model_and_test():
    """Both a model error and a test failure should appear in the message."""
    res = MagicMock()
    res.exception = None
    res.result.results = [
        MagicMock(status='error', node=make_node('stg_orders', 'model'),
                  message='column "status" does not exist'),
        MagicMock(status='fail',  node=make_node('not_null_orders_id', 'test'),
                  message='Got 3 results, configured to fail if != 0'),
        MagicMock(status='pass',  node=make_node('unique_orders_id', 'test'),
                  message=None),   # passing test — should NOT appear
    ]

    msg = get_dbt_error_message(res)
    print('\n--- test_failed_model_and_test ---')
    print(msg)

    assert 'Failed dbt models/tests:' in msg
    assert 'model "stg_orders"' in msg
    assert 'column "status" does not exist' in msg
    assert 'test "not_null_orders_id"' in msg
    assert 'Got 3 results' in msg
    assert 'unique_orders_id' not in msg   # passing test excluded
    print('PASSED')


def test_python_exception_fallback():
    """When dbt itself throws a Python exception, show that instead."""
    res = MagicMock()
    res.exception = RuntimeError('Connection refused')
    res.result.results = []

    msg = get_dbt_error_message(res)
    print('\n--- test_python_exception_fallback ---')
    print(msg)

    assert 'Connection refused' in msg
    assert 'Failed dbt models/tests' not in msg
    print('PASSED')


def test_no_failures_in_results():
    """All nodes passed — message should be the base dbt run failed string."""
    res = MagicMock()
    res.exception = None
    res.result.results = [
        MagicMock(status='pass', node=make_node('my_model', 'model'), message=None),
    ]

    msg = get_dbt_error_message(res)
    print('\n--- test_no_failures_in_results ---')
    print(msg)

    assert msg == 'dbt run failed'
    assert 'Failed dbt models/tests' not in msg
    print('PASSED')


def test_result_attribute_missing():
    """If res.result has no 'results' attr, fall back gracefully."""
    res = MagicMock(spec=['exception'])
    res.exception = None

    msg = get_dbt_error_message(res)
    print('\n--- test_result_attribute_missing ---')
    print(msg)

    assert msg == 'dbt run failed'
    print('PASSED')


def test_with_real_dbt_enums():
    """
    Verify the helper works with the *actual* dbt SDK types — not just string mocks.

    Uses the real RunStatus, TestStatus, and NodeType enums from dbt-core so the
    test proves that str(RunStatus.Error) == 'error', str(TestStatus.Fail) == 'fail',
    and NodeType.*.value returns the expected resource-type strings.
    """
    try:
        from dbt.contracts.results import RunStatus, TestStatus
        from dbt.node_types import NodeType
    except ImportError:
        print('\n--- test_with_real_dbt_enums ---')
        print('SKIPPED (dbt-core not installed)')
        return

    def make_node(name, resource_type):
        node = MagicMock()
        node.name = name
        node.resource_type = resource_type
        return node

    res = MagicMock()
    res.exception = None
    res.result.results = [
        MagicMock(
            status=RunStatus.Error,
            node=make_node('stg_orders', NodeType.Model),
            message='column "status" does not exist',
        ),
        MagicMock(
            status=TestStatus.Fail,
            node=make_node('not_null_orders_id', NodeType.Test),
            message='Got 3 results, configured to fail if != 0',
        ),
        MagicMock(
            status=RunStatus.Success,
            node=make_node('dim_customers', NodeType.Model),
            message=None,
        ),
    ]

    msg = get_dbt_error_message(res)
    print('\n--- test_with_real_dbt_enums ---')
    print(msg)

    assert 'Failed dbt models/tests:' in msg
    assert 'model "stg_orders"' in msg
    assert 'column "status" does not exist' in msg
    assert 'test "not_null_orders_id"' in msg
    assert 'Got 3 results' in msg
    assert 'dim_customers' not in msg   # successful node excluded
    print('PASSED')


if __name__ == '__main__':
    test_failed_model_and_test()
    test_python_exception_fallback()
    test_no_failures_in_results()
    test_result_attribute_missing()
    test_with_real_dbt_enums()
    print('\nAll tests passed.')
