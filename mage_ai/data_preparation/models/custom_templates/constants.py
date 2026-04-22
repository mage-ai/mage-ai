import os

CUSTOM_TEMPLATES_DIRECTORY = 'custom_templates'
CUSTOM_TEMPLATES_DIRECTORY_ENVIRONMENT_VARIABLE = 'CUSTOM_TEMPLATES_DIRECTORY'

DIRECTORY_FOR_BLOCK_TEMPLATES = 'blocks'
DIRECTORY_FOR_PIPELINE_TEMPLATES = 'pipelines'

METADATA_FILENAME_WITH_EXTENSION = 'metadata.yaml'

# Absolute path to the mage_ai package root — used as the base for core templates,
# analogous to repo_path for project templates.
# Core templates live at {CORE_CUSTOM_TEMPLATES_PATH}/custom_templates/
# __file__ = mage_ai/data_preparation/models/custom_templates/constants.py
# 4x dirname => mage_ai/
CORE_CUSTOM_TEMPLATES_PATH = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
)
