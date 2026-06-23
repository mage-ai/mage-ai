from types import SimpleNamespace
from unittest.mock import patch

from mage_ai.orchestration.monitor.monitor_stats import MonitorStats


class QueryStub:
    def __init__(self, results):
        self.filter_calls = []
        self.results = results

    def join(self, *args, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        self.filter_calls.append(args)
        return self

    def all(self):
        return self.results


@patch('mage_ai.orchestration.monitor.monitor_stats.project_platform_activated', lambda: True)
@patch('mage_ai.orchestration.monitor.monitor_stats.get_repo_path')
@patch('mage_ai.orchestration.monitor.monitor_stats.Pipeline.get')
@patch('mage_ai.orchestration.monitor.monitor_stats.PipelineRun.select')
def test_pipeline_run_count_scopes_pipeline_lookup_to_active_project(
    mock_select,
    mock_pipeline_get,
    mock_get_repo_path,
):
    repo_path = '/path/to/project'
    mock_get_repo_path.return_value = repo_path
    mock_pipeline_get.return_value = SimpleNamespace(type='python', uuid='demo_pipeline')
    mock_select.return_value = QueryStub([
        SimpleNamespace(
            ds_created_at='2026-06-23',
            name='Daily',
            pipeline_schedule_id=1,
            pipeline_uuid='demo_pipeline',
            status='completed',
        ),
    ])

    stats = MonitorStats().get_pipeline_run_count(group_by_pipeline_type=True)

    assert stats == {
        1: {
            'data': {
                '2026-06-23': {
                    'python': {
                        'completed': 1,
                    },
                },
            },
            'name': 'Daily',
        },
    }
    mock_get_repo_path.assert_called_with(root_project=False)
    mock_pipeline_get.assert_called_once_with(
        'demo_pipeline',
        check_if_exists=False,
        repo_path=repo_path,
    )
