import os
import re
import urllib.parse
from pathlib import Path
from typing import Dict

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.result_set import ResultSet
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.files import get_absolute_paths_from_all_files
from mage_ai.shared.path_fixer import remove_base_repo_directory_name


class BrowserItemResource(GenericResource):
    @classmethod
    async def collection(cls, query, meta, user, **kwargs) -> ResultSet:
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

        def __parse_values(tup) -> Dict:
            absolute_path, size, modified_timestamp = tup
            return dict(
                extension=Path(absolute_path).suffix.lstrip('.'),
                modified_timestamp=modified_timestamp,
                name=os.path.basename(absolute_path),
                path=absolute_path,
                relative_path=remove_base_repo_directory_name(absolute_path),
                size=size,
            )

        return cls.build_result_set(
            get_absolute_paths_from_all_files(
                starting_full_path_directory=directory,
                comparator=lambda path: (
                    not exclude_pattern or not re.search(exclude_pattern, path or '')
                )
                and (not include_pattern or re.search(include_pattern, path or '')),
                parse_values=__parse_values,
            ),
            user,
            **kwargs,
        )
