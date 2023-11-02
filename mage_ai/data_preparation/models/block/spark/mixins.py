import json
import os
from datetime import datetime
from typing import List

from mage_ai.data_preparation.models.block.spark.constants import (
    SPARK_DIR_NAME,
    SPARK_JOBS_FILENAME,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.services.spark.api.service import API
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.models.sqls import Sql
from mage_ai.services.spark.models.stages import Stage
from mage_ai.services.spark.utils import get_compute_service


class SparkBlock:
    def compute_management_enabled(self) -> bool:
        return Project(self.pipeline.repo_config if self.pipeline else None).is_feature_enabled(
            FeatureUUID.COMPUTE_MANAGEMENT,
        )

    def is_using_spark(self) -> bool:
        return get_compute_service()

    def jobs_during_execution(self) -> List[Job]:
        self.__load_spark_jobs_during_execution()

        if self.spark_job_execution_start:
            jobs = self.__get_jobs()

            def _filter(
                job: Job,
                execution_timestamp_start: float = self.execution_timestamp_start,
                execution_timestamp_end: float = self.execution_timestamp_end,
            ) -> bool:
                submission_timestamp = job.submission_time.timestamp()

                return execution_timestamp_start and \
                    execution_timestamp_end and \
                    submission_timestamp >= execution_timestamp_start and \
                    (
                        not execution_timestamp_end or
                        submission_timestamp <= execution_timestamp_end
                    )

            return list(filter(_filter, jobs))

        return []

    def stages_during_execution(self, jobs: List[Job]):
        if not jobs:
            self.__load_spark_jobs_during_execution()

        def _filter(
            stage: Stage,
            jobs=jobs,
        ) -> bool:
            return any([job.stage_ids and stage.id in job.stage_ids for job in jobs])

        stages = self.__get_stages()

        return list(filter(_filter, stages))

    def sqls_during_execution(self, jobs: List[Job]):
        if not jobs:
            self.__load_spark_jobs_during_execution()

        def _filter(
            sql: Sql,
            jobs=jobs,
        ) -> bool:
            return any([(
                job.id in sql.failed_job_ids or
                job.id in sql.running_job_ids or
                job.id in sql.success_job_ids
            ) for job in jobs])

        sqls = self.__get_sqls()

        return list(filter(_filter, sqls))

    def clear_spark_jobs_cache(self) -> None:
        if os.path.exists(self.spark_jobs_full_path):
            os.remove(self.spark_jobs_full_path)

    def set_spark_job_execution_start(self) -> None:
        self.execution_timestamp_start = datetime.utcnow().timestamp()
        self.__update_spark_jobs_cache(
            self.execution_timestamp_start,
            'before',
            overwrite=True,
        )

    def set_spark_job_execution_end(self) -> None:
        self.execution_timestamp_end = datetime.utcnow().timestamp()
        self.__update_spark_jobs_cache(
            self.execution_timestamp_end,
            'after',
        )

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

    def __get_stages(self) -> List[Stage]:
        api = API.build()

        if not api:
            return

        applications = api.applications_sync()

        stages = []
        if applications:
            stages = api.stages_sync(applications[0].id, dict(
                quantiles='0.01,0.25,0.5,0.75,0.99',
                withSummaries=True,
            ))

        return stages

    def __get_sqls(self) -> List[Sql]:
        api = API.build()

        if not api:
            return

        applications = api.applications_sync()

        sqls = []
        if applications:
            sqls = api.sqls_sync(applications[0].id, dict(
                length=9999,
            ))

        return sqls

    @property
    def spark_dir(self) -> str:
        if self.pipeline:
            return os.path.join(self.pipeline.pipeline_variables_dir, SPARK_DIR_NAME, self.uuid)

    @property
    def spark_jobs_full_path(self) -> str:
        if self.pipeline:
            return os.path.join(self.spark_dir, SPARK_JOBS_FILENAME)

    def __load_spark_jobs_cache(self) -> List[Job]:
        jobs = {}

        if not os.path.exists(self.spark_jobs_full_path):
            return jobs

        with open(self.spark_jobs_full_path) as f:
            content = f.read()
            if content:
                mapping = json.loads(content)
                if mapping:
                    for key, job_dict in mapping.items():
                        jobs[key] = Job.load(**job_dict)

        return jobs

    def __update_spark_jobs_cache(
        self,
        submission_timestamp: float,
        key: str,
        overwrite: bool = False,
    ) -> None:
        os.makedirs(self.spark_dir, exist_ok=True)

        data = {}
        if not overwrite:
            if os.path.exists(self.spark_jobs_full_path):
                with open(self.spark_jobs_full_path) as f:
                    content = f.read()
                    if content:
                        data.update(json.loads(content) or {})

        data.update({
            key: dict(
                submission_timestamp=submission_timestamp,
            ),
        })

        with open(self.spark_jobs_full_path, 'w') as f:
            f.write(json.dumps(data))

    def __load_spark_jobs_during_execution(self) -> None:
        jobs_cache = self.__load_spark_jobs_cache()
        if jobs_cache:
            self.execution_timestamp_start = (jobs_cache.get('before') or {}).get(
                'submission_timestamp',
            )
            self.execution_timestamp_end = (jobs_cache.get('after') or {}).get(
                'submission_timestamp',
            )
