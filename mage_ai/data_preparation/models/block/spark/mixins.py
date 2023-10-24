from typing import List

from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.services.spark.api.service import API
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.utils import get_compute_service


class SparkBlock:
    def compute_management_enabled(self) -> bool:
        return Project(self.pipeline.repo_config if self.pipeline else None).is_feature_enabled(
            FeatureUUID.COMPUTE_MANAGEMENT,
        )

    def is_using_spark(self) -> bool:
        return get_compute_service()

    def set_spark_job_before_execution(self) -> None:
        jobs = self.__get_jobs()
        if jobs:
            self.spark_job_before_execution = jobs[0]

    def set_spark_job_after_execution(self) -> None:
        jobs = self.__get_jobs()
        if jobs:
            self.spark_job_after_execution = jobs[0]

    def __get_jobs(self) -> List[Job]:
        api = API.build()

        if not api:
            return

        applications = api.applications_sync()

        jobs = []
        if applications:
            jobs = api.jobs_sync(applications[0].id)

        return sorted(
            jobs,
            key=lambda job: job.id,
            reverse=True,
        )
