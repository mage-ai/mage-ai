from mage_ai.services.airbyte.client import AirbyteClient
from mage_ai.services.airbyte.config import AirbyteConfig
import logging


class AirbyteServer():
    def __init__(self, config: AirbyteConfig):
        self.config = config

    @property
    def protocol(self) -> str:
        return 'https' if self.config.use_ssl else 'http'

    @property
    def base_url(self) -> str:
        base_path = f'{self.config.host}:{self.config.port}'

        return f'{self.protocol}://{base_path}/api/{self.config.api_version}'

    def get_client(self, logger: logging.Logger, timeout: int = 12) -> AirbyteClient:
        return AirbyteClient(
            base_url=self.base_url,
            logger=logger,
            password=self.config.password,
            timeout=timeout,
            username=self.config.username,
        )
