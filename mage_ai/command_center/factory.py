import asyncio
from abc import ABC
from collections.abc import Iterable
from functools import reduce
from typing import Dict, List, Tuple, Union

from thefuzz import fuzz

from mage_ai.command_center.models import Item
from mage_ai.data_preparation.models.project import Project
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.array import flatten
from mage_ai.shared.hash import ignore_keys, index_by, merge_dict

DEFAULT_RATIO = 80


class BaseFactory(ABC):
    def __init__(
        self,
        component: str = None,
        page: str = None,
        page_history: List[Dict] = None,
        search: str = None,
        search_history: List[Dict] = None,
        search_ratio: int = DEFAULT_RATIO,
        user: User = None,
        uuids: List[str] = None,
    ):
        self.component = component
        self.page = page
        self.page_history = page_history
        self.search = search
        self.search_history = search_history
        self.search_ratio = search_ratio
        self.user = user
        self.uuids = uuids

        self.__uuids_mapping = index_by(lambda x: x, self.uuids or [])

    @classmethod
    async def create_items(
        self,
        factory_or_items: List[Union['BaseFactory', List[Dict]]],
        **kwargs,
    ) -> List[Item]:
        async def process(
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

        return flatten(await asyncio.gather(
            *[process(class_or_items) for class_or_items in factory_or_items]
        ))

    @property
    def project(self) -> Project:
        return Project(root_project=True)

    # Subclasses MUST override this
    async def fetch_items(self, **kwargs) -> List[Tuple[int, Dict]]:
        raise Exception

    # Subclasses can override this
    def get_item_uuid(self, item_dict: Dict, **kwargs) -> str:
        return item_dict.get('uuid') or ''

    # Subclasses can override this
    def get_searchable_text(self, item_dict: Dict, **kwargs) -> str:
        arr = []
        for key in ['title', 'description', 'uuid', 'item_type', 'object_type']:
            if item_dict.get(key):
                arr.append(item_dict.get(key))

        return ' '.join(arr)

    # Subclasses can override this
    def add_score(self, item_dict: Dict, score: int = None) -> int:
        if item_dict:
            return score

    def filter_score(self, item_dict: Dict) -> Union[None, Tuple[int, Dict]]:
        condition = item_dict.get('condition')

        if (not condition or condition(dict(project=self.project, user=self.user))) and \
                (not self.__uuids_mapping or self.get_item_uuid(
                    item_dict,
                ) in self.__uuids_mapping):

            score = 0
            if self.search:
                score = fuzz.partial_token_sort_ratio(
                    self.search,
                    self.get_searchable_text(item_dict),
                )
                if score < self.search_ratio:
                    return None

            return (self.add_score(item_dict, score=score), item_dict)

        return None

    async def process(self, items_dicts: List[Dict] = None) -> List[Item]:
        items_dicts_scored = []
        if items_dicts:
            def __select(acc: List[Dict], item_dict: Dict, factory=self) -> Dict:
                pair = factory.filter_score(item_dict)
                if pair is not None:
                    acc.append(pair)
                return acc

            items_dicts_scored = reduce(__select, items_dicts, [])
        else:
            items_dicts_scored = await self.fetch_items()

        return self.__post_process_items(self.__build_items(items_dicts_scored))

    def __build_items(self, items_dicts_scores: List[Tuple[int, Dict]]) -> List[Item]:
        arr = []
        for pair in items_dicts_scores:
            if pair is None:
                continue

            score, item_dict = pair

            arr.append((
                score,
                Item.load(**merge_dict(ignore_keys(item_dict, [
                    'condition',
                ]), dict(
                    title=item_dict.get('title') or item_dict.get('uuid'),
                    uuid=item_dict.get('uuid') or item_dict.get('title'),
                )))
            ))

        return arr

    def __post_process_items(self, items_scores: List[Tuple[int, Item]]) -> List[Item]:
        return [pair[1] for pair in sorted(
            items_scores,
            key=lambda pair: pair[0],
            reverse=True,
        )]
