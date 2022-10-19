from mage_ai.orchestration.triggers.loop_time_trigger import LoopTimeTrigger
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class LoopTimeTriggerTests(TestCase):
    @patch('mage_ai.orchestration.triggers.time_trigger.schedule_all')
    def test_run(self, mock_schedule_all):
        trigger = LoopTimeTrigger()
        trigger.run()
        mock_schedule_all.assert_called_once()
