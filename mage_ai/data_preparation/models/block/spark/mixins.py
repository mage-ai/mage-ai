from typing import List

from mage_ai.services.spark.api.service import API
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.utils import get_compute_service


class SparkBlock:
    def add_spark_job(self, job: Job) -> List[Job]:
        self.spark_jobs.append(job)
        return self.spark_jobs

    def is_using_spark(self) -> bool:
        return get_compute_service()

    def get_jobs(self) -> List[Job]:
        api = API.build()
        applications = api.applications_sync()

        jobs = []
        if applications:
            jobs = api.jobs_sync(applications[0].id)

        return sorted(
            jobs,
            key=lambda job: job.id,
            reverse=True,
        )

    def update_recent_spark_job(self) -> None:
        jobs = self.get_jobs()
        if jobs:
            self.add_spark_job(jobs[0])
