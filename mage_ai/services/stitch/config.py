from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class StitchConfig(BaseConfig):
    """
    How to obtain an API access token:
    https://www.stitchdata.com/docs/developers/stitch-connect/api#obtain-access-token
    """
    access_token: str
