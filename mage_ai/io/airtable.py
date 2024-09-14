import logging

from pandas import DataFrame
from pyairtable.api import Base

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey

LOGGER = logging.getLogger(__name__)


class Airtable(BaseIO):
    """
    Handles data transfer between an Airtable tables and the Mage app.
    """

    def __init__(
            self,
            base_id: str,
            token: str,
            verbose: bool = True,
            **kwargs,) -> None:
        """
        Initializes connection to Airtable.
        """
        super().__init__(verbose=verbose)
        self.client = Base(token, base_id)

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Airtable':
        return cls(
            base_id=config[ConfigKey.AIRTABLE_BASE_ID],
            token=config[ConfigKey.AIRTABLE_ACCESS_TOKEN]
        )

    def load(self, *args, **kwargs) -> DataFrame:
        pass

    def export(self, df: DataFrame, *args, **kwargs) -> None:
        pass
