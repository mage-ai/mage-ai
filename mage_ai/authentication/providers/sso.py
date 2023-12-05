from abc import ABC, abstractmethod
from typing import Awaitable, Dict


class SsoProvider(ABC):
    """
    Base class for single sign on providers. Can be used in conjunction with OauthProvider.
    """
    @abstractmethod
    async def get_user_info(self, **kwargs) -> Awaitable[Dict]:
        """
        This method should return a dictionary containing the user's information.

        Returns:
            Dict: dictionary with the following parameters
                email (str): user's email
                username (str): username
                user_roles (List[Role], optional): list of user roles for the user
        """
        pass
