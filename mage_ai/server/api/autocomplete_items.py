from .base import BaseHandler
from mage_ai.autocomplete.utils import (
    build_file_content_mapping,
    PATHS_TO_TRAVERSE,
    FILES_TO_READ,
)
from mage_ai.shared.hash import merge_dict


class ApiAutocompleteItemsHandler(BaseHandler):
    def get(self):
        collection = []

        mapping = build_file_content_mapping(PATHS_TO_TRAVERSE, FILES_TO_READ)
        for filename, d in mapping.items():
            collection.append(merge_dict(d, dict(id=filename)))

        self.write(dict(autocomplete_items=collection))
