from datetime import datetime
from mage_ai.services import datadog as dd
from mage_ai.tests.base_test import TestCase
from unittest.mock import Mock, patch

TEST_METRIC = 'mage.test'
TAGS = dict(tag1='tag')


class DatadogTests(TestCase):
    @patch('datadog.api.Event.create')
    def test_create_event(self, mock_event):
        event_name = 'event name'
        event_text = 'event text'
        dd.create_event(event_name, event_text, tags=TAGS)
        mock_event.assert_called_with(title=event_name, text=event_text, tags=TAGS)

    @patch('datadog.api.Metric.send')
    @patch('mage_ai.services.datadog.datetime')
    def test_gauge(self, mock_dt, mock_metric):
        dt = datetime(2023, 1, 1)
        mock_dt.utcnow = Mock(return_value=dt)
        dd.gauge(TEST_METRIC, 5, tags=TAGS)
        mock_metric.assert_called_with(
            host='mage',
            metric=TEST_METRIC,
            points=[(dt.timestamp(), 5)],
            tags=TAGS,
            type='gauge'
        )

    @patch('datadog.api.Metric.send')
    def test_increment(self, mock_metric):
        dd.increment(TEST_METRIC, tags=TAGS)
        mock_metric.assert_called_with(metrics=[{
            'host': 'mage',
            'metric': TEST_METRIC,
            'points': 1,
            'tags': TAGS,
            'type': 'count'
        }])

    @patch('datadog.api.Metric.send')
    @patch('mage_ai.services.datadog.datetime')
    def test_histogram(self, mock_dt, mock_metric):
        dt = datetime(2023, 1, 1)
        mock_dt.utcnow = Mock(return_value=dt)
        dd.histogram(TEST_METRIC, 3, tags=TAGS)
        mock_metric.assert_called_with(
            host='mage',
            metric=TEST_METRIC,
            points=[(dt.timestamp(), 3)],
            tags=TAGS,
            type='histogram'
        )

    @patch('datadog.api.Metric.send')
    @patch('mage_ai.services.datadog.datetime')
    def test_timing(self, mock_dt, mock_metric):
        dt = datetime(2023, 1, 1)
        mock_dt.utcnow = Mock(return_value=dt)
        dd.timing(TEST_METRIC, 100, tags=TAGS)
        mock_metric.assert_called_with(
            host='mage',
            metric=TEST_METRIC,
            points=[(dt.timestamp(), 100)],
            tags=TAGS,
            type='timer'
        )
