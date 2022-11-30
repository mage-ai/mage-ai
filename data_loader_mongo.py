from mage_ai.io.mongodb import MongoDB
from mage_ai.io.config import ConfigFileLoader
from os import path

config_path = path.join('/home/src/mage_ai/server/default_repo', 'io_config.yaml')
config_profile = 'default'
config_file_loader = ConfigFileLoader(config_path, config_profile)

# MongoDB.with_config(config_file_loader)

with MongoDB.with_config(config_file_loader) as loader:
    loader