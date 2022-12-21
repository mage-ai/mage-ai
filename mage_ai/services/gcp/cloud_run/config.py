from dataclasses import dataclass, field
from mage_ai.shared.config import BaseConfig
from typing import Dict, List
import boto3
import os
import requests

ECS_CONTAINER_METADATA_URI_VAR = 'ECS_CONTAINER_METADATA_URI_V4'


@dataclass
class CloudRunConfig(BaseConfig):
    project_id: str
    path_to_credentials_json_file: str
    region: str = 'us-west2',
