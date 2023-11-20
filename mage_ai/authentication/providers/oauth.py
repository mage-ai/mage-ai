from abc import ABC, abstractmethod
from typing import Awaitable, Dict


class OauthProvider(ABC):
    """
    Base class for oauth authentication. This provider will be used for oauth authentication flows.
    The current oauth for Mage is as follows:

    1. Mage client will make a request to the server to get the auth url to get the authorization
       code for the provider. (get_auth_url_response)
    2. Mage client redirects to the auth url and the user will sign in to the provider and grant
       Mage access to the user's profile.
    3. The provider will redirect back to the Mage oauth route (/oauth) with the authorization code.
    4. Mage client will make another request to the server with the authorization code to get the
       access token. The server will make a request to the provider with the authorization code
       and return the access token. (get_access_token_response)
    5. Mage client will redirect to the redirect uri with the access token and provider in the
       query params.
    """

    @abstractmethod
    def get_auth_url_response(self, **kwargs) -> Dict:
        """
        This method should construct the auth url to start the oauth flow.

        Kwargs:
            redirect_uri (str): the redirect uri to be used after the oauth provider returns

        Returns:
            Dict: a dict with the following keys:
                url: auth url to redirect to start oauth flow
                redirect_query_params (optional): query params to be added to the redirect url
                    after the oauth provider returns the authorization code. This is used when
                    the provider expects an exact redirect_uri match and query params cannot
                    be included in the url.
        """
        pass

    @abstractmethod
    async def get_access_token_response(self, code: str, **kwargs) -> Awaitable[Dict]:
        """
        This method should call the oauth provider with the authorization code and return
        a dictionary containing an access token for the user.

        Args:
            code (str): the authorization code returned by the oauth provider

        Kwargs:
            redirect_uri (str): the redirect uri to be used after the access token is fetched

        Returns:
            Dict: a dict with the following keys:
                url: auth url to redirect to start oauth flow
                redirect_query_params (optional): query params to be added to the redirect url
                    after the oauth provider returns the authorization code. This is used when
                    the provider expects an exact redirect_uri match and query params cannot
                    be included in the url.
        """
        pass
