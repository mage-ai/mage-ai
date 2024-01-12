import asyncio
from collections.abc import Iterable
from pathlib import Path
from typing import Dict, List, Union

from thefuzz import fuzz

from mage_ai.command_center.constants import ObjectType
from mage_ai.command_center.models import Application, Item
from mage_ai.data_preparation.models.project import Project
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.array import flatten
from mage_ai.shared.hash import ignore_keys, merge_dict

DEFAULT_RATIO = 65


class BaseFactory:
    def __init__(
        self,
        application: Dict = None,
        component: str = None,
        item: Dict = None,
        page: str = None,
        page_history: List[Dict] = None,
        picks: str = None,
        search: str = None,
        search_history: List[Dict] = None,
        search_ratio: int = DEFAULT_RATIO,
        user: User = None,
    ):
        self.application = Application.load(**application) if application else application
        self.component = component
        self.item = Item.load(**item) if item else item
        self.page = page
        self.page_history = page_history
        self.picks = picks
        self.search = search
        self.search_history = search_history
        self.search_ratio = search_ratio
        self.user = user

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
    def get_searchable_text(self, item_dict: Dict, **kwargs) -> str:
        arr = []
        for key in ['title', 'description', 'uuid', 'item_type', 'object_type']:
            if item_dict.get(key):
                value = item_dict.get(key)
                if value:
                    value = value.lower()
                    extension = Path(value).suffix
                    if extension:
                        arr.append(Path(value).stem)
                        arr.append(extension)
                    arr.append(value)

        text = ' '.join(arr)
        return ' '.join([
            text,
            text.replace('_', ' '),
        ])

    # Subclasses can override this
    def score_item(self, _item_dict: Dict, score: int = None) -> int:
        return score

    def filter_score(self, item_dict: Dict) -> Union[None, Dict]:
        score = 0
        if self.search:
            score = fuzz.partial_token_sort_ratio(
                self.search,
                self.get_searchable_text(item_dict),
            )
            if score < self.search_ratio:
                return None

        condition = item_dict.get('condition')
        if (not condition or condition(dict(project=self.project, user=self.user))):
            return merge_dict(item_dict, dict(score=self.score_item(item_dict, score=score)))

        return None

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
