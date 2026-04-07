from unittest.mock import MagicMock

from mage_ai.data_preparation.models.block.dbt.block_sql import DBTBlockSQL
from mage_ai.tests.base_test import TestCase


def _make_node(name, resource_type_value):
    node = MagicMock()
    node.name = name
    node.resource_type.value = resource_type_value
    return node


def _make_node_result(status, node, message=None):
    nr = MagicMock()
    nr.status = status
    nr.node = node
    nr.message = message
    return nr


def _make_res(node_results, exception_str='some dbt exception'):
    res = MagicMock()
    res.result.results = node_results
    res.exception = exception_str
    return res


def _build(task, res):
    return DBTBlockSQL._build_dbt_error_detail(task, res)


class DBTBlockSQLBuildErrorDetailTest(TestCase):

    def test_model_error_is_formatted(self):
        """A failed model node produces [model] name: message format."""
        node = _make_node('my_model', 'model')
        res = _make_res([_make_node_result('error', node, 'Database Error\n  bad SQL')])

        result = _build('run', res)

        self.assertIn('dbt run failed', result)
        self.assertIn('[model] my_model', result)
        self.assertIn('Database Error', result)

    def test_test_fail_is_formatted(self):
        """A failed dbt test node (status=fail) produces [test] name: message format."""
        node = _make_node('not_null_orders_id', 'test')
        res = _make_res([_make_node_result('fail', node, 'Got 3 results')])

        result = _build('test', res)

        self.assertIn('dbt test failed', result)
        self.assertIn('[test] not_null_orders_id', result)
        self.assertIn('Got 3 results', result)

    def test_multiple_failures_all_listed(self):
        """All failed nodes are listed, not just the first."""
        node_a = _make_node('model_a', 'model')
        node_b = _make_node('model_b', 'model')
        res = _make_res([
            _make_node_result('error', node_a, 'Error A'),
            _make_node_result('error', node_b, 'Error B'),
        ])

        result = _build('build', res)

        self.assertIn('[model] model_a', result)
        self.assertIn('[model] model_b', result)

    def test_passing_nodes_are_excluded(self):
        """Nodes with status 'success' or 'pass' do not appear in the output."""
        passing_node = _make_node('good_model', 'model')
        failing_node = _make_node('bad_model', 'model')
        res = _make_res([
            _make_node_result('success', passing_node, None),
            _make_node_result('error', failing_node, 'Error'),
        ])

        result = _build('run', res)

        self.assertNotIn('good_model', result)
        self.assertIn('bad_model', result)

    def test_no_failed_nodes_falls_back_to_exception(self):
        """When all nodes pass, falls back to str(res.exception)."""
        node = _make_node('good_model', 'model')
        res = _make_res([_make_node_result('success', node, None)], exception_str='original error')

        result = _build('run', res)

        self.assertEqual(result, 'original error')

    def test_none_result_falls_back_to_exception(self):
        """When res.result is None, falls back to str(res.exception)."""
        res = MagicMock()
        res.result = None
        res.exception = 'fallback error'

        result = _build('run', res)

        self.assertEqual(result, 'fallback error')

    def test_node_is_none_uses_unknown(self):
        """When node attribute is None, node name falls back to 'unknown'."""
        nr = _make_node_result('error', None, 'some error')
        res = _make_res([nr])

        result = _build('run', res)

        self.assertIn('unknown', result)

    def test_resource_type_without_value_attr_uses_node(self):
        """When resource_type has no .value, resource type label falls back to 'node'."""
        # Use spec= to create a resource_type object that has no .value attribute
        resource_type = MagicMock(spec=[])  # empty spec → no attributes including .value
        node = MagicMock(spec=['name', 'resource_type'])
        node.name = 'my_model'
        node.resource_type = resource_type

        nr = MagicMock()
        nr.status = 'error'
        nr.node = node
        nr.message = 'err'
        res = _make_res([nr])

        result = _build('run', res)

        self.assertIn('node', result)
        self.assertIn('my_model', result)

    def test_output_is_capped_at_max_nodes(self):
        """When more nodes fail than max_nodes, output is truncated with a notice."""
        nodes = [
            _make_node_result('error', _make_node(f'model_{i}', 'model'), f'Error {i}')
            for i in range(30)
        ]
        res = _make_res(nodes)

        # Use max_nodes=10 to test capping
        result = DBTBlockSQL._build_dbt_error_detail('build', res, max_nodes=10)

        # First 10 should appear, rest should not
        self.assertIn('[model] model_0', result)
        self.assertIn('[model] model_9', result)
        self.assertNotIn('[model] model_10', result)
        self.assertIn('20 more failure(s) omitted', result)
