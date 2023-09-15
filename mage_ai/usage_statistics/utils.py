from typing import Dict


def build_event_data_for_chart(chart_config: Dict = None) -> Dict:
    if not chart_config:
        return {}

    data_source = chart_config.get('data_source') or {}
    configuration = chart_config.get('configuration') or {}
    group_by = configuration.get('group_by')
    metrics = configuration.get('metrics')

    return dict(
        chart_type=configuration.get('chart_type'),
        data_source_type=data_source.get('type'),
        group_by=len(group_by) if group_by else None,
        metrics=len(metrics) if metrics else None,
    )
