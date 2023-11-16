import json
import os
from datetime import datetime
from typing import Dict, List

import dateutil.parser

from mage_ai.data_preparation.models.block.spark.constants import (
    SPARK_DIR_NAME,
    SPARK_JOBS_FILENAME,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.services.spark.api.service import API
from mage_ai.services.spark.constants import ComputeServiceUUID
from mage_ai.services.spark.models.applications import Application
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.models.sqls import Sql
from mage_ai.services.spark.models.stages import Stage
from mage_ai.services.spark.utils import get_compute_service
from mage_ai.shared.array import find


class SparkBlock:
    @property
    def spark_session(self):
        if self._spark_session_current:
            return self._spark_session_current

        self._spark_session_current = self.get_spark_session()

        return self._spark_session_current

    @property
    def compute_service_uuid(self) -> ComputeServiceUUID:
        if self._compute_service_uuid:
            return self._compute_service_uuid
        self._compute_service_uuid = get_compute_service(
            ignore_active_kernel=True,
            repo_config=self.repo_config,
        )
        return self._compute_service_uuid

    def spark_session_application(self) -> Application:
        if not self.spark_session:
            return

        spark_confs = self.spark_session.sparkContext.getConf().getAll()
        value_tup = find(lambda tup: tup[0] == 'spark.app.id', spark_confs)

        if value_tup:
            application_id = value_tup[1]

            return Application.load(
                id=application_id,
                spark_ui_url=self.spark_session.sparkContext.uiWebUrl,
            )

    def compute_management_enabled(self) -> bool:
        return Project(self.pipeline.repo_config if self.pipeline else None).is_feature_enabled(
            FeatureUUID.COMPUTE_MANAGEMENT,
        )

    def is_using_spark(self) -> bool:
        return self.compute_service_uuid in [
            ComputeServiceUUID.AWS_EMR,
            ComputeServiceUUID.STANDALONE_CLUSTER,
        ]

    def should_track_spark(self) -> bool:
        return self.is_using_spark() and self.compute_management_enabled()

    def execution_states(self, cache: bool = False) -> Dict:
        jobs_cache = self.__load_cache()

        if 'execution_states' in jobs_cache:
            return jobs_cache.get('execution_states')

        execution_states = {}
        jobs = self.jobs_during_execution()
        if jobs:
            sqls = self.sqls_during_execution(jobs=jobs)
            stages = self.stages_during_execution(jobs=jobs)

            execution_states = dict(
                jobs=[m.to_dict() for m in jobs],
                sqls=[m.to_dict() for m in sqls],
                stages=[m.to_dict() for m in stages],
            )

            if cache:
                self.__update_spark_jobs_cache(
                    execution_states,
                    'execution_states',
                )

        return execution_states

    def jobs_during_execution(self) -> List[Job]:
        self.__load_spark_job_submission_timestamps()

        if not self.execution_timestamp_start and self.execution_uuid_start:
            return []

        def _filter(
            job: Job,
            block_uuid=self.uuid,
            compute_service_uuid=self.compute_service_uuid,
            execution_timestamp_end: float = self.execution_timestamp_end,
            execution_timestamp_start: float = self.execution_timestamp_start,
            execution_uuid_start=self.execution_uuid_start,
        ) -> bool:
            if ComputeServiceUUID.AWS_EMR == compute_service_uuid:
                key = self.execution_uuid_start or self.execution_timestamp_start
                return job.name == f'{block_uuid}:{key}'

            if not job.submission_time:
                return False

            if isinstance(job.submission_time, str):
                submission_timestamp = dateutil.parser.parse(job.submission_time).timestamp()
            elif isinstance(job.submission_time, float) or isinstance(job.submission_time, int):
                submission_timestamp = datetime.fromtimestamp(job.submission_time)

            return execution_timestamp_start and \
                execution_timestamp_end and \
                submission_timestamp >= execution_timestamp_start and \
                (
                    not execution_timestamp_end or
                    submission_timestamp <= execution_timestamp_end
                )

        jobs = self.__get_jobs(application=self.execution_start_application)

        return list(filter(_filter, jobs or []))

    def stages_during_execution(self, jobs: List[Job]):
        if not jobs:
            self.__load_spark_jobs_during_execution()

        def _filter(
            stage: Stage,
            jobs=jobs,
        ) -> bool:
            return any([job.stage_ids and stage.id in job.stage_ids for job in jobs])

        stages = self.__get_stages(application=self.execution_start_application)

        return list(filter(_filter, stages or []))

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

        sqls = self.__get_sqls(application=self.execution_start_application)

        return list(filter(_filter, sqls or []))

    def clear_spark_jobs_cache(self) -> None:
        if os.path.exists(self.spark_jobs_full_path):
            os.remove(self.spark_jobs_full_path)

    def cache_spark_application(self) -> None:
        api = API.build(all_applications=False, spark_session=self.spark_session)
        if not api:
            return

        applications = api.applications_sync()
        for application in applications:
            Application.cache_application(application)

    def set_spark_job_execution_start(self, execution_uuid: str = None) -> None:
        self.execution_timestamp_start = datetime.utcnow().timestamp()
        application = self.spark_session_application()

        if execution_uuid:
            self.execution_uuid = execution_uuid

        if self.spark_session and self.spark_session.sparkContext:
            key = f'{self.uuid}:{self.execution_uuid or self.execution_timestamp_start}'
            # For jobs
            self.spark_session.sparkContext.setLocalProperty('callSite.short', key)
            # For stages
            self.spark_session.sparkContext.setLocalProperty('callSite.long', key)

        self.__update_spark_jobs_cache(
            dict(
                application=application.to_dict() if application else None,
                execution_uuid=self.execution_uuid,
                submission_timestamp=self.execution_timestamp_start,
            ),
            'before',
            overwrite=True,
        )

    def set_spark_job_execution_end(self) -> None:
        # Need a slight buffer of 10 seconds because stages are still being submitted even after
        # the end of the block function execution.
        self.execution_timestamp_end = datetime.utcnow().timestamp() + 10
        application = self.spark_session_application()

        self.__update_spark_jobs_cache(
            dict(
                application=application.to_dict() if application else None,
                submission_timestamp=self.execution_timestamp_end,
            ),
            'after',
        )

    def __build_api(self, application: Application = None) -> API:
        build_options = {}

        if application:
            build_options.update(dict(
                application_id=application.calculated_id(),
                application_spark_ui_url=application.spark_ui_url,
            ))
        else:
            build_options.update(dict(all_applications=True))

        return API.build(**build_options)

    def __get_jobs(self, application: Application = None) -> List[Job]:
        api = self.__build_api(application=application)

        if not api:
            return

        jobs = []
        if application:
            jobs = api.jobs_sync()
        else:
            applications = api.applications_sync()
            if applications:
                jobs = api.jobs_sync(applications[0].calculated_id())

        return sorted(
            jobs,
            key=lambda job: job.id,
            reverse=True,
        )

    def __get_stages(self, application: Application = None) -> List[Stage]:
        api = self.__build_api(application=application)

        if not api:
            return

        stages = []
        if application:
            stages = api.stages_sync(dict(
                quantiles='0.01,0.25,0.5,0.75,0.99',
                withSummaries=True,
            ))
        else:
            applications = api.applications_sync()

            if applications:
                stages = api.stages_sync(applications[0].calculated_id(), dict(
                    quantiles='0.01,0.25,0.5,0.75,0.99',
                    withSummaries=True,
                ))

        return stages

    def __get_sqls(self, application: Application = None) -> List[Sql]:
        api = self.__build_api(application=application)

        if not api:
            return

        if application:
            sqls = api.sqls_sync(dict(
                length=9999,
            ))
        else:
            applications = api.applications_sync()

            sqls = []
            if applications:
                sqls = api.sqls_sync(applications[0].calculated_id(), dict(
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

    def __load_cache(self) -> List[Job]:
        jobs = {}

        if not os.path.exists(self.spark_jobs_full_path):
            return jobs

        with open(self.spark_jobs_full_path) as f:
            content = f.read()
            if content:
                return json.loads(content)

    def __update_spark_jobs_cache(
        self,
        data_to_cache: Dict,
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
            key: data_to_cache,
        })

        with open(self.spark_jobs_full_path, 'w') as f:
            f.write(json.dumps(data))

    def __load_spark_job_submission_timestamps(self) -> None:
        self.execution_end_application = None
        self.execution_start_application = None
        self.execution_timestamp_end = None
        self.execution_timestamp_start = None
        self.execution_uuid_end = None
        self.execution_uuid_start = None

        jobs_cache = self.__load_cache()
        if jobs_cache:
            before = jobs_cache.get('before')
            if before:
                self.execution_timestamp_start = (before or {}).get(
                    'submission_timestamp',
                )
                self.execution_uuid_start = (before or {}).get(
                    'execution_uuid',
                )
                self.execution_start_application = (before or {}).get(
                    'application',
                )
                if self.execution_start_application:
                    self.execution_start_application = Application.load(
                        **self.execution_start_application,
                    )

            after = jobs_cache.get('after')
            if after:
                self.execution_timestamp_end = (after or {}).get(
                    'submission_timestamp',
                )
                self.execution_uuid_end = (after or {}).get(
                    'execution_uuid',
                )
                self.execution_end_application = (after or {}).get(
                    'application',
                )
                if self.execution_end_application:
                    self.execution_end_application = Application.load(
                        **self.execution_end_application,
                    )
