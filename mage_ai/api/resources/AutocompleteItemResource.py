from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.autocomplete.utils import (
    build_file_content_mapping,
    PATHS_TO_TRAVERSE,
    FILES_TO_READ,
)
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import safe_db_query
from mage_ai.shared.hash import merge_dict


class AutocompleteItemResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
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

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )
