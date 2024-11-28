from unittest.mock import patch

from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.variable_manager import (
    get_global_variable,
    get_global_variables,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


@patch('mage_ai.data_preparation.models.pipeline.project_platform_activated', lambda: True)
@patch('mage_ai.data_preparation.variable_manager.project_platform_activated', lambda: True)
class VariableManagerProjectPlatformTests(ProjectPlatformMixin):
    def test_get_global_variable(self):
        for settings in self.repo_paths.values():
            pipeline = Pipeline.create(
                self.faker.unique.name(),
                repo_path=settings["full_path"],
            )
            value = self.faker.unique.name()
            pipeline.variables = dict(mage=value)
            pipeline.save()

            self.assertEqual(get_global_variable(pipeline.uuid, "mage"), value)

    def test_get_global_variables(self):
        for settings in self.repo_paths.values():
            pipeline = Pipeline.create(
                self.faker.unique.name(),
                repo_path=settings["full_path"],
            )
            pipeline.variables = self.faker.unique.name()
            pipeline.save()

            self.assertEqual(
                get_global_variables(None, pipeline=pipeline),
                pipeline.variables,
            )
            self.assertEqual(
                get_global_variables(pipeline.uuid), pipeline.variables
            )
