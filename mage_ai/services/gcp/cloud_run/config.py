from dataclasses import dataclass

from mage_ai.shared.config import BaseConfig


@dataclass
class CloudRunConfig(BaseConfig):
    project_id: str
    path_to_credentials_json_file: str = None
    region: str = 'us-west2'
    timeout_seconds: int = 600
