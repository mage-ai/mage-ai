from dataclasses import dataclass

from mage_ai.orchestration.concurrency import ConcurrencyConfig
from mage_ai.tests.base_test import TestCase


class ConcurrencyConfigTests(TestCase):
    def test_load_ignores_unknown_keys(self):
        config = ConcurrencyConfig.load(
            config=dict(
                pipeline_run_limit=2,
                pipeline_run_priority=1,
            ),
        )

        self.assertEqual(2, config.pipeline_run_limit)
        self.assertFalse(hasattr(config, 'pipeline_run_priority'))

    def test_load_preserves_fields_from_subclasses(self):
        @dataclass
        class ExtendedConcurrencyConfig(ConcurrencyConfig):
            pipeline_run_priority: int = None

        config = ExtendedConcurrencyConfig.load(
            config=dict(
                pipeline_run_limit=2,
                pipeline_run_priority=1,
            ),
        )

        self.assertEqual(2, config.pipeline_run_limit)
        self.assertEqual(1, config.pipeline_run_priority)
