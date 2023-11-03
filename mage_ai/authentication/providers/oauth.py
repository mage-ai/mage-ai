from abc import ABC, abstractmethod
from typing import Dict


class OauthProvider(ABC):
    @abstractmethod
    async def get_auth_url(self, **kwargs) -> str:
        pass

    @abstractmethod
    async def get_access_token_response(self, code: str, **kwargs) -> Dict:
        pass
