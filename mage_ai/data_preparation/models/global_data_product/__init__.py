import os
import yaml
from dataclasses import dataclass, field
from datetime import datetime
from dateutil.relativedelta import relativedelta
from mage_ai.data_preparation.models.global_data_product.constants import (
    GlobalDataProductObjectType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import extract, index_by
from mage_ai.shared.io import safe_write
from mage_ai.shared.utils import clean_name
from typing import Dict, List


@dataclass
class GlobalDataProduct:
    uuid: str
    object_type: str = None
    object_uuid: str = None
    outdated_after: Dict = field(default_factory=dict)
    outdated_starting_at: Dict = field(default_factory=dict)
    settings: Dict = field(default_factory=dict)

    def __init__(self, uuid: str, **kwargs):
        self.object_type = kwargs.get('object_type')
        self.object_uuid = kwargs.get('object_uuid')
        self.outdated_after = kwargs.get('outdated_after')
        self.outdated_starting_at = kwargs.get('outdated_starting_at')
        self.settings = kwargs.get('settings')
        self.uuid = clean_name(uuid) if uuid else uuid
        self._object = None

    @classmethod
    def file_path(self) -> str:
        return os.path.join(get_repo_path(), 'global_data_products.yaml')

    @classmethod
    def load_all(self) -> List['GlobalDataProduct']:
        arr = []

        if not os.path.exists(self.file_path()):
            return []

        with open(self.file_path()) as fp:
            content = fp.read()
            if content:
                yaml_config = yaml.safe_load(content) or {}
                for uuid, config_attributes in yaml_config.items():
                    arr.append(self(
                        uuid,
                        **config_attributes,
                    ))

        return arr

    @classmethod
    def get(self, uuid: str):
        return find(lambda x: x.uuid == uuid, self.load_all())

    @property
    def pipeline(self) -> Pipeline:
        if GlobalDataProductObjectType.PIPELINE == self.object_type:
            if self._object:
                return self._object
            else:
                self._object = Pipeline.get(self.object_uuid)

        return self._object

    def get_outdated_at_delta(self, in_seconds: bool = False) -> relativedelta:
        outdated_after = self.outdated_after or {}
        delta = extract(outdated_after, [
            'months',
            'seconds',
            'weeks',
            'years',
        ])

        if len(delta) >= 1:
            d = relativedelta(**delta)

            if in_seconds:
                now = datetime.utcnow()

                return ((now + d) - now).timestamp()
            else:
                return d

    def is_outdated_after(self, now: datetime = None) ->  bool:
        outdated_starting_at = self.outdated_starting_at or {}
        if len(outdated_starting_at) == 0:
            return True

        validations = []

        for key, extract_value_from_datetime in [
            ('day_of_month', lambda x: x.day),
            ('day_of_week', lambda x: (x.weekday + 1) % 7),
            ('day_of_year', lambda x: x.timetuple().tm_yday),
            ('hour_of_day', lambda x: x.hour),
            ('minute_of_hour', lambda x: x.minute),
            ('month_of_year', lambda x: x.month),
            ('second_of_minute', lambda x: x.second),
            ('week_of_month', lambda x: week_of_month(x)),
            ('week_of_year', lambda x: x.isocalendar().week),
        ]:
            value = outdated_starting_at.get(key, None)
            if value is not None:
                validations.append(value >= extract_value_from_datetime(
                    now or datetime.utcnow(),
                ))

        return all(validations)

    def is_outdated(self, pipeline_run: 'PipelineRun' = None) -> bool:
        if not pipeline_run:
            return True

        now = datetime.utcnow()

        execution_date = pipeline_run.execution_date
        outdated_at_delta = self.get_outdated_at_delta()
        if execution_date and outdated_at_delta:
            execution_date += outdated_at_delta

        outdated = execution_date and now >= execution_date
        if not outdated:
            return False

        return self.is_outdated_after(now)

    def to_dict(self, include_uuid: bool = False) -> Dict:
        data = dict(
            object_type=self.object_type,
            object_uuid=self.object_uuid,
            outdated_after=self.outdated_after,
            outdated_starting_at=self.outdated_starting_at,
            settings=self.settings,
        )

        if include_uuid:
            data['uuid'] = self.uuid

        return data

    def delete(self) -> None:
        self.save(delete=True)

    def save(self, delete: bool = False) -> None:
        mapping = index_by(lambda x: x.uuid, self.load_all())

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
        safe_write(self.file_path(), content)

    def update(self, payload: Dict) -> None:
        for key in [
            'object_type',
            'object_uuid',
            'outdated_after',
            'outdated_starting_at',
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
