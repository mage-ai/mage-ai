from .base import BaseHandler
from mage_ai.autocomplete.utils import (
    build_file_content_mapping,
    PATHS_TO_TRAVERSE,
    FILES_TO_READ,
)
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.hash import merge_dict


class ApiAutocompleteItemsHandler(BaseHandler):
    async def get(self):
        repo_path = get_repo_path()
        collection = []

        for file_group, mapping in [
            (
                'data_loaders',
                await build_file_content_mapping([f'{repo_path}/data_loaders'], []),
            ),
            (
                'data_exporters',
                await build_file_content_mapping([f'{repo_path}/data_exporters'], []),
            ),
            (
                'transformers',
                await build_file_content_mapping([f'{repo_path}/transformers'], []),
            ),
            (
                'mage_library',
                await build_file_content_mapping(
                    PATHS_TO_TRAVERSE,
                    FILES_TO_READ,
                ),
            ),
            (
                'user_library',
                {},
            ),
        ]:
            for filename, d in mapping.items():
                collection.append(merge_dict(d, dict(
                    group=file_group,
                    id=filename,
                )))

        self.write(dict(autocomplete_items=collection))
