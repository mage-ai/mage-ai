import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional

import yaml
from dateutil.relativedelta import relativedelta

from mage_ai.data_preparation.models.block.settings.global_data_products.models import (
    GlobalDataProductObjectType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.settings.platform.constants import project_platform_activated
from mage_ai.settings.platform.utils import full_paths_for_all_projects
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.dates import week_of_month
from mage_ai.shared.hash import extract, index_by
from mage_ai.shared.io import safe_write
from mage_ai.shared.path_fixer import add_absolute_path, get_path_parts
from mage_ai.shared.utils import clean_name


@dataclass
class GlobalDataProduct:
    uuid: str
    object_type: str = None
    object_uuid: str = None
    outdated_after: Dict = field(default_factory=dict)
    outdated_starting_at: Dict = field(default_factory=dict)
    repo_path: str = None
    settings: Dict = field(default_factory=dict)

    def __init__(self, uuid: str, **kwargs):
        self.object_type = kwargs.get('object_type')
        self.object_uuid = kwargs.get('object_uuid')
        self.outdated_after = kwargs.get('outdated_after')
        self.outdated_starting_at = kwargs.get('outdated_starting_at')
        self.repo_path = kwargs.get('repo_path')
        self.settings = kwargs.get('settings')
        self.uuid = clean_name(uuid) if uuid else uuid
        self._object = None

    @classmethod
    def file_path(cls, repo_path: str) -> str:
        return os.path.join(repo_path, 'global_data_products.yaml')

    @classmethod
    def load_all(cls, repo_path: Optional[str] = None) -> List['GlobalDataProduct']:
        paths = []
        if repo_path:
            paths.append(repo_path)
        elif project_platform_activated():
            paths += full_paths_for_all_projects()
        else:
            paths.append(get_repo_path())

        arr = []

        for file_path in paths:
            file_path_to_use = cls.file_path(file_path)
            if not os.path.exists(file_path_to_use):
                continue

            with open(file_path_to_use) as fp:
                content = fp.read()
                if content:
                    yaml_config = yaml.safe_load(content) or {}
                    for uuid, config_attributes in yaml_config.items():
                        arr.append(
                            cls(
                                uuid,
                                **config_attributes,
                            )
                        )

        return arr

    @classmethod
    def get(cls, uuid: str, repo_path: Optional[str] = None, project: Optional[str] = None):
        if project:
            repo_path = add_absolute_path(project)

        return find(lambda x: x.uuid == uuid, cls.load_all(repo_path))

    @property
    def pipeline(self) -> Pipeline:
        if GlobalDataProductObjectType.PIPELINE == self.object_type:
            if self._object:
                return self._object
            else:
                self._object = Pipeline.get(self.object_uuid, repo_path=self.repo_path)

        return self._object

    def get_blocks(self) -> List:
        arr = []

        if not self.settings or len(self.settings) == 0:
            return arr

        if GlobalDataProductObjectType.PIPELINE == self.object_type:
            for block_uuid in self.settings.keys():
                arr.append(self.pipeline.get_block(block_uuid))

        return arr

    def get_outputs(self, from_notebook: bool = False, global_vars: Dict = None, **kwargs) -> Dict:
        data = {}

        if not self.settings or len(self.settings) == 0:
            return data

        if GlobalDataProductObjectType.PIPELINE == self.object_type:
            pipeline_runs = self.pipeline_runs(status=PipelineRun.PipelineRunStatus.COMPLETED)

            for block_uuid, block_settings in self.settings.items():
                block = self.pipeline.get_block(block_uuid)

                partitions = 1
                if block_settings and 'partitions' in block_settings:
                    partitions = int(block_settings.get('partitions', 1))

                if partitions and partitions >= 1:
                    arr = pipeline_runs[:partitions]
                else:
                    arr = pipeline_runs

                data[block_uuid] = []
                for row in arr:
                    pipeline_run = PipelineRun(
                        execution_date=row.execution_date,
                        pipeline_schedule_id=row.pipeline_schedule_id,
                        variables=row.variables,
                    )

                    output_variables = block.output_variables(
                        execution_partition=pipeline_run.execution_partition,
                        global_vars=global_vars,
                        from_notebook=from_notebook,
                    )

                    for variable_name in output_variables:
                        result = self.pipeline.get_block_variable(
                            block_uuid=block.uuid,
                            variable_name=variable_name,
                            raise_exception=True,
                            partition=pipeline_run.execution_partition,
                            global_vars=global_vars,
                            from_notebook=from_notebook,
                        )
                        data[block_uuid].append(result)

        return data

    def get_outdated_at_delta(self, in_seconds: bool = False) -> relativedelta:
        outdated_after = self.outdated_after or {}
        delta = extract(
            outdated_after,
            [
                'months',
                'seconds',
                'weeks',
                'years',
            ],
        )

        if len(delta) >= 1:
            d = relativedelta(**delta)

            if in_seconds:
                now = datetime.utcnow().replace(tzinfo=timezone.utc)

                return ((now + d) - now).total_seconds()
            else:
                return d

        return None

    def is_outdated_after(self, now: datetime = None, return_values: bool = False) -> bool:
        values = {}
        outdated_starting_at = self.outdated_starting_at or {}
        if len(outdated_starting_at) == 0:
            if return_values:
                return values
            else:
                return True

        validations = []

        for key, extract_value_from_datetime in [
            ('day_of_month', lambda x: x.day),
            ('day_of_week', lambda x: (x.weekday() + 1) % 7),
            ('day_of_year', lambda x: x.timetuple().tm_yday),
            ('hour_of_day', lambda x: x.hour),
            ('minute_of_hour', lambda x: x.minute),
            ('month_of_year', lambda x: x.month),
            ('second_of_minute', lambda x: x.second),
            ('week_of_month', lambda x: week_of_month(x)),
            ('week_of_year', lambda x: x.isocalendar()[1]),
        ]:
            value = outdated_starting_at.get(key, None)
            if value is not None:
                value2 = extract_value_from_datetime(
                    now or datetime.utcnow().replace(tzinfo=timezone.utc),
                )
                values[key] = dict(
                    current=value2,
                    value=value,
                )
                validations.append(value2 >= value)

        if return_values:
            return values

        return all(validations)

    def next_run_at(self, pipeline_run: 'PipelineRun') -> datetime:
        execution_date = pipeline_run.execution_date
        outdated_at_delta = self.get_outdated_at_delta()

        if not outdated_at_delta:
            return None

        if execution_date and outdated_at_delta:
            execution_date += outdated_at_delta

        if not execution_date.tzinfo:
            execution_date = execution_date.replace(tzinfo=timezone.utc)

        return execution_date

    def is_outdated(self, pipeline_run: 'PipelineRun' = None) -> List[bool]:
        if not pipeline_run:
            return [True, True]

        now = datetime.utcnow().replace(tzinfo=timezone.utc)

        execution_date = self.next_run_at(pipeline_run)
        if not execution_date:
            return [False, False]

        outdated = execution_date and now >= execution_date

        return [
            outdated,
            self.is_outdated_after(now),
        ]

    def pipeline_runs(
        self,
        limit: int = None,
        status: PipelineRun.PipelineRunStatus = None,
    ) -> List[PipelineRun]:
        pipeline_runs = (
            PipelineRun.select(
                PipelineRun.backfill_id,
                PipelineRun.completed_at,
                PipelineRun.created_at,
                PipelineRun.event_variables,
                PipelineRun.execution_date,
                PipelineRun.executor_type,
                PipelineRun.id,
                PipelineRun.metrics,
                PipelineRun.passed_sla,
                PipelineRun.pipeline_schedule_id,
                PipelineRun.pipeline_uuid,
                PipelineRun.status,
                PipelineRun.updated_at,
                PipelineRun.variables,
                PipelineSchedule.global_data_product_uuid,
            )
            .join(
                PipelineSchedule,
                PipelineRun.pipeline_schedule_id == PipelineSchedule.id,
            )
            .filter(
                PipelineRun.pipeline_uuid == self.object_uuid,
                PipelineSchedule.global_data_product_uuid == self.uuid,
            )
        )

        if status:
            pipeline_runs = pipeline_runs.filter(
                PipelineRun.status == status,
            )

        pipeline_runs = pipeline_runs.order_by(PipelineRun.execution_date.desc())

        if limit is not None:
            pipeline_runs = pipeline_runs.limit(limit)

        return [
            PipelineRun(
                backfill_id=row.backfill_id,
                completed_at=row.completed_at,
                created_at=row.created_at,
                event_variables=row.event_variables,
                execution_date=row.execution_date,
                executor_type=row.executor_type,
                global_data_product_uuid=row.global_data_product_uuid,
                id=row.id,
                metrics=row.metrics,
                passed_sla=row.passed_sla,
                pipeline_schedule_id=row.pipeline_schedule_id,
                pipeline_uuid=row.pipeline_uuid,
                status=row.status,
                updated_at=row.updated_at,
                variables=row.variables,
            )
            for row in pipeline_runs.all()
        ]

    @property
    def project_name(self) -> Optional[str]:
        if self.repo_path:
            parts = get_path_parts(self.repo_path)
            if parts and len(parts) >= 3:
                return parts[1]

    def to_dict(self, include_uuid: bool = False) -> Dict:
        data = dict(
            object_type=self.object_type,
            object_uuid=self.object_uuid,
            outdated_after=self.outdated_after,
            outdated_starting_at=self.outdated_starting_at,
            project=self.project_name,
            repo_path=self.repo_path,
            settings=self.settings,
        )

        if include_uuid:
            data['uuid'] = self.uuid

        return data

    def delete(self) -> None:
        self.save(delete=True)

    def save(self, delete: bool = False) -> None:
        mapping = index_by(lambda x: x.uuid, self.load_all(self.repo_path))

        if delete:
            mapping.pop(self.uuid, None)
        else:
            mapping[self.uuid] = self

        mapping_new = {}

        items = sorted(list(mapping.items()), key=lambda tup: tup[0])
        for tup in items:
            uuid, gdp = tup
            mapping_new[uuid] = {}
            for k, v in gdp.to_dict().items():
                if v is not None:
                    mapping_new[uuid][k] = v

        content = yaml.safe_dump(mapping_new)
        safe_write(self.file_path(self.repo_path), content)

    def update(self, payload: Dict) -> None:
        for key in [
            'object_type',
            'object_uuid',
            'outdated_after',
            'outdated_starting_at',
            'repo_path',
            'settings',
        ]:
            value = payload.get(key)
            if getattr(self, key) != value:
                setattr(self, key, value)

        uuid = payload.get('uuid')
        if self.uuid != uuid:
            self.delete()
            self.uuid = uuid

        self.save()
