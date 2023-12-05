from mage_ai.data_preparation.models.constants import (
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    BlockLanguage,
)
from mage_ai.presenters.interactions.constants import INTERACTIONS_DIRECTORY_NAME

PIPELINE_INTERACTIONS_FILENAME = '.'.join([
    INTERACTIONS_DIRECTORY_NAME,
    BLOCK_LANGUAGE_TO_FILE_EXTENSION[BlockLanguage.YAML],
])
