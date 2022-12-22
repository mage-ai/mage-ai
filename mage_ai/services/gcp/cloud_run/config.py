from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class CloudRunConfig(BaseConfig):
    project_id: str
    path_to_credentials_json_file: str
    region: str = 'us-west2'
