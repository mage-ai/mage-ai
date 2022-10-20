from mage_ai.orchestration.triggers.event_trigger import EventTrigger
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class EventTriggerTests(TestCase):
    @patch('mage_ai.orchestration.triggers.event_trigger.schedule_with_event')
    def test_run(self, mock_schedule):
        test_event = dict(a=1, b=2)
        trigger = EventTrigger()
        trigger.run(test_event)
        mock_schedule.assert_called_once_with(test_event)
