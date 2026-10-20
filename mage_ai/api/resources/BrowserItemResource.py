from __future__ import annotations

import re
import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.result_set import ResultSet
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.files import get_absolute_paths_from_all_files
from mage_ai.system.browser.models import Item


class BrowserItemResource(GenericResource):
    @classmethod
    async def collection(cls, query, meta, user, **kwargs) -> ResultSet:
        paths = query.get('paths', [None])
        if paths:
            paths = paths[0]
            if paths:
                paths = [path.strip() for path in paths.split(',')]

        directory = query.get('directory', [None])
        if directory:
            directory = directory[0]
        if not directory:
            directory = base_repo_path()

        include_pattern = query.get('include_pattern', [None])
        if include_pattern:
            include_pattern = include_pattern[0]
        if include_pattern:
            include_pattern = urllib.parse.unquote(include_pattern)

        exclude_pattern = query.get('exclude_pattern', [None])
        if exclude_pattern:
            exclude_pattern = exclude_pattern[0]
        if exclude_pattern:
            exclude_pattern = urllib.parse.unquote(exclude_pattern)
        elif exclude_pattern is None:
            exclude_pattern = r'^\.|\/\.'

        def __parse_values(tup) -> Item:
            absolute_path, _size, _modified_timestamp = tup
            return Item.load(path=absolute_path)

        items = []

        for dir_path in [directory] + (paths or []):
            items += get_absolute_paths_from_all_files(
                starting_full_path_directory=dir_path,
                comparator=lambda path: (
                    not exclude_pattern or not re.search(exclude_pattern, path or '')
                )
                and (not include_pattern or re.search(include_pattern, path or '')),
                parse_values=__parse_values,
            )

        return cls.build_result_set(
            items,
            user,
            **kwargs,
        )

    @classmethod
    def get_model(cls, pk, **kwargs) -> Item:
        return Item.load(path=urllib.parse.unquote(pk))

    @classmethod
    async def member(cls, pk, user, **kwargs) -> BrowserItemResource:
        item = cls.get_model(pk)
        if not await item.exists():
            raise ApiError({
                **ApiError.RESOURCE_NOT_FOUND,
                **dict(message=f'Item at path {pk} not found.'),
            })

        await item.get_content()
        return cls(item, user, **kwargs)

    @classmethod
    async def create(cls, payload: Dict, user, **kwargs) -> BrowserItemResource:
        model = Item.load(**payload)
        await model.create()
        return cls(model, user, **kwargs)

    async def delete(self, **kwargs):
        await self.model.delete()

    async def update(self, payload, **kwargs):
        if 'path' not in payload:
            payload['path'] = self.model.path

        try:
            await self.model.synchronize(Item.load(**payload))
        except Exception as err:
            raise ApiError({
                **ApiError.RESOURCE_INVALID,
                **dict(message=str(err)),
            })
