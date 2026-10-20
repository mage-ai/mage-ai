import asyncio
from collections.abc import Iterable
from pathlib import Path
from typing import Dict, List, Union

from thefuzz import fuzz

from mage_ai.command_center.constants import ModeType, ObjectType
from mage_ai.command_center.models import Application, Item, Mode, PageMetadata
from mage_ai.data_preparation.models.project import Project
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.array import flatten
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import ignore_keys, merge_dict

DEFAULT_RATIO = 53


class BaseFactory:
    def __init__(
        self,
        application: Dict = None,
        applications: List[Dict] = None,
        component: str = None,
        item: Dict = None,
        mode: Dict = None,
        page: str = None,
        page_history: List[Dict] = None,
        picks: str = None,
        results: Dict = None,
        search: str = None,
        search_history: List[Dict] = None,
        search_ratio: int = DEFAULT_RATIO,
        user: User = None,
    ):
        self.application = Application.load(**application) if application else application
        self.applications = applications
        self.component = component
        self.item = Item.load(**item) if item else item
        self.mode = Mode.load(**mode) if mode else mode
        self.page = PageMetadata.load(**page) if page else page
        self.page_history = page_history
        self.picks = picks
        self.results = results
        self.search = search
        self.search_history = search_history
        self.search_ratio = search_ratio
        self.user = user

    def build_another_factory(self, factory_class=None) -> 'BaseFactory':
        factory = factory_class() if factory_class else BaseFactory()
        for key in [
            'application',
            'applications',
            'component',
            'item',
            'mode',
            'page',
            'page_history',
            'picks',
            'results',
            'search',
            'search_history',
            'search_ratio',
            'user',
        ]:
            setattr(factory, key, getattr(self, key))
        return factory

    @classmethod
    async def create_items(
        self,
        factory_or_items: List[Union['BaseFactory', List[Dict]]],
        **kwargs,
    ) -> List[Item]:
        async def process_factory_items(
            class_or_items: Union['BaseFactory', List[Dict]],
            cls=self,
            kwargs=kwargs,
        ) -> List[Item]:
            is_iterable = isinstance(class_or_items, Iterable)
            factory_class = class_or_items if not is_iterable and issubclass(
                class_or_items,
                cls,
            ) else cls
            items_dicts = class_or_items if is_iterable else None

            return await factory_class(**kwargs).process(items_dicts)

        mode = Mode.load(**kwargs.get('mode')) if kwargs.get('mode') else None
        if mode and ModeType.VERSION_CONTROL == mode.type:
            from mage_ai.command_center.version_control.factory import (
                VersionControlFactory,
            )
            factory_or_items = [VersionControlFactory]
        else:
            application = kwargs.get('application')
            item = kwargs.get('item')
            if application and item:
                object_type = item.get('object_type')
                if ObjectType.PIPELINE == object_type:
                    from mage_ai.command_center.pipelines.factory import PipelineFactory
                    factory_or_items = [PipelineFactory]
                elif ObjectType.TRIGGER == object_type:
                    from mage_ai.command_center.triggers.factory import TriggerFactory
                    factory_or_items = [TriggerFactory]

        return flatten(await asyncio.gather(
            *[process_factory_items(class_or_items) for class_or_items in factory_or_items]
        ))

    @property
    def project(self) -> Project:
        return Project(root_project=True)

    # Subclasses MUST override this
    async def fetch_items(self, **kwargs) -> List[Dict]:
        raise Exception

    # Subclasses can override this
    def get_item_uuid(self, item_dict: Dict, **kwargs) -> str:
        return item_dict.get('uuid') or ''

    # Subclasses can override this
    def get_searchable_text(self, item_dict: Dict, **kwargs) -> List[str]:
        arr = []
        for key in [
            'description',
            'item_type',
            'object_type',
            'subtitle',
            'title',
            'uuid',
        ]:
            value = item_dict.get(key) if item_dict else None
            if not value:
                continue

            value = value.lower().strip()
            extension = Path(value).suffix
            if extension:
                arr.append(Path(value).stem)
                arr.append(extension)
            arr.append(value)

        return arr

    # Subclasses can override this
    def score_item(self, _item_dict: Dict, score: int = None) -> int:
        return score

    def filter_score(self, item_dict: Dict) -> Union[None, Dict]:
        if not item_dict:
            return None

        score = 0
        if self.search:
            text = list(set(self.get_searchable_text(item_dict)))
            if not text:
                return None

            arr = [fuzz.ratio(self.search, t) for t in text]
            if not arr:
                return None

            score = max(arr)
            if score < self.search_ratio:
                if score >= self.search_ratio / 2:
                    if is_debug():
                        uuid = item_dict.get('uuid') or 'UUID-MISSING'
                        token_scores = '\n'.join(
                            [f'\t{score}: {token}' for score, token in sorted(
                                zip(arr, text),
                                key=lambda tup: tup[0],
                                reverse=True,
                            ) if score > 0][:2]
                        )

                        print(
                            f'[CommandCenter.filter_score]: {self.search} ({uuid})\n'
                            f'{token_scores}'
                        )

                return None

        condition = item_dict.get('condition')
        if (not condition or condition(dict(project=self.project, user=self.user))):
            return merge_dict(item_dict, dict(score=self.score_item(item_dict, score=score)))

        return None

    def filter_score_mutate_accumulator(self, item_dict: Dict, accumulator: List[Dict]):
        scored = self.filter_score(item_dict)
        if scored:
            accumulator.append(scored)

    async def process(self, items_dicts: List[Dict] = None) -> List[Item]:
        items_dicts_scored = []
        if items_dicts:
            for item_dict in items_dicts:
                item_scored = self.filter_score(item_dict)
                if item_scored:
                    items_dicts_scored.append(item_scored)
        else:
            items_dicts_scored = await self.fetch_items()

        return await self.__post_process_items(self.__build_items(items_dicts_scored))

    async def rank_items(self, items_or_dicts: List[Union[Dict, Item]]) -> List[Union[Dict, Item]]:
        return [item for item in sorted(
            items_or_dicts,
            key=lambda i: (i.score if isinstance(
                i,
                Item,
            ) else i.get('score') if i else -100) or - 100,
            reverse=True,
        )]

    def __build_items(self, items_dicts_scored: List[Dict]) -> List[Item]:
        return [Item.load(**merge_dict(ignore_keys(item_dict, [
            'condition',
        ]), dict(
            title=item_dict.get('title') or item_dict.get('uuid'),
            uuid=item_dict.get('uuid') or item_dict.get('title'),
        ))) for item_dict in items_dicts_scored if item_dict]

    async def __post_process_items(self, items: List[Item]) -> List[Item]:
        return await self.rank_items(items)
